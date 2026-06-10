"""График доставки: день (блок) → список пар «время + адрес»."""

from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import DeliveryAddress, DeliveryDate, DeliveryScheduleSlot


def normalize_time(value: str) -> str:
    parts = value.strip().split(":")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Некорректное время")
    return f"{int(parts[0]):02d}:{parts[1][:2]}"


def ensure_delivery_date(db: Session, delivery_day: date) -> DeliveryDate:
    row = db.query(DeliveryDate).filter(DeliveryDate.delivery_date == delivery_day).first()
    if row:
        if not row.is_active:
            row.is_active = True
        return row
    row = DeliveryDate(delivery_date=delivery_day, is_active=True)
    db.add(row)
    db.flush()
    return row


def list_schedule_blocks(db: Session) -> list[dict]:
    slots = (
        db.query(DeliveryScheduleSlot, DeliveryAddress)
        .join(DeliveryAddress, DeliveryScheduleSlot.delivery_address_id == DeliveryAddress.id)
        .filter(DeliveryScheduleSlot.is_active.is_(True))
        .order_by(DeliveryScheduleSlot.slot_date, DeliveryScheduleSlot.delivery_time)
        .all()
    )
    by_date: dict[date, list[dict]] = {}
    for slot, addr in slots:
        by_date.setdefault(slot.slot_date, []).append({
            "id": slot.id,
            "delivery_address_id": slot.delivery_address_id,
            "delivery_time": slot.delivery_time,
            "address": addr.address,
        })
    return [{"slot_date": d, "entries": entries} for d, entries in sorted(by_date.items())]


def save_schedule_block(
    db: Session,
    slot_date: date,
    entries: list[dict],
    *,
    previous_date: date | None = None,
) -> dict:
    if not entries:
        raise HTTPException(status_code=400, detail="Добавьте хотя бы один адрес")

    address_ids = [e["delivery_address_id"] for e in entries]
    if len(address_ids) != len(set(address_ids)):
        raise HTTPException(status_code=400, detail="Один адрес нельзя указать дважды в один день")

    for aid in address_ids:
        if not db.query(DeliveryAddress).filter(DeliveryAddress.id == aid).first():
            raise HTTPException(status_code=404, detail="Адрес не найден")

    dates_to_clear = {slot_date}
    if previous_date and previous_date != slot_date:
        dates_to_clear.add(previous_date)

    for d in dates_to_clear:
        db.query(DeliveryScheduleSlot).filter(DeliveryScheduleSlot.slot_date == d).delete()

    for entry in entries:
        db.add(DeliveryScheduleSlot(
            delivery_address_id=entry["delivery_address_id"],
            slot_date=slot_date,
            delivery_time=normalize_time(entry["delivery_time"]),
        ))

    ensure_delivery_date(db, slot_date)
    db.commit()
    return next(b for b in list_schedule_blocks(db) if b["slot_date"] == slot_date)


def delete_schedule_block(db: Session, slot_date: date) -> None:
    deleted = db.query(DeliveryScheduleSlot).filter(DeliveryScheduleSlot.slot_date == slot_date).delete()
    if not deleted:
        raise HTTPException(status_code=404, detail="День доставки не найден")
    db.commit()
