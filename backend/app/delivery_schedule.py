"""Расчёт ближайшей доставки по графику адреса и исключениям."""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from .models import (
    DeliveryAddress,
    DeliveryDate,
    DeliveryException,
    DeliveryExceptionAddress,
    DeliveryScheduleSlot,
)

WEEKDAY_NAMES = [
    "Понедельник", "Вторник", "Среда", "Четверг",
    "Пятница", "Суббота", "Воскресенье",
]

MAX_LOOKAHEAD_DAYS = 90


def _active_exception(db: Session, address_id: int, on_date: date) -> Optional[DeliveryException]:
    return (
        db.query(DeliveryException)
        .join(DeliveryExceptionAddress)
        .filter(
            DeliveryException.is_active.is_(True),
            DeliveryException.exception_date == on_date,
            DeliveryExceptionAddress.delivery_address_id == address_id,
        )
        .first()
    )


def _get_or_create_delivery_date(db: Session, delivery_day: date) -> DeliveryDate:
    row = db.query(DeliveryDate).filter(DeliveryDate.delivery_date == delivery_day).first()
    if row:
        return row
    row = DeliveryDate(delivery_date=delivery_day, is_active=True)
    db.add(row)
    db.flush()
    return row


def resolve_next_delivery(
    db: Session,
    address_id: int,
    from_date: Optional[date] = None,
) -> dict:
    """
    Возвращает ближайшую доставку для адреса:
    delivery_date, delivery_time, weekday_label, notice, delivery_date_id
    """
    addr = db.query(DeliveryAddress).filter(DeliveryAddress.id == address_id).first()
    if not addr:
        raise ValueError("Адрес не найден")

    start = from_date or date.today()
    slots = (
        db.query(DeliveryScheduleSlot)
        .filter(
            DeliveryScheduleSlot.delivery_address_id == address_id,
            DeliveryScheduleSlot.is_active.is_(True),
        )
        .all()
    )

    if not slots:
        fallback = (
            db.query(DeliveryDate)
            .filter(DeliveryDate.is_active.is_(True), DeliveryDate.delivery_date >= start)
            .order_by(DeliveryDate.delivery_date)
            .first()
        )
        if not fallback:
            raise ValueError("График доставки для адреса не настроен")
        dd = _get_or_create_delivery_date(db, fallback.delivery_date)
        return {
            "delivery_date": fallback.delivery_date,
            "delivery_time": None,
            "weekday_label": WEEKDAY_NAMES[fallback.delivery_date.weekday()],
            "notice": None,
            "delivery_date_id": dd.id,
        }

    slot_by_weekday = {s.weekday: s for s in slots}
    weekdays = set(slot_by_weekday)

    for offset in range(MAX_LOOKAHEAD_DAYS):
        candidate = start + timedelta(days=offset)
        if candidate.weekday() not in weekdays:
            continue

        slot = slot_by_weekday[candidate.weekday()]
        exc = _active_exception(db, address_id, candidate)

        if exc and exc.action == "cancelled":
            continue

        if exc and exc.action == "postponed" and exc.new_date:
            final_date = exc.new_date
            notice = exc.message
        else:
            final_date = candidate
            notice = exc.message if exc else None

        if final_date < start:
            continue

        dd = _get_or_create_delivery_date(db, final_date)
        return {
            "delivery_date": final_date,
            "delivery_time": slot.delivery_time,
            "weekday_label": WEEKDAY_NAMES[final_date.weekday()],
            "notice": notice,
            "delivery_date_id": dd.id,
        }

    raise ValueError("Нет доступных дат доставки в ближайшие месяцы")


def preview_for_address(db: Session, address_id: int) -> Optional[dict]:
    try:
        return resolve_next_delivery(db, address_id)
    except ValueError:
        return None
