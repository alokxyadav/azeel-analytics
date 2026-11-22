import logging
import math
import os
import re
import threading
import zipfile
from collections import OrderedDict

import numpy as np
import pandas as pd

from app.core.config import settings

log = logging.getLogger("azeel.data")


class DataError(Exception):
    """A problem with the uploaded data that is safe to show to the user."""


# ---------------------------------------------------------------- loading

def validate_container(path: str, file_type: str) -> None:
    """Cheap checks on raw bytes before any parser touches the file."""
    with open(path, "rb") as fh:
        head = fh.read(8192)
    if not head:
        raise DataError("The file is empty.")
    if file_type == "xlsx":
        if not zipfile.is_zipfile(path):
            raise DataError("This is not a valid .xlsx file.")
        with zipfile.ZipFile(path) as zf:
            # Guards against "zip bombs": tiny files that expand to gigabytes in memory.
            total = sum(i.file_size for i in zf.infolist())
            if total > settings.MAX_UNZIPPED_MB * 1024 * 1024:
                raise DataError("This spreadsheet expands to more data than we can process.")
            if "xl/workbook.xml" not in zf.namelist():
                raise DataError("This is not a valid .xlsx workbook.")
    elif b"\x00" in head:
        raise DataError("This does not look like a text CSV file.")


def _sniff_delimiter(sample: str) -> str:
    """Pick the delimiter from the header line. Comma wins unless another is clearly more frequent.

    Guessing from data rows is unreliable (a single cell containing '|' can fool csv.Sniffer).
    """
    header = next((ln for ln in sample.splitlines() if ln.strip()), "")
    counts = {d: header.count(d) for d in (",", ";", "\t", "|")}
    best = max(counts, key=lambda d: (counts[d], d == ","))
    return best if counts[best] > 0 else ","


def _read_csv(path: str) -> pd.DataFrame:
    limit = settings.MAX_ROWS + 1
    last_error: Exception | None = None
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            with open(path, encoding=encoding, errors="strict") as fh:
                sep = _sniff_delimiter(fh.read(65536))
            return pd.read_csv(path, sep=sep, encoding=encoding, low_memory=False, nrows=limit)
        except UnicodeDecodeError as exc:
            last_error = exc
    raise DataError("We could not read this file's text encoding.") from last_error


def read_dataframe(path: str, file_type: str) -> pd.DataFrame:
    """Parse a file into a DataFrame, enforcing size limits. Raises DataError for user-facing problems."""
    try:
        validate_container(path, file_type)
        if file_type == "csv":
            df = _read_csv(path)
        elif file_type == "xlsx":
            df = pd.read_excel(path, engine="openpyxl", nrows=settings.MAX_ROWS + 1)
        else:
            raise DataError("Unsupported file type.")
    except DataError:
        raise
    except pd.errors.EmptyDataError as exc:
        raise DataError("The file has no data.") from exc
    except Exception as exc:
        log.warning("Could not parse %s: %s", os.path.basename(path), exc)
        raise DataError("We could not read this file as a table. Check that it is a valid CSV or XLSX.") from exc

    df.columns = [str(c).strip() for c in df.columns]
    # Drop only blank spacer columns; an unnamed column that holds data is kept.
    blank = [c for c in df.columns if c.startswith("Unnamed") and df[c].isna().all()]
    df = df.drop(columns=blank)
    if df.shape[1] == 0 or df.shape[0] == 0:
        raise DataError("The file has no data rows.")
    if df.shape[0] > settings.MAX_ROWS:
        raise DataError(f"The file has more than {settings.MAX_ROWS:,} rows, which is the limit.")
    if df.shape[1] > settings.MAX_COLUMNS:
        raise DataError(f"The file has more than {settings.MAX_COLUMNS} columns, which is the limit.")
    return df


# Small LRU so the several requests the dashboard makes per file parse it once.
_cache: "OrderedDict[tuple, pd.DataFrame]" = OrderedDict()
_cache_lock = threading.Lock()
_key_locks: dict[tuple, threading.Lock] = {}


def _cache_key(path: str) -> tuple:
    st = os.stat(path)
    return (path, st.st_mtime_ns, st.st_size)


def load_dataframe(path: str, file_type: str) -> pd.DataFrame:
    """Cached load. Callers must treat the result as read-only."""
    key = _cache_key(path)
    with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
        gate = _key_locks.setdefault(key, threading.Lock())
    with gate:  # concurrent requests for the same file wait for one parse
        with _cache_lock:
            if key in _cache:
                return _cache[key]
        df = read_dataframe(path, file_type)
        size = int(df.memory_usage(deep=False).sum())
        with _cache_lock:
            if size <= settings.DF_CACHE_MB * 1024 * 1024:
                _cache[key] = df
                while len(_cache) > settings.DF_CACHE_ITEMS or _cache_bytes() > settings.DF_CACHE_MB * 1024 * 1024:
                    _cache.popitem(last=False)
            _key_locks.pop(key, None)
        return df


def _cache_bytes() -> int:
    return sum(int(d.memory_usage(deep=False).sum()) for d in _cache.values())


def evict(path: str) -> None:
    with _cache_lock:
        for key in [k for k in _cache if k[0] == path]:
            del _cache[key]


def clear_cache() -> None:
    with _cache_lock:
        _cache.clear()


# ---------------------------------------------------------------- analysis

def safe_float(value) -> float | None:
    if isinstance(value, (int, float, np.integer, np.floating)) and not isinstance(value, (bool, np.bool_)):
        f = float(value)
        return None if math.isnan(f) or math.isinf(f) else f
    return None


def _json_value(v):
    if v is None:
        return None
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    if isinstance(v, (np.integer, int)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        return safe_float(v)
    if isinstance(v, (pd.Timestamp, pd.Timedelta)):
        return str(v)
    if isinstance(v, (str,)):
        return v
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return str(v)


def get_column_info(df: pd.DataFrame) -> list[dict]:
    total = len(df)
    out = []
    for col in df.columns:
        s = df[col]
        missing = int(s.isna().sum())
        out.append({
            "name": col,
            "dtype": str(s.dtype),
            "missing_count": missing,
            "missing_pct": round(missing / total * 100, 2) if total else 0.0,
            "unique_count": int(s.nunique(dropna=True)),
        })
    return out


def search_dataframe(df: pd.DataFrame, term: str) -> pd.DataFrame:
    """Rows where any column contains the term (case-insensitive). Works column by column to bound memory."""
    mask = pd.Series(False, index=df.index)
    for col in df.columns:
        mask |= df[col].astype(str).str.contains(term, case=False, regex=False, na=False)
    return df[mask]


def sort_dataframe(df: pd.DataFrame, column: str, ascending: bool) -> pd.DataFrame:
    try:
        return df.sort_values(by=column, ascending=ascending, na_position="last", kind="stable")
    except TypeError:  # mixed types in one column
        return df.iloc[df[column].astype(str).argsort(kind="stable")] if ascending else \
            df.iloc[df[column].astype(str).argsort(kind="stable")[::-1]]


def get_preview(df: pd.DataFrame, page: int = 1, page_size: int = 20) -> tuple[list[dict], int]:
    total_pages = max(1, math.ceil(len(df) / page_size))
    page = max(1, min(page, total_pages))
    chunk = df.iloc[(page - 1) * page_size: page * page_size]
    chunk = chunk.astype(object).where(pd.notnull(chunk), None)
    return [{k: _json_value(v) for k, v in row.items()} for row in chunk.to_dict(orient="records")], total_pages


def get_duplicate_count(df: pd.DataFrame) -> int:
    return int(df.duplicated().sum())


def _stats_row(col: str, s: pd.Series, numeric: bool) -> dict:
    row = {"column": col, "mean": None, "median": None, "minimum": None, "maximum": None, "std_dev": None,
           "nulls": int(s.isna().sum()), "unique": int(s.nunique(dropna=True)), "dtype": str(s.dtype)}
    if numeric:
        row.update(mean=safe_float(s.mean()), median=safe_float(s.median()), minimum=safe_float(s.min()),
                   maximum=safe_float(s.max()), std_dev=safe_float(s.std()))
    return row


def _numeric_columns(df: pd.DataFrame) -> list[str]:
    return list(df.select_dtypes(include=[np.number]).columns)


def get_numeric_stats(df: pd.DataFrame) -> list[dict]:
    return [_stats_row(c, df[c], True) for c in _numeric_columns(df)]


def get_categorical_stats(df: pd.DataFrame) -> list[dict]:
    num = set(_numeric_columns(df))
    return [_stats_row(c, df[c], False) for c in df.columns if c not in num]


_DATE_LIKE = re.compile(r"^\s*\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}")
_ADDITIVE_WORDS = {"total", "totals", "amount", "amounts", "revenue", "sales", "units", "qty", "quantity", "count",
                   "cost", "costs", "spend", "profit", "income", "expense", "expenses"}


def _is_additive(column: str) -> bool:
    """Whole-word match on the column name, so 'order_total' sums but 'discount' (not 'count') averages."""
    words = set(re.findall(r"[a-z]+", re.sub(r"([a-z])([A-Z])", r"\1 \2", column).lower()))
    return bool(words & _ADDITIVE_WORDS)


def _find_date_column(df: pd.DataFrame) -> str | None:
    """First column that holds dates: a real datetime column, or text that is consistently date-shaped."""
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            return col
    for col in df.select_dtypes(include=["object", "string"]).columns:
        sample = df[col].dropna().astype(str).head(1000)
        looks_dated = len(sample) >= 5 and sample.str.match(_DATE_LIKE).mean() >= 0.9
        if looks_dated and pd.to_datetime(sample, errors="coerce", format="mixed").notna().mean() >= 0.9:
            return col
    return None


def _looks_like_identifier(df: pd.DataFrame, col: str) -> bool:
    name = col.lower().strip()
    if name in ("id", "index", "uuid") or name.endswith("_id") or name.endswith(" id"):
        return True
    s = df[col].dropna()
    return bool(pd.api.types.is_integer_dtype(s) and len(s) > 2 and s.is_unique and s.is_monotonic_increasing)


def generate_chart_data(df: pd.DataFrame, max_categories: int = 12) -> list[dict]:
    """Only charts that are meaningful for the data; never empty or broken ones."""
    charts: list[dict] = []
    numeric_cols = [c for c in _numeric_columns(df) if not _looks_like_identifier(df, c)]
    date_col = _find_date_column(df)
    categorical_cols = [c for c in df.columns if c not in set(_numeric_columns(df)) and c != date_col]

    for col in categorical_cols:
        s = df[col]
        non_null = int(s.notna().sum())
        nunique = int(s.nunique(dropna=True))
        # skip identifier-like columns (nearly one distinct value per row)
        if 1 < nunique <= max_categories and nunique <= 0.5 * non_null:
            counts = s.astype(str).where(s.notna()).value_counts().head(max_categories)
            labels, values = [str(x) for x in counts.index], [float(x) for x in counts.values]
            charts.append({"chart_type": "bar", "title": f"Count by {col}", "labels": labels, "values": values, "column": col})
            charts.append({"chart_type": "pie", "title": f"Share by {col}", "labels": labels, "values": values, "column": col})

    for col in numeric_cols:
        s = df[col].replace([np.inf, -np.inf], np.nan).dropna()
        if len(s) < 2 or s.nunique() < 2:
            continue
        counts, edges = np.histogram(s, bins=min(10, int(s.nunique())))
        labels = [f"{edges[i]:.4g} to {edges[i + 1]:.4g}" for i in range(len(edges) - 1)]
        charts.append({"chart_type": "histogram", "title": f"Distribution of {col}", "labels": labels,
                       "values": [float(c) for c in counts], "column": col})

    # Trends only make sense over time, so they need a date column. Plotting values against row
    # number would show noise, so without dates no line charts are drawn.
    if date_col is not None and numeric_cols:
        dates = pd.to_datetime(df[date_col], errors="coerce", format="mixed")
        ok = dates.notna()
        if ok.sum() >= 5:
            span = (dates[ok].max() - dates[ok].min()).days
            period, unit = ("D", "day") if span <= 62 else ("M", "month") if span <= 1095 else ("Y", "year")
            for n, col in enumerate(numeric_cols[:3]):
                agg = "sum" if _is_additive(col) else "mean"
                grouped = df.loc[ok, col].replace([np.inf, -np.inf], np.nan).groupby(dates[ok].dt.to_period(period)).agg(agg).dropna()
                if len(grouped) < 2:
                    continue
                labels, values = [str(p) for p in grouped.index], [safe_float(v) or 0.0 for v in grouped]
                title = f"{'Total' if agg == 'sum' else 'Average'} {col} by {unit}"
                charts.append({"chart_type": "line", "title": title, "labels": labels, "values": values, "column": col})
                if n == 0:
                    charts.append({"chart_type": "area", "title": f"{title} (area)", "labels": labels, "values": values, "column": col})
    return charts


# ---------------------------------------------------------------- export

_FORMULA_PREFIX = ("=", "+", "-", "@", "\t", "\r")
_ILLEGAL_XML = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def clean_dataframe_for_export(df: pd.DataFrame) -> pd.DataFrame:
    """Drop empty rows/columns, trim text, and neutralise spreadsheet formula injection.

    Text cells beginning with = + - @ are executed as formulas by Excel/Sheets, so they are
    prefixed with an apostrophe. Control characters that make .xlsx files invalid are removed.
    """
    out = df.dropna(how="all").dropna(axis=1, how="all").copy()
    for col in out.select_dtypes(include=["object", "string"]).columns:
        def fix(v):
            if not isinstance(v, str):
                return v
            v = _ILLEGAL_XML.sub("", v).strip()
            return "'" + v if v.startswith(_FORMULA_PREFIX) else v
        out[col] = out[col].map(fix)
    out.columns = [_ILLEGAL_XML.sub("", c) for c in out.columns]
    out.columns = ["'" + c if c.startswith(_FORMULA_PREFIX) else c for c in out.columns]
    return out
