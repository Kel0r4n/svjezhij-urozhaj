from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ProductCategory
from ..schemas import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return (
        db.query(ProductCategory)
        .filter(ProductCategory.is_active.is_(True))
        .order_by(ProductCategory.sort_order, ProductCategory.label)
        .all()
    )
