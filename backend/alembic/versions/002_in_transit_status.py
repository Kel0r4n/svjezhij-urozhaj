"""Статус заказа in_transit (В пути)

Revision ID: 002
Revises: 001
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        exists = conn.execute(
            text("SELECT 1 FROM pg_type WHERE typname = 'orderstatus'")
        ).scalar()
        if exists:
            op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'in_transit'")


def downgrade() -> None:
    pass
