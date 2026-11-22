import logging
import os
from contextlib import contextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.config import BASE_DIR, settings
from app.core.database import engine

log = logging.getLogger("azeel.migrate")


def _config() -> Config:
    cfg = Config(str(BASE_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BASE_DIR / "migrations"))
    return cfg


@contextmanager
def _exclusive_lock():
    """Several workers may start at once; only one should migrate."""
    try:
        import fcntl
    except ImportError:  # non-POSIX platforms
        yield
        return
    path = Path(settings.UPLOAD_DIR) / ".migrate.lock"
    with open(path, "w") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(fh, fcntl.LOCK_UN)


def run_migrations() -> None:
    """Bring the database schema up to date. Safe to call on every start.

    Databases created by earlier versions (before migrations existed) already hold the initial
    tables, so they are stamped as being at that revision instead of being created again.
    """
    cfg = _config()
    with _exclusive_lock():
        tables = set(inspect(engine).get_table_names())
        if "users" in tables and "alembic_version" not in tables:
            log.warning("Existing database without migration history: stamping it at the initial revision.")
            command.stamp(cfg, "0001")
        command.upgrade(cfg, "head")
    log.info("Database schema is up to date.")


if __name__ == "__main__":  # python -m app.core.migrate
    logging.basicConfig(level=logging.INFO)
    run_migrations()
    print(f"Migrated {os.environ.get('DATABASE_URL', 'default database')}")
