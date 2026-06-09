import secrets
import string
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from .models import Order, OrderItem, OrderStatus, Product, ProductCategory
from .category_helpers import category_label, get_category_labels, get_category_colors


def generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def get_dashboard_stats(db: Session) -> dict:
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    orders_today = (
        db.query(func.count(Order.id))
        .filter(Order.created_at >= today_start, Order.status != OrderStatus.CANCELLED)
        .scalar()
    )
    orders_week = (
        db.query(func.count(Order.id))
        .filter(Order.created_at >= week_start, Order.status != OrderStatus.CANCELLED)
        .scalar()
    )
    total_revenue = (
        db.query(func.coalesce(func.sum(Order.total), 0))
        .filter(Order.status.in_([OrderStatus.CONFIRMED, OrderStatus.DELIVERED]))
        .scalar()
    )

    top_products = (
        db.query(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.price * OrderItem.quantity).label("revenue"),
        )
        .join(Order)
        .filter(Order.status.in_([OrderStatus.CONFIRMED, OrderStatus.DELIVERED, OrderStatus.CREATED]))
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )

    return {
        "orders_today": orders_today or 0,
        "orders_week": orders_week or 0,
        "total_revenue": float(total_revenue or 0),
        "top_products": [
            {"name": p.product_name, "sold": int(p.total_sold), "revenue": float(p.revenue)}
            for p in top_products
        ],
    }


def get_day_detail(db: Session, day: str, categories: Optional[list[str]] = None) -> dict:
    day_start = datetime.strptime(day, "%Y-%m-%d")
    day_end = day_start + timedelta(days=1)
    query = (
        db.query(OrderItem, Order)
        .join(Order)
        .filter(
            Order.status != OrderStatus.CANCELLED,
            Order.created_at >= day_start,
            Order.created_at < day_end,
        )
    )
    if categories:
        query = query.filter(OrderItem.category.in_(categories))

    products_map: dict[str, dict] = {}
    categories_map: dict[str, float] = defaultdict(float)
    total = 0.0

    for item, _order in query.all():
        revenue = item.price * item.quantity
        total += revenue
        categories_map[item.category] += revenue
        if item.product_name not in products_map:
            products_map[item.product_name] = {
                "name": item.product_name,
                "category": item.category,
                "quantity": 0,
                "revenue": 0.0,
            }
        products_map[item.product_name]["quantity"] += item.quantity
        products_map[item.product_name]["revenue"] += revenue

    products = sorted(products_map.values(), key=lambda x: x["revenue"], reverse=True)
    for p in products:
        p["revenue"] = round(p["revenue"], 2)

    return {
        "date": day,
        "total": round(total, 2),
        "products": products,
        "categories": {k: round(v, 2) for k, v in categories_map.items()},
        "category_labels": {k: category_label(db, k) for k in categories_map},
    }


def get_sales_analytics(
    db: Session,
    days: int = 30,
    categories: Optional[list[str]] = None,
) -> dict:
    now = datetime.utcnow()
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    query = (
        db.query(OrderItem, Order)
        .join(Order)
        .filter(
            Order.created_at >= start,
            Order.status != OrderStatus.CANCELLED,
        )
    )

    if categories:
        query = query.filter(OrderItem.category.in_(categories))

    rows = query.all()

    daily: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "categories": defaultdict(float), "products": defaultdict(float)})
    category_totals: dict[str, float] = defaultdict(float)

    for item, order in rows:
        day = order.created_at.strftime("%Y-%m-%d")
        revenue = item.price * item.quantity
        cat = item.category or "other"
        daily[day]["total"] += revenue
        daily[day]["categories"][cat] += revenue
        daily[day]["products"][item.product_name] += revenue
        category_totals[cat] += revenue

    top5_cats = sorted(category_totals.keys(), key=lambda c: category_totals[c], reverse=True)[:5]

    result_days = []
    for i in range(days):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        entry = daily.get(d, {"total": 0.0, "categories": {}, "products": {}})
        day_data = {
            "date": d,
            "total": round(entry["total"], 2),
            "categories": {},
        }
        for cat in top5_cats:
            day_data["categories"][cat] = round(entry["categories"].get(cat, 0), 2)
        day_data["products"] = {k: round(v, 2) for k, v in entry["products"].items()}
        result_days.append(day_data)

    all_slugs = [c.slug for c in db.query(ProductCategory).filter(ProductCategory.is_active.is_(True)).order_by(ProductCategory.sort_order).all()]
    colors = get_category_colors(db)
    return {
        "days": result_days,
        "top_categories": top5_cats,
        "category_labels": {k: category_label(db, k) for k in top5_cats},
        "category_colors": {k: colors.get(k, "#D4C9B8") for k in top5_cats},
        "all_categories": all_slugs,
    }
