"""Убрать устаревший unique(address) и гарантировать unique(address, date)

Revision ID: 005
Revises: 004
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return inspect(op.get_bind()).has_table(name)


def _has_constraint(table: str, name: str) -> bool:
    return any(c["name"] == name for c in inspect(op.get_bind()).get_unique_constraints(table))


def upgrade() -> None:
    if not _has_table("delivery_schedule_slots"):
        return

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Старый график мог иметь unique только по delivery_address_id — мешает разным датам
        op.execute("""
            DO $$
            DECLARE r RECORD;
            BEGIN
                FOR r IN
                    SELECT c.conname
                    FROM pg_constraint c
                    JOIN pg_class t ON c.conrelid = t.oid
                    WHERE t.relname = 'delivery_schedule_slots'
                      AND c.contype = 'u'
                      AND c.conname <> 'uq_schedule_address_date'
                      AND array_length(c.conkey, 1) = 1
                      AND (
                        SELECT a.attname FROM pg_attribute a
                        WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
                      ) = 'delivery_address_id'
                LOOP
                    EXECUTE format(
                        'ALTER TABLE delivery_schedule_slots DROP CONSTRAINT %I',
                        r.conname
                    );
                END LOOP;
            END $$;
        """)

    if not _has_constraint("delivery_schedule_slots", "uq_schedule_address_date"):
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
    pass
