import sqlite3
import tarfile

import pytest

from app.scripts.backup import backup, restore


def _make(tmp_path):
    db = tmp_path / "data" / "azeel.db"
    up = tmp_path / "data" / "uploads"
    (up / "u1").mkdir(parents=True)
    (up / "u1" / "f.csv").write_text("a,b\n1,2\n")
    db.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(db)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("CREATE TABLE t (x INTEGER)")
    con.execute("INSERT INTO t VALUES (42)")
    con.commit()
    return db, up, con


def test_backup_is_consistent_and_restorable(tmp_path):
    db, up, con = _make(tmp_path)   # connection left open on purpose: backup must work on a live DB
    archive = backup(db, up, tmp_path / "backups")
    con.execute("INSERT INTO t VALUES (99)"); con.commit(); con.close()
    (up / "u1" / "f.csv").unlink()

    restore(archive, db, up)
    assert sqlite3.connect(db).execute("SELECT x FROM t").fetchall() == [(42,)]
    assert (up / "u1" / "f.csv").read_text() == "a,b\n1,2\n"


def test_retention_keeps_only_the_newest(tmp_path, monkeypatch):
    db, up, con = _make(tmp_path); con.close()
    import app.scripts.backup as b
    names = iter(f"2026010{i}T000000Z" for i in range(1, 6))

    class FakeDT:
        @staticmethod
        def now(tz=None):
            from datetime import datetime
            return datetime.strptime(next(names), "%Y%m%dT%H%M%SZ")
    monkeypatch.setattr(b, "datetime", FakeDT)
    for _ in range(5):
        backup(db, up, tmp_path / "bk", keep=2)
    assert len(list((tmp_path / "bk").glob("*.tar.gz"))) == 2


def test_restore_rejects_malicious_archives(tmp_path):
    evil = tmp_path / "evil.tar.gz"
    payload = tmp_path / "x.txt"; payload.write_text("pwn")
    with tarfile.open(evil, "w:gz") as tar:
        tar.add(payload, arcname="../../escape.txt")
    with pytest.raises(SystemExit):
        restore(evil, tmp_path / "azeel.db", tmp_path / "uploads")
    assert not (tmp_path.parent / "escape.txt").exists()
