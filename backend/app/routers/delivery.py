from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DeliveryAddress, DeliveryDate
from ..schemas import DeliveryAddressResponse, DeliveryDateResponse

router = APIRouter(prefix="/delivery", tags=["delivery"])


@router.get("/addresses", response_model=list[DeliveryAddressResponse])
def list_addresses(db: Session = Depends(get_db)):
    return (
        db.query(DeliveryAddress)
        .filter(DeliveryAddress.is_active.is_(True))
        .order_by(DeliveryAddress.address)
        .all()
    )


@router.get("/dates", response_model=list[DeliveryDateResponse])
def list_dates(db: Session = Depends(get_db)):
    today = date.today()
    return (
        db.query(DeliveryDate)
        .filter(DeliveryDate.is_active.is_(True), DeliveryDate.delivery_date >= today)
        .order_by(DeliveryDate.delivery_date)
        .all()
    )
