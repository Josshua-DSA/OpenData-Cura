"""baseline schema (existing DB)

Revision ID: 0001_baseline
Revises:
Create Date: 2026-09-06

This is a BASELINE migration. The schema already exists in the database
(created historically via `cli.py init-db` / `create_all`) and is managed
henceforth by Alembic. We do not re-run DDL here; `alembic stamp head`
records this revision as the starting point for future migrations.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
