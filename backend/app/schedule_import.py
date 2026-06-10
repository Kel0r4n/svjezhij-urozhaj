"""Разбор текста маршрута из чата: «19:00 — Микрогород»."""

import re
from datetime import date

from sqlalchemy.orm import Session

from .models import DeliveryAddress, DeliveryScheduleSlot

LINE_RE = re.compile(
    r"^(\d{1,2}:\d{2})\s*[—\-–]\s*(.+?)\s*$",
    re.UNICODE,
)


def _norm_time(t: str) -> str:
    h, m = t.split(":")
    return f"{int(h):02d}:{m}"


def _find_address(db: Session, name: str) -> DeliveryAddress | None:
    name = name.strip()
    if not name:
        return None
    exact = db.query(DeliveryAddress).filter(DeliveryAddress.address == name).first()
    if exact:
        return exact
    like = db.query(DeliveryAddress).filter(DeliveryAddress.address.ilike(f"%{name}%")).all()
    if len(like) == 1:
        return like[0]
    name_l = name.lower()
    for a in db.query(DeliveryAddress).all():
        if a.address.lower() == name_l:
            return a
    return None


def parse_schedule_lines(text: str) -> list[dict]:
    """Возвращает [{delivery_time, address_name}, ...]"""
    rows = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("🅰") or line.lower().startswith("друзья"):
            continue
        m = LINE_RE.match(line)
        if not m:
            continue
        rows.append({
            "delivery_time": _norm_time(m.group(1)),
            "address_name": m.group(2).strip(),
        })
    return rows


def import_schedule_text(
    db: Session,
    route_date: date,
    text: str,
) -> dict:
    parsed = parse_schedule_lines(text)
    created, skipped = [], []
    for row in parsed:
        addr = _find_address(db, row["address_name"])
        if not addr:
            skipped.append(row["address_name"])
            continue
        exists = db.query(DeliveryScheduleSlot).filter(
            DeliveryScheduleSlot.delivery_address_id == addr.id,
            DeliveryScheduleSlot.slot_date == route_date,
        ).first()
        if exists:
            exists.delivery_time = row["delivery_time"]
            exists.is_active = True
            created.append(addr.address)
            continue
        db.add(DeliveryScheduleSlot(
            delivery_address_id=addr.id,
            slot_date=route_date,
            delivery_time=row["delivery_time"],
        ))
        created.append(addr.address)
    db.commit()
    return {"created": created, "skipped": skipped, "count": len(created)}
