import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Order, OrderItem, OrderStatus, Product, User, DeliveryAddress, DeliveryDate, ProductCategory
from ..schemas import (
    DashboardStats, AdminOrderResponse, AdminOrderListResponse, OrderStatusUpdate,
    AdminUserResponse, StockBulkUpdateRequest, ProductResponse, SalesAnalyticsResponse,
    DeliveryAddressCreate, DeliveryAddressResponse, DeliveryDateCreate, DeliveryDateResponse,
    DayDetailResponse, CategoryCreate, CategoryUpdate, CategoryResponse,
)
from ..auth import get_current_admin
from ..utils import get_dashboard_stats, get_sales_analytics, get_day_detail

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_order_response(order: Order) -> AdminOrderResponse:
    user = order.user
    return AdminOrderResponse(
        id=order.id,
        user_id=order.user_id,
        user_name=user.full_name if user else "—",
        user_phone=user.phone if user else "—",
        status=order.status.value if isinstance(order.status, OrderStatus) else order.status,
        address=order.address,
        delivery_date=order.delivery_date,
        total=order.total,
        created_at=order.created_at,
        items=order.items,
    )


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return get_dashboard_stats(db)


@router.get("/analytics/sales", response_model=SalesAnalyticsResponse)
def sales_analytics(
    days: int = Query(30, ge=7, le=90),
    categories: Optional[str] = Query(None, description="Категории через запятую"),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    cats = [x.strip() for x in categories.split(",") if x.strip()] if categories else None
    return get_sales_analytics(db, days=days, categories=cats)


@router.get("/analytics/day/{day}", response_model=DayDetailResponse)
def sales_day_detail(
    day: str,
    categories: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    cats = [x.strip() for x in categories.split(",") if x.strip()] if categories else None
    return get_day_detail(db, day=day, categories=cats)


@router.get("/categories", response_model=list[CategoryResponse])
def admin_list_categories(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(ProductCategory).order_by(ProductCategory.sort_order, ProductCategory.label).all()


@router.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if db.query(ProductCategory).filter(ProductCategory.slug == data.slug).first():
        raise HTTPException(status_code=400, detail="Категория с таким кодом уже существует")
    cat = ProductCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/categories/{cat_id}", response_model=CategoryResponse)
def update_category(cat_id: int, data: CategoryUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    cat = db.query(ProductCategory).filter(ProductCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    cat = db.query(ProductCategory).filter(ProductCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    in_use = db.query(Product).filter(Product.category == cat.slug).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Категория используется в товарах")
    db.delete(cat)
    db.commit()


@router.get("/addresses", response_model=list[DeliveryAddressResponse])
def admin_list_addresses(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(DeliveryAddress).order_by(DeliveryAddress.address).all()


@router.post("/addresses", response_model=DeliveryAddressResponse, status_code=201)
def create_address(data: DeliveryAddressCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if db.query(DeliveryAddress).filter(DeliveryAddress.address == data.address).first():
        raise HTTPException(status_code=400, detail="Адрес уже существует")
    addr = DeliveryAddress(address=data.address)
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.patch("/addresses/{addr_id}/toggle", response_model=DeliveryAddressResponse)
def toggle_address(addr_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    addr = db.query(DeliveryAddress).filter(DeliveryAddress.id == addr_id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Адрес не найден")
    addr.is_active = not addr.is_active
    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/addresses/{addr_id}", status_code=204)
def delete_address(addr_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    addr = db.query(DeliveryAddress).filter(DeliveryAddress.id == addr_id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Адрес не найден")
    db.delete(addr)
    db.commit()


@router.get("/delivery-dates", response_model=list[DeliveryDateResponse])
def admin_list_dates(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(DeliveryDate).order_by(DeliveryDate.delivery_date).all()


@router.post("/delivery-dates", response_model=DeliveryDateResponse, status_code=201)
def create_delivery_date(data: DeliveryDateCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if db.query(DeliveryDate).filter(DeliveryDate.delivery_date == data.delivery_date).first():
        raise HTTPException(status_code=400, detail="Дата уже существует")
    d = DeliveryDate(delivery_date=data.delivery_date)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.patch("/delivery-dates/{date_id}/toggle", response_model=DeliveryDateResponse)
def toggle_delivery_date(date_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    d = db.query(DeliveryDate).filter(DeliveryDate.id == date_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Дата не найдена")
    d.is_active = not d.is_active
    db.commit()
    db.refresh(d)
    return d


@router.delete("/delivery-dates/{date_id}", status_code=204)
def delete_delivery_date(date_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    d = db.query(DeliveryDate).filter(DeliveryDate.id == date_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Дата не найдена")
    db.delete(d)
    db.commit()


@router.get("/orders", response_model=AdminOrderListResponse)
def admin_list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    query = db.query(Order).join(User)
    if status:
        try:
            query = query.filter(Order.status == OrderStatus(status))
        except ValueError:
            pass
    if search:
        from sqlalchemy import or_
        like = f"%{search}%"
        query = query.filter(
            or_(
                User.phone.ilike(like),
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
                User.patronymic.ilike(like),
            )
        )
    total = query.count()
    pages = max(1, math.ceil(total / per_page))
    orders = (
        query.options(joinedload(Order.items), joinedload(Order.user))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return AdminOrderListResponse(
        items=[_admin_order_response(o) for o in orders],
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/orders/{order_id}", response_model=AdminOrderResponse)
def admin_get_order(order_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.user))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return _admin_order_response(order)


@router.patch("/orders/{order_id}/status", response_model=AdminOrderResponse)
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.user))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    new_status = OrderStatus(data.status)
    old_status = order.status

    if old_status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Нельзя изменить статус отменённого заказа")

    if new_status == OrderStatus.CANCELLED and old_status != OrderStatus.CANCELLED:
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock += item.quantity

    order.status = new_status
    db.commit()
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.user))
        .filter(Order.id == order_id)
        .first()
    )
    return _admin_order_response(order)


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    query = db.query(User)
    if search:
        from sqlalchemy import or_
        query = query.filter(or_(User.email.ilike(f"%{search}%"), User.phone.ilike(f"%{search}%")))
    return query.order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/admin", response_model=AdminUserResponse)
def toggle_admin(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Нельзя изменить свои права")
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    return user


@router.post("/stock/bulk", response_model=list[ProductResponse])
def bulk_update_stock(
    data: StockBulkUpdateRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    updated = []
    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock = item.stock
            updated.append(product)
    db.commit()
    for p in updated:
        db.refresh(p)
    return updated
