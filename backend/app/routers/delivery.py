from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DeliveryAddress, DeliveryDate
from ..schemas import (
    DeliveryAddressPublicResponse,
    DeliveryDateResponse,
    DeliveryNextResponse,
    DeliveryUpcomingSlot,
)
from ..delivery_schedule import preview_for_address, resolve_next_delivery, upcoming_for_address, WEEKDAY_NAMES

router = APIRouter(prefix="/delivery", tags=["delivery"])


@router.get("/addresses", response_model=list[DeliveryAddressPublicResponse])
def list_addresses(db: Session = Depends(get_db)):
    rows = (
        db.query(DeliveryAddress)
        .filter(DeliveryAddress.is_active.is_(True))
        .order_by(DeliveryAddress.address)
        .all()
    )
    result = []
    for addr in rows:
        preview = preview_for_address(db, addr.id)
        result.append(DeliveryAddressPublicResponse(
            id=addr.id,
            address=addr.address,
            is_active=addr.is_active,
            created_at=addr.created_at,
            next_delivery_date=preview["delivery_date"] if preview else None,
            next_delivery_time=preview.get("delivery_time") if preview else None,
            next_delivery_weekday=preview.get("weekday_label") if preview else None,
            delivery_notice=preview.get("notice") if preview else None,
        ))
    return result


@router.get("/upcoming/{address_id}", response_model=list[DeliveryUpcomingSlot])
def upcoming_delivery(address_id: int, db: Session = Depends(get_db)):
    rows = upcoming_for_address(db, address_id)
    return [DeliveryUpcomingSlot(**r) for r in rows]


@router.get("/next/{address_id}", response_model=DeliveryNextResponse)
def next_delivery(address_id: int, db: Session = Depends(get_db)):
    try:
        info = resolve_next_delivery(db, address_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return DeliveryNextResponse(**info)


@router.get("/dates", response_model=list[DeliveryDateResponse])
def list_dates(db: Session = Depends(get_db)):
    today = date.today()
    return (
        db.query(DeliveryDate)
        .filter(DeliveryDate.is_active.is_(True), DeliveryDate.delivery_date >= today)
        .order_by(DeliveryDate.delivery_date)
        .all()
    )
