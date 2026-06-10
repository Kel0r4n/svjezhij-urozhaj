"""Уникальность адрес+дата в графике доставки

Revision ID: 004
Revises: 003
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return inspect(op.get_bind()).has_table(name)


def _has_constraint(table: str, name: str) -> bool:
    return any(c["name"] == name for c in inspect(op.get_bind()).get_unique_constraints(table))


def upgrade() -> None:
    if not _has_table("delivery_schedule_slots"):
        return
    if not _has_constraint("delivery_schedule_slots", "uq_schedule_address_date"):
        bind = op.get_bind()
        if bind.dialect.name == "postgresql":
            op.execute("""
                DELETE FROM delivery_schedule_slots a
                USING delivery_schedule_slots b
                WHERE a.delivery_address_id = b.delivery_address_id
                  AND a.slot_date = b.slot_date
                  AND a.id > b.id
            """)
        else:
            op.execute("""
                DELETE FROM delivery_schedule_slots
                WHERE id NOT IN (
                    SELECT MIN(id) FROM delivery_schedule_slots
                    GROUP BY delivery_address_id, slot_date
                )
            """)
        op.create_unique_constraint(
            "uq_schedule_address_date",
            "delivery_schedule_slots",
            ["delivery_address_id", "slot_date"],
        )


def downgrade() -> None:
    if _has_table("delivery_schedule_slots") and _has_constraint("delivery_schedule_slots", "uq_schedule_address_date"):
        op.drop_constraint("uq_schedule_address_date", "delivery_schedule_slots", type_="unique")
