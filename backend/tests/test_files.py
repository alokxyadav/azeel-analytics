import io
import zipfile

import pandas as pd

from app.core.config import settings
from tests.conftest import CSV, new_client, signup, upload


def test_upload_preview_stats_charts(client):
    r = upload(client, CSV)
    assert r.status_code == 201, r.text
    f = r.json()
    assert (f["row_count"], f["column_count"]) == (6, 3)
    p = client.get(f"/api/analytics/{f['id']}/preview").json()
    assert p["total_rows"] == 6 and len(p["columns"]) == 3
    s = client.get(f"/api/analytics/{f['id']}/summary").json()
    assert s["numeric_stats"][1]["column"] == "sales" and s["numeric_stats"][1]["mean"] == 35
    kinds = {(c["chart_type"], c["column"]) for c in client.get(f"/api/analytics/{f['id']}/charts").json()}
    assert ("bar", "region") in kinds and ("pie", "region") in kinds
    assert not any(col == "id" for _, col in kinds)  # identifier column is not charted


def test_search_and_sort_cover_whole_file(client):
    fid = upload(client, CSV).json()["id"]
    p = client.get(f"/api/analytics/{fid}/preview", params={"search": "south", "sort_by": "sales", "sort_dir": "desc"}).json()
    assert p["total_rows"] == 2 and [r["sales"] for r in p["preview_rows"]] == [40, 20]


def test_rejects_bad_uploads(client):
    assert upload(client, b"MZ\x90\x00\x03", "evil.exe").status_code == 400
    assert upload(client, b"", "empty.csv").status_code == 400
    assert upload(client, b"just,one,header\n", "hdr.csv").status_code == 400
    assert upload(client, b"not a zip at all", "fake.xlsx").status_code == 400
    assert upload(client, b"a,b\n\x00\x01,2\n", "bin.csv").status_code == 400
    r = upload(client, b"a,b\n1,2\n", "../../etc/passwd.csv")
    assert r.status_code == 201 and r.json()["original_filename"] == "passwd.csv"  # path stripped


def test_oversized_upload_rejected_and_cleaned_up(client, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0)
    assert upload(client, CSV).status_code == 413
    assert client.get("/api/files").json() == []


def test_row_limit(client, monkeypatch):
    monkeypatch.setattr(settings, "MAX_ROWS", 3)
    r = upload(client, CSV)
    assert r.status_code == 400 and "rows" in r.json()["detail"]


def test_zip_bomb_rejected(client, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UNZIPPED_MB", 1)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("xl/workbook.xml", "<x/>")
        z.writestr("xl/big.xml", "0" * (5 * 1024 * 1024))
    assert upload(client, buf.getvalue(), "bomb.xlsx").status_code == 400


def test_xlsx_roundtrip_and_semicolon_latin1_csv(client):
    buf = io.BytesIO()
    pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]}).to_excel(buf, index=False)
    assert upload(client, buf.getvalue(), "t.xlsx").status_code == 201
    semi = "ville;prix\nCaf\u00e9;10\nParis;20\n".encode("cp1252")
    r = upload(client, semi, "fr.csv")
    assert r.status_code == 201 and r.json()["column_count"] == 2


def test_users_cannot_see_each_others_files(client):
    fid = upload(client, CSV).json()["id"]
    other = new_client()
    signup(other)
    assert other.get(f"/api/analytics/{fid}/summary").status_code == 404
    assert other.delete(f"/api/files/{fid}").status_code == 404
    assert other.get(f"/api/reports/{fid}/csv").status_code == 404
    assert other.get("/api/files").json() == []


def test_delete_file(client):
    fid = upload(client, CSV).json()["id"]
    assert client.delete(f"/api/files/{fid}").status_code == 204
    assert client.get(f"/api/analytics/{fid}/preview").status_code == 404


def test_per_user_file_limit(client, monkeypatch):
    monkeypatch.setattr(settings, "MAX_FILES_PER_USER", 1)
    assert upload(client, CSV).status_code == 201
    assert upload(client, CSV).status_code == 400


def test_exports_neutralise_formula_injection(client):
    evil = b'name,note\n"=HYPERLINK(""http://evil"")",ok\n+cmd|calc,\xe2\x80\x9cquote\n@SUM(1),fine\n'
    fid = upload(client, evil).json()["id"]
    csv_text = client.get(f"/api/reports/{fid}/csv").content.decode("utf-8-sig")
    parsed = pd.read_csv(io.StringIO(csv_text), dtype=str, keep_default_na=False)
    assert list(parsed["name"]) == ["'=HYPERLINK(\"http://evil\")", "'+cmd|calc", "'@SUM(1)"]
    xl = client.get(f"/api/reports/{fid}/excel")
    assert xl.status_code == 200
    df = pd.read_excel(io.BytesIO(xl.content))
    assert all(str(v).startswith("'") for v in df["name"])


def test_exports_survive_control_chars_and_markup(client):
    fid = upload(client, b'<b>col&</b>,v\n"a\x07b",1\nplain,2\n').json()["id"]
    assert client.get(f"/api/reports/{fid}/excel").status_code == 200
    pdf = client.get(f"/api/reports/{fid}/pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")


def test_download_filename_cannot_inject_headers(client):
    fid = upload(client, CSV, 'we"ird\r\nname.csv').json()["id"]
    cd = client.get(f"/api/reports/{fid}/csv").headers["content-disposition"]
    assert "\n" not in cd and cd.count('"') == 2


def _csv(rows):
    return ("order_id,region,order_total,discount,order_date\n" + "\n".join(rows) + "\n").encode()


def test_trend_charts_use_dates_not_row_order(client):
    rows = [f"{i},{'north' if i % 2 else 'south'},{100 + (i * 37) % 91},{(i % 5) / 10},2026-{1 + (i % 6):02d}-{1 + (i % 27):02d}" for i in range(1, 61)]
    fid = upload(client, _csv(rows)).json()["id"]
    charts = client.get(f"/api/analytics/{fid}/charts").json()
    lines = [c for c in charts if c["chart_type"] in ("line", "area")]
    assert lines, "a file with a date column should get trend charts"
    assert all("by month" in c["title"] for c in lines)
    assert not any("by row" in c["title"] for c in charts)
    total = next(c for c in lines if c["column"] == "order_total" and c["chart_type"] == "line")
    assert total["title"] == "Total order_total by month" and total["labels"] == sorted(total["labels"]) and len(total["labels"]) == 6
    avg = next(c for c in lines if c["column"] == "discount")
    assert avg["title"].startswith("Average")
    assert not any(c["column"] == "order_date" for c in charts)  # the date column itself is not charted as a category


def test_no_line_charts_without_a_date_column(client):
    fid = upload(client, b"id,region,sales\n" + b"\n".join(f"{i},r{i % 3},{(i * 7) % 23}".encode() for i in range(1, 40))).json()["id"]
    charts = client.get(f"/api/analytics/{fid}/charts").json()
    assert not any(c["chart_type"] in ("line", "area") for c in charts)
    assert any(c["chart_type"] == "histogram" for c in charts)


def test_text_that_merely_contains_digits_is_not_treated_as_dates(client):
    rows = "\n".join(f"{i},A{i},{i * 2}" for i in range(1, 30))
    fid = upload(client, ("id,code,v\n" + rows + "\n").encode()).json()["id"]
    charts = client.get(f"/api/analytics/{fid}/charts").json()
    assert not any(c["chart_type"] in ("line", "area") for c in charts)


def test_total_versus_average_heuristic_uses_whole_words():
    from app.services.data_service import _is_additive
    assert all(_is_additive(c) for c in ["order_total", "Revenue", "units", "itemCount", "total sales", "net_profit"])
    assert not any(_is_additive(c) for c in ["discount", "unit_price", "rating", "age", "temperature", "account_id"])
