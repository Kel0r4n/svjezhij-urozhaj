"""Заполнение БД демо-данными (локально и на сервере)."""
from datetime import date, datetime, timedelta

from .auth import hash_password
from .database import Base, SessionLocal, engine, settings
from .models import (
    DeliveryAddress,
    DeliveryDate,
    DeliveryScheduleSlot,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    ProductCategory,
    User,
)

SEED_CATEGORIES = [
    ("fruits", "Фрукты", "#A8B5A0", 1),
    ("berry_hit", "Ягодный хит", "#D4A5A5", 2),
    ("mixes", "Выгодные миксы", "#D4C9B8", 3),
    ("berries", "Ягоды", "#9BB0C4", 4),
    ("vegetables", "Овощи", "#C4B89B", 5),
]

PRODUCTS = [
    ("cherry", "Черешня", 1600, "fruits", "Сочная свежая черешня", 40, "#E8B4B8"),
    ("strawberry", "Клубника", 1050, "fruits", "Сладкая ароматная клубника", 35, "#F4A6A6"),
    ("nectarine", "Нектарин", 1200, "fruits", "Спелый нектарин", 30, "#FFD4A3"),
    ("apricot", "Абрикос", 1000, "fruits", "Мягкий сочный абрикос", 28, "#FFCBA4"),
    ("peach", "Инжирный персик", 1200, "fruits", "Нежный инжирный персик", 25, "#FFE4C4"),
    ("pear", "Груша Форель", 800, "fruits", "Груша сорта Форель", 32, "#D4E8C4"),
    ("berry_hit", "Ягодный хит (2 кг черешни + 2 кг клубники)", 2500, "berry_hit", "Набор 4 кг", 20, "#D4A5A5"),
    ("fruit_mix", "Фруктовый микс", 2000, "mixes", "Микс фруктов, 4 кг", 18, "#C4D4A8"),
    ("veg_mix", "Овощной микс", 999, "mixes", "Овощной микс, 4 кг", 22, "#B8C9A0"),
    ("blueberry", "Голубика (3 кг)", 5000, "berries", "Свежая голубика, 3 кг", 15, "#9BB0C4"),
    ("tomato", "Томаты Мохитос (2 кг)", 800, "vegetables", "Томаты, 2 кг", 30, "#E8A090"),
    ("pepper", "Перец (2 кг)", 500, "vegetables", "Сладкий перец, 2 кг", 35, "#C4D4A8"),
    ("eggplant", "Баклажаны (2 кг)", 400, "vegetables", "Баклажаны, 2 кг", 25, "#9B8EC4"),
    ("cucumber", "Огурцы (2 кг)", 400, "vegetables", "Огурцы, 2 кг", 40, "#A8D4A8"),
]


def run_seed(*, reset: bool = False) -> bool:
    """Возвращает True, если данные были добавлены."""
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if not reset and db.query(User).first():
        db.close()
        return False

    try:
        admin = User(
            first_name="Админ",
            last_name="Системы",
            patronymic=None,
            phone="+79001234567",
            email="admin@example.com",
            hashed_password=hash_password("admin123"),
            is_admin=True,
        )
        user = User(
            first_name="Иван",
            last_name="Петров",
            patronymic="Сергеевич",
            phone="+79007654321",
            email="user@example.com",
            telegram_username="ivan_petrov",
            hashed_password=hash_password("user123"),
            is_admin=False,
        )
        db.add_all([admin, user])
        db.commit()
        db.refresh(admin)
        db.refresh(user)

        addresses = [
            "г. Москва, ул. Садовая, д. 12",
            "г. Москва, пр. Мира, д. 45, подъезд 2",
            "г. Химки, ул. Ленина, д. 8",
        ]
        addr_rows = []
        for a in addresses:
            row = DeliveryAddress(address=a)
            db.add(row)
            addr_rows.append(row)
        db.commit()
        for row in addr_rows:
            db.refresh(row)

        today = date.today()
        route_day = today + timedelta(days=3)
        for i, row in enumerate(addr_rows):
            db.add(DeliveryScheduleSlot(
                delivery_address_id=row.id,
                slot_date=route_day,
                delivery_time=f"{18 + i}:00",
            ))
        db.commit()

        today = date.today()
        for i in range(1, 8):
            db.add(DeliveryDate(delivery_date=today + timedelta(days=i)))
        db.commit()

        for slug, label, chart_color, sort_order in SEED_CATEGORIES:
            db.add(ProductCategory(slug=slug, label=label, chart_color=chart_color, sort_order=sort_order))
        db.commit()

        products = []
        for _slug, name, price, cat, desc, stock, color in PRODUCTS:
            p = Product(
                name=name,
                price=price,
                category=cat,
                description=desc,
                stock=stock,
                image_url=None,
                image_bg_color=color,
                is_active=True,
            )
            db.add(p)
            products.append(p)
        db.commit()
        for p in products:
            db.refresh(p)

        by_name = {p.name: p for p in products}
        now = datetime.utcnow()
        addr = addresses[0]
        demo = [
            (0, OrderStatus.DELIVERED, [(by_name["Черешня"], 2), (by_name["Клубника"], 1)]),
            (1, OrderStatus.DELIVERED, [(by_name["Ягодный хит (2 кг черешни + 2 кг клубники)"], 1)]),
            (2, OrderStatus.CONFIRMED, [(by_name["Голубика (3 кг)"], 1)]),
            (3, OrderStatus.DELIVERED, [(by_name["Фруктовый микс"], 1), (by_name["Овощной микс"], 1)]),
            (5, OrderStatus.DELIVERED, [(by_name["Нектарин"], 2), (by_name["Перец (2 кг)"], 2)]),
            (7, OrderStatus.CREATED, [(by_name["Абрикос"], 2)]),
        ]

        ddates = db.query(DeliveryDate).all()
        for days_ago, status, items in demo:
            total = sum(p.price * q for p, q in items)
            created = now - timedelta(days=days_ago)
            dslot = ddates[days_ago % len(ddates)]
            order = Order(
                user_id=user.id,
                status=status,
                address=addr,
                delivery_address_id=1,
                delivery_date_id=dslot.id,
                delivery_date=dslot.delivery_date,
                total=total,
                created_at=created,
            )
            db.add(order)
            db.flush()
            for product, qty in items:
                db.add(
                    OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        product_name=product.name,
                        category=product.category,
                        price=product.price,
                        quantity=qty,
                    )
                )

        db.commit()
        print("[OK] Seed completed!")
        print("   Admin: +79001234567 / admin123  (email: admin@example.com)")
        print("   User:  +79007654321 / user123")
        print(f"   Products: {len(products)}")
        print(f"   Database: {settings.database_url}")
        return True
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()
