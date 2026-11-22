import os
import sqlite3

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

from app.core import migrate
from app.core.database import Base
from app.models import models  # noqa: F401


def _fresh_engine(tmp_path, monkeypatch, name="m.db"):
    url = f"sqlite:///{tmp_path / name}"
    eng = create_engine(url)
    monkeypatch.setattr(migrate, "engine", eng)
    # env.py reads the URL from app.core.database at import time of each run
    monkeypatch.setattr("app.core.database.database_url", url)
    return eng


def test_migrations_build_a_schema_identical_to_the_models(tmp_path, monkeypatch):
    eng = _fresh_engine(tmp_path, monkeypatch)
    migrate.run_migrations()
    with eng.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == [], f"models and migrations have drifted: {diff}"


def test_legacy_database_is_stamped_not_recreated(tmp_path, monkeypatch):
    eng = _fresh_engine(tmp_path, monkeypatch, "legacy.db")
    Base.metadata.create_all(eng)  # what versions before migrations did
    with eng.begin() as conn:
        conn.exec_driver_sql("INSERT INTO users (id,name,email,hashed_password,theme,created_at) VALUES ('1','A B','a@b.co','x','light','2026-01-01')")
    migrate.run_migrations()  # must not fail with "table already exists" and must keep data
    con = sqlite3.connect(tmp_path / "legacy.db")
    assert con.execute("SELECT version_num FROM alembic_version").fetchone()[0] == "0002"  # stamped, then upgraded
    assert con.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
    migrate.run_migrations()  # idempotent
    assert os.path.exists(tmp_path / "legacy.db")


def test_upgrade_from_the_first_release_keeps_users_and_grandfathers_them_as_verified(tmp_path, monkeypatch):
    from alembic import command
    eng = _fresh_engine(tmp_path, monkeypatch, "v1.db")
    command.upgrade(migrate._config(), "0001")          # a database as the first release left it
    with eng.begin() as conn:
        conn.exec_driver_sql("INSERT INTO users (id,name,email,hashed_password,theme,created_at) VALUES ('1','Old User','old@example.com','x','light','2026-01-01 00:00:00')")
    migrate.run_migrations()                              # upgrade to the latest version
    con = sqlite3.connect(tmp_path / "v1.db")
    assert con.execute("SELECT email_verified_at FROM users WHERE id='1'").fetchone()[0] == "2026-01-01 00:00:00"
    assert con.execute("SELECT version_num FROM alembic_version").fetchone()[0] == "0002"
