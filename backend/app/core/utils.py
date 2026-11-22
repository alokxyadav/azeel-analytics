import re
import unicodedata


def clean_display_name(name: str, default: str = "upload") -> str:
    """Name shown in the UI: no path parts, no control characters, bounded length."""
    name = name.replace("\\", "/").split("/")[-1]
    name = "".join(ch for ch in name if unicodedata.category(ch)[0] != "C").strip()
    return name[:200] or default


def safe_download_stem(name: str) -> str:
    """ASCII-only stem that is safe inside a Content-Disposition header."""
    stem = name.rsplit(".", 1)[0] if "." in name else name
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._-")
    return stem[:80] or "report"
