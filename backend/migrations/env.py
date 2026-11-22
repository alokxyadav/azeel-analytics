from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.database import Base, database_url
from app.models import models  # noqa: F401  (registers tables on Base.metadata)

config = context.config
config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
target_metadata = Base.metadata
is_sqlite = database_url.startswith("sqlite")


def run_migrations_offline() -> None:
    context.configure(url=database_url, target_metadata=target_metadata, literal_binds=True,
                      render_as_batch=is_sqlite, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(config.get_section(config.config_ini_section, {}), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        # Batch mode lets SQLite "alter" tables (it rebuilds them), so later migrations work there too.
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=is_sqlite, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
