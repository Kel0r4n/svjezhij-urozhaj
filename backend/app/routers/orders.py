import math
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Order, OrderItem, OrderStatus, CartItem, Product, User, DeliveryAddress, DeliveryDate
from ..schemas import OrderCreate, OrderResponse, OrderListResponse
from ..auth import get_current_user
from ..delivery_schedule import resolve_next_delivery

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    addr = db.query(DeliveryAddress).filter(
        DeliveryAddress.id == data.delivery_address_id,
        DeliveryAddress.is_active.is_(True),
    ).first()
    if not addr:
        raise HTTPException(status_code=400, detail="Адрес доставки недоступен")

    if data.delivery_date_id:
        ddate = db.query(DeliveryDate).filter(
            DeliveryDate.id == data.delivery_date_id,
            DeliveryDate.is_active.is_(True),
            DeliveryDate.delivery_date >= date.today(),
        ).first()
        if not ddate:
            raise HTTPException(status_code=400, detail="Дата доставки недоступна")
    else:
        try:
            info = resolve_next_delivery(db, data.delivery_address_id)
            ddate = db.query(DeliveryDate).filter(DeliveryDate.id == info["delivery_date_id"]).first()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if not ddate or not ddate.is_active:
            raise HTTPException(status_code=400, detail="Дата доставки недоступна")

    cart_items = (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.user_id == current_user.id)
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=400, detail="Корзина пуста")

    for item in cart_items:
        if not item.product.is_active:
            raise HTTPException(status_code=400, detail=f"Товар «{item.product.name}» больше не доступен")
        if item.product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно товара «{item.product.name}» на складе (доступно: {item.product.stock})",
            )

    total = sum(item.product.price * item.quantity for item in cart_items)
    order = Order(
        user_id=current_user.id,
        status=OrderStatus.CREATED,
        delivery_address_id=addr.id,
        delivery_date_id=ddate.id,
        address=addr.address,
        delivery_date=ddate.delivery_date,
        total=total,
    )
    db.add(order)
    db.flush()

    for item in cart_items:
        item.product.stock -= item.quantity
        db.add(OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_name=item.product.name,
            category=item.product.category,
            price=item.product.price,
            quantity=item.quantity,
        ))

    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()

    return db.query(Order).options(joinedload(Order.items)).filter(Order.id == order.id).first()


@router.get("", response_model=OrderListResponse)
def list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Order).filter(Order.user_id == current_user.id)
    total = query.count()
    pages = max(1, math.ceil(total / per_page))
    orders = (
        query.options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return OrderListResponse(items=orders, total=total, page=page, pages=pages)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return order


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if order.status != OrderStatus.CREATED:
        raise HTTPException(status_code=400, detail="Отменить можно только заказ со статусом «создан»")

    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity

    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/repeat", response_model=dict)
def repeat_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    added, skipped = [], []
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product or not product.is_active or product.stock == 0:
            skipped.append(item.product_name)
            continue
        qty = min(item.quantity, product.stock)
        existing = db.query(CartItem).filter(
            CartItem.user_id == current_user.id, CartItem.product_id == item.product_id
        ).first()
        if existing:
            existing.quantity = min(existing.quantity + qty, product.stock)
        else:
            db.add(CartItem(user_id=current_user.id, product_id=item.product_id, quantity=qty))
        added.append({"name": item.product_name, "quantity": qty})

    db.commit()
    return {"added": added, "skipped": skipped}
