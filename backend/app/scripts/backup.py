"""Backup and restore for the SQLite database and uploaded files.

    python -m app.scripts.backup                 # write a timestamped .tar.gz to <data dir>/backups
    python -m app.scripts.backup --restore FILE  # restore it (stop the app first!)

The database is copied with SQLite's online backup API, so the snapshot is consistent even while
the app is serving requests. For PostgreSQL use `pg_dump` for the database instead.
"""
import argparse
import shutil
import sqlite3
import sys
import tarfile
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import settings


def _sqlite_path() -> Path:
    url = make_url(settings.DATABASE_URL)
    if url.get_backend_name() != "sqlite" or not url.database:
        raise SystemExit("This script backs up SQLite only. For PostgreSQL use pg_dump.")
    return Path(url.database).resolve()


def backup(db_path: Path, upload_dir: Path, dest_dir: Path, keep: int = 14) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    archive = dest_dir / f"azeel-backup-{stamp}.tar.gz"
    with tempfile.TemporaryDirectory() as tmp:
        snapshot = Path(tmp) / "azeel.db"
        src, dst = sqlite3.connect(db_path), sqlite3.connect(snapshot)
        with dst:
            src.backup(dst)
        src.close()
        dst.close()
        with tarfile.open(archive, "w:gz") as tar:
            tar.add(snapshot, arcname="azeel.db")
            if upload_dir.exists():
                tar.add(upload_dir, arcname="uploads", filter=lambda ti: None if ti.name.endswith((".part", ".lock")) else ti)
    for old in sorted(dest_dir.glob("azeel-backup-*.tar.gz"))[:-keep] if keep > 0 else []:
        old.unlink()
    return archive


def restore(archive: Path, db_path: Path, upload_dir: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        with tarfile.open(archive, "r:gz") as tar:
            for member in tar.getmembers():  # refuse path tricks in a tampered archive
                if member.name.startswith(("/", "..")) or ".." in Path(member.name).parts or not (
                    member.name == "azeel.db" or member.name == "uploads" or member.name.startswith("uploads/")
                ):
                    raise SystemExit(f"Unexpected entry in archive: {member.name}")
            tar.extractall(tmp, filter="data")
        for suffix in ("", "-wal", "-shm"):
            Path(str(db_path) + suffix).unlink(missing_ok=True)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(Path(tmp) / "azeel.db", db_path)
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        restored = Path(tmp) / "uploads"
        shutil.copytree(restored, upload_dir) if restored.exists() else upload_dir.mkdir(parents=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--restore", metavar="ARCHIVE", help="restore from this archive instead of creating one")
    parser.add_argument("--dest", default=str(Path(settings.UPLOAD_DIR).parent / "backups"))
    parser.add_argument("--keep", type=int, default=14, help="how many backups to retain (default 14)")
    args = parser.parse_args()
    db, uploads = _sqlite_path(), Path(settings.UPLOAD_DIR)
    if args.restore:
        restore(Path(args.restore), db, uploads)
        print(f"Restored {args.restore}. Start the app again.")
    else:
        print(backup(db, uploads, Path(args.dest), args.keep))


if __name__ == "__main__":
    sys.exit(main())
