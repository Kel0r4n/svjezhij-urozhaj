"""График доставки, исключения, события пользователей, колонки товаров

Revision ID: 003
Revises: 002
Create Date: 2026-06-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return inspect(op.get_bind()).has_table(name)


def _cols(table: str) -> set[str]:
    return {c["name"] for c in inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    if _has_table("products"):
        existing = _cols("products")
        if "image_zoom" not in existing:
            op.add_column("products", sa.Column("image_zoom", sa.Float(), server_default="1.0"))
        if "image_pan_x" not in existing:
            op.add_column("products", sa.Column("image_pan_x", sa.Float(), server_default="0.0"))
        if "image_pan_y" not in existing:
            op.add_column("products", sa.Column("image_pan_y", sa.Float(), server_default="0.0"))

    if not _has_table("delivery_schedule_slots"):
        op.create_table(
            "delivery_schedule_slots",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("delivery_address_id", sa.Integer(), sa.ForeignKey("delivery_addresses.id"), nullable=False),
            sa.Column("slot_date", sa.Date(), nullable=False),
            sa.Column("delivery_time", sa.String(5), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        )
        op.create_index("ix_delivery_schedule_slots_slot_date", "delivery_schedule_slots", ["slot_date"])
    elif "slot_date" not in _cols("delivery_schedule_slots"):
        op.add_column("delivery_schedule_slots", sa.Column("slot_date", sa.Date(), nullable=True))
        op.execute("DELETE FROM delivery_schedule_slots WHERE slot_date IS NULL")

    if not _has_table("delivery_exceptions"):
        op.create_table(
            "delivery_exceptions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("exception_date", sa.Date(), nullable=False),
            sa.Column("action", sa.String(16), nullable=False),
            sa.Column("new_date", sa.Date(), nullable=True),
            sa.Column("message", sa.Text(), server_default=""),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        )

    if not _has_table("delivery_exception_addresses"):
        op.create_table(
            "delivery_exception_addresses",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("exception_id", sa.Integer(), sa.ForeignKey("delivery_exceptions.id"), nullable=False),
            sa.Column("delivery_address_id", sa.Integer(), sa.ForeignKey("delivery_addresses.id"), nullable=False),
        )

    if not _has_table("user_events"):
        op.create_table(
            "user_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), server_default=""),
            sa.Column("price", sa.Float(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        )


def downgrade() -> None:
    pass
