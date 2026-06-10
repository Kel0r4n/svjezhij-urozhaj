import math
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import (
    Order, OrderItem, OrderStatus, Product, User, DeliveryAddress, DeliveryDate,
    DeliveryScheduleSlot, DeliveryException, DeliveryExceptionAddress, UserEvent,
)
from ..schemas import (
    DashboardStats, AdminOrderResponse, AdminOrderListResponse, OrderStatusUpdate,
    AdminUserResponse, AdminUserDetailResponse, StockBulkUpdateRequest, ProductResponse, SalesAnalyticsResponse,
    DeliveryAddressCreate, DeliveryAddressResponse, DeliveryDateCreate, DeliveryDateResponse,
    DayDetailResponse, CategoryCreate, CategoryUpdate, CategoryResponse,
    DeliveryScheduleSlotCreate, DeliveryScheduleSlotResponse,
    DeliveryExceptionCreate, DeliveryExceptionResponse,
    DeliveryManifestResponse, DeliveryManifestRow,
    UserEventCreate, UserEventResponse,
    ScheduleImportRequest, DeliveryRouteResponse, DeliveryRouteStop,
)
from ..auth import get_current_admin
from ..utils import get_dashboard_stats, get_sales_analytics, get_day_detail
from ..search_utils import apply_user_search
from ..export_utils import build_manifest_rows, manifest_to_xlsx
from ..schedule_import import import_schedule_text

router = APIRouter(prefix="/admin", tags=["admin"])


def _current_week_bounds() -> tuple[date, date]:
    today = date.today()
    start = today - timedelta(days=today.weekday())
    return start, start + timedelta(days=6)


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
    address: Optional[str] = Query(None, description="Точный адрес доставки"),
    delivery_from: Optional[date] = Query(None),
    delivery_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    if delivery_from is None and delivery_to is None:
        delivery_from, delivery_to = _current_week_bounds()
    elif delivery_from is None:
        delivery_from = delivery_to
    elif delivery_to is None:
        delivery_to = delivery_from

    query = db.query(Order).join(User)
    query = query.filter(
        Order.delivery_date >= delivery_from,
        Order.delivery_date <= delivery_to,
    )
    if status:
        try:
            query = query.filter(Order.status == OrderStatus(status))
        except ValueError:
            pass
    if address:
        query = query.filter(Order.address == address)
    if search:
        query = apply_user_search(query, search)
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
        query = apply_user_search(query, search)
    return query.order_by(User.created_at.desc()).all()


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    orders = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.user))
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    order_responses = [_admin_order_response(o) for o in orders]
    events = (
        db.query(UserEvent)
        .filter(UserEvent.user_id == user_id)
        .order_by(UserEvent.created_at.desc())
        .all()
    )
    return AdminUserDetailResponse(
        id=user.id,
        email=user.email,
        phone=user.phone,
        first_name=user.first_name,
        last_name=user.last_name,
        patronymic=user.patronymic,
        is_admin=user.is_admin,
        created_at=user.created_at,
        orders=order_responses,
        orders_count=len(order_responses),
        orders_total=sum(o.total for o in orders),
        events=events,
    )


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


def _manifest_orders_query(db: Session, day: date, address: Optional[str] = None):
    query = (
        db.query(Order)
        .join(User)
        .options(joinedload(Order.items), joinedload(Order.user))
        .filter(Order.delivery_date == day, Order.status != OrderStatus.CANCELLED)
    )
    if address:
        query = query.filter(Order.address == address)
    return query.order_by(Order.address, User.last_name, User.first_name).all()


@router.get("/deliveries/manifest", response_model=DeliveryManifestResponse)
def delivery_manifest(
    day: date = Query(..., description="Дата доставки"),
    address: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    orders = _manifest_orders_query(db, day, address)
    rows = [DeliveryManifestRow(**r) for r in build_manifest_rows(orders)]
    return DeliveryManifestResponse(date=day, rows=rows, total_rows=len(rows))


@router.get("/deliveries/export")
def export_delivery_manifest(
    day: date = Query(...),
    address: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    orders = _manifest_orders_query(db, day, address)
    rows = build_manifest_rows(orders)
    content = manifest_to_xlsx(rows, sheet_title=str(day))
    filename = f"deliveries_{day.isoformat()}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/schedule", response_model=list[DeliveryScheduleSlotResponse])
def list_schedule(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(DeliveryScheduleSlot).order_by(
        DeliveryScheduleSlot.slot_date, DeliveryScheduleSlot.delivery_time
    ).all()


@router.post("/schedule", response_model=DeliveryScheduleSlotResponse, status_code=201)
def create_schedule_slot(
    data: DeliveryScheduleSlotCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    addr = db.query(DeliveryAddress).filter(DeliveryAddress.id == data.delivery_address_id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Адрес не найден")
    parts = data.delivery_time.split(":")
    delivery_time = f"{int(parts[0]):02d}:{parts[1]}"
    slot = DeliveryScheduleSlot(
        delivery_address_id=data.delivery_address_id,
        slot_date=data.slot_date,
        delivery_time=delivery_time,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.post("/schedule/import")
def import_schedule(
    data: ScheduleImportRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    return import_schedule_text(db, data.route_date, data.text)


@router.get("/deliveries/route", response_model=DeliveryRouteResponse)
def delivery_route(
    day: date = Query(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    slots = (
        db.query(DeliveryScheduleSlot, DeliveryAddress)
        .join(DeliveryAddress, DeliveryScheduleSlot.delivery_address_id == DeliveryAddress.id)
        .filter(
            DeliveryScheduleSlot.slot_date == day,
            DeliveryScheduleSlot.is_active.is_(True),
        )
        .order_by(DeliveryScheduleSlot.delivery_time)
        .all()
    )
    stops = []
    for slot, addr in slots:
        orders = _manifest_orders_query(db, day, addr.address)
        items_count = sum(len(o.items) for o in orders)
        stops.append(DeliveryRouteStop(
            time=slot.delivery_time,
            address=addr.address,
            orders_count=len(orders),
            items_count=items_count,
        ))
    return DeliveryRouteResponse(date=day, stops=stops)


@router.delete("/schedule/{slot_id}", status_code=204)
def delete_schedule_slot(slot_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    slot = db.query(DeliveryScheduleSlot).filter(DeliveryScheduleSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")
    db.delete(slot)
    db.commit()


@router.get("/exceptions", response_model=list[DeliveryExceptionResponse])
def list_exceptions(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = db.query(DeliveryException).order_by(DeliveryException.exception_date.desc()).all()
    result = []
    for exc in rows:
        addr_ids = [
            r.delivery_address_id
            for r in db.query(DeliveryExceptionAddress).filter(
                DeliveryExceptionAddress.exception_id == exc.id
            ).all()
        ]
        result.append(DeliveryExceptionResponse(
            id=exc.id,
            exception_date=exc.exception_date,
            action=exc.action,
            new_date=exc.new_date,
            message=exc.message,
            is_active=exc.is_active,
            address_ids=addr_ids,
        ))
    return result


@router.post("/exceptions", response_model=DeliveryExceptionResponse, status_code=201)
def create_exception(
    data: DeliveryExceptionCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    if data.action == "postponed" and not data.new_date:
        raise HTTPException(status_code=400, detail="Укажите новую дату для переноса")
    exc = DeliveryException(
        exception_date=data.exception_date,
        action=data.action,
        new_date=data.new_date,
        message=data.message,
    )
    db.add(exc)
    db.flush()
    for aid in data.address_ids:
        db.add(DeliveryExceptionAddress(exception_id=exc.id, delivery_address_id=aid))
    db.commit()
    return DeliveryExceptionResponse(
        id=exc.id,
        exception_date=exc.exception_date,
        action=exc.action,
        new_date=exc.new_date,
        message=exc.message,
        is_active=exc.is_active,
        address_ids=data.address_ids,
    )


@router.patch("/exceptions/{exc_id}/toggle", response_model=DeliveryExceptionResponse)
def toggle_exception(exc_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    exc = db.query(DeliveryException).filter(DeliveryException.id == exc_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Исключение не найдено")
    exc.is_active = not exc.is_active
    db.commit()
    addr_ids = [
        r.delivery_address_id
        for r in db.query(DeliveryExceptionAddress).filter(
            DeliveryExceptionAddress.exception_id == exc.id
        ).all()
    ]
    return DeliveryExceptionResponse(
        id=exc.id,
        exception_date=exc.exception_date,
        action=exc.action,
        new_date=exc.new_date,
        message=exc.message,
        is_active=exc.is_active,
        address_ids=addr_ids,
    )


@router.post("/users/{user_id}/events", response_model=UserEventResponse, status_code=201)
def create_user_event(
    user_id: int,
    data: UserEventCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    event = UserEvent(
        user_id=user_id,
        admin_id=current_admin.id,
        title=data.title,
        description=data.description,
        price=data.price,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/users/{user_id}/events/{event_id}", status_code=204)
def delete_user_event(
    user_id: int,
    event_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    event = db.query(UserEvent).filter(
        UserEvent.id == event_id, UserEvent.user_id == user_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    db.delete(event)
    db.commit()


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
