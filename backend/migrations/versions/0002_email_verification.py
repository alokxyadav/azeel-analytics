"""email verification

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent: a database created from newer models may already have the column.
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("users")}
    if "email_verified_at" not in existing:
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.add_column(sa.Column("email_verified_at", sa.DateTime(), nullable=True))
    # Accounts that already exist were created before verification existed. Treat them as verified
    # so that deploying this version never locks current users out of uploading.
    op.execute("UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL")


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("email_verified_at")
