"""Расчёт ближайшей доставки по графику (блоки: дата + время по адресам)."""

from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from .models import DeliveryAddress, DeliveryScheduleSlot
from .schedule_blocks import ensure_delivery_date

WEEKDAY_NAMES = [
    "Понедельник", "Вторник", "Среда", "Четверг",
    "Пятница", "Суббота", "Воскресенье",
]


def resolve_next_delivery(
    db: Session,
    address_id: int,
    from_date: Optional[date] = None,
) -> dict:
    addr = db.query(DeliveryAddress).filter(DeliveryAddress.id == address_id).first()
    if not addr:
        raise ValueError("Адрес не найден")

    start = from_date or date.today()
    slot = (
        db.query(DeliveryScheduleSlot)
        .filter(
            DeliveryScheduleSlot.delivery_address_id == address_id,
            DeliveryScheduleSlot.is_active.is_(True),
            DeliveryScheduleSlot.slot_date >= start,
        )
        .order_by(DeliveryScheduleSlot.slot_date, DeliveryScheduleSlot.delivery_time)
        .first()
    )

    if not slot:
        raise ValueError("График доставки для адреса не настроен")

    dd = ensure_delivery_date(db, slot.slot_date)
    db.commit()
    return {
        "delivery_date": slot.slot_date,
        "delivery_time": slot.delivery_time,
        "weekday_label": WEEKDAY_NAMES[slot.slot_date.weekday()],
        "notice": None,
        "delivery_date_id": dd.id,
    }


def upcoming_for_address(db: Session, address_id: int, limit: int = 5) -> list[dict]:
    start = date.today()
    slots = (
        db.query(DeliveryScheduleSlot)
        .filter(
            DeliveryScheduleSlot.delivery_address_id == address_id,
            DeliveryScheduleSlot.is_active.is_(True),
            DeliveryScheduleSlot.slot_date >= start,
        )
        .order_by(DeliveryScheduleSlot.slot_date, DeliveryScheduleSlot.delivery_time)
        .limit(limit)
        .all()
    )
    return [
        {
            "date": slot.slot_date,
            "time": slot.delivery_time,
            "weekday_label": WEEKDAY_NAMES[slot.slot_date.weekday()],
            "notice": None,
        }
        for slot in slots
    ]


def preview_for_address(db: Session, address_id: int) -> Optional[dict]:
    try:
        return resolve_next_delivery(db, address_id)
    except ValueError:
        return None
