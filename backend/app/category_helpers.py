from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import ProductCategory


def get_category_labels(db: Session) -> dict[str, str]:
    cats = db.query(ProductCategory).all()
    return {c.slug: c.label for c in cats}


def get_category_colors(db: Session) -> dict[str, str]:
    cats = db.query(ProductCategory).all()
    return {c.slug: c.chart_color for c in cats}


def category_label(db: Session, key: str) -> str:
    return get_category_labels(db).get(key, key)


def ensure_category_exists(db: Session, slug: str) -> None:
    if not db.query(ProductCategory).filter(ProductCategory.slug == slug).first():
        raise HTTPException(status_code=400, detail="Категория не найдена")
