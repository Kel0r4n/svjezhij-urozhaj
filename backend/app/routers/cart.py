from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import CartItem, Product, User
from ..schemas import CartItemCreate, CartItemUpdate, CartItemResponse, CartSyncRequest
from ..auth import get_current_user

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=list[CartItemResponse])
def get_cart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.user_id == current_user.id)
        .all()
    )
    return items


@router.post("", response_model=CartItemResponse, status_code=201)
def add_to_cart(data: CartItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if product.stock < data.quantity:
        raise HTTPException(status_code=400, detail=f"Недостаточно товара «{product.name}» на складе (доступно: {product.stock})")

    existing = (
        db.query(CartItem)
        .filter(CartItem.user_id == current_user.id, CartItem.product_id == data.product_id)
        .first()
    )
    if existing:
        new_qty = existing.quantity + data.quantity
        if product.stock < new_qty:
            raise HTTPException(status_code=400, detail=f"Недостаточно товара «{product.name}» на складе (доступно: {product.stock})")
        existing.quantity = new_qty
        db.commit()
        db.refresh(existing)
        return db.query(CartItem).options(joinedload(CartItem.product)).filter(CartItem.id == existing.id).first()

    item = CartItem(user_id=current_user.id, product_id=data.product_id, quantity=data.quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return db.query(CartItem).options(joinedload(CartItem.product)).filter(CartItem.id == item.id).first()


@router.patch("/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: int,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.id == item_id, CartItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Позиция не найдена")
    if item.product.stock < data.quantity:
        raise HTTPException(status_code=400, detail=f"Недостаточно товара «{item.product.name}» на складе (доступно: {item.product.stock})")
    item.quantity = data.quantity
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def remove_cart_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Позиция не найдена")
    db.delete(item)
    db.commit()


@router.post("/sync", response_model=list[CartItemResponse])
def sync_cart(data: CartSyncRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()

    for sync_item in data.items:
        product = db.query(Product).filter(Product.id == sync_item.product_id).first()
        if not product:
            continue
        qty = min(sync_item.quantity, product.stock)
        if qty > 0:
            db.add(CartItem(user_id=current_user.id, product_id=sync_item.product_id, quantity=qty))

    db.commit()
    return (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.user_id == current_user.id)
        .all()
    )


@router.delete("", status_code=204)
def clear_cart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()
