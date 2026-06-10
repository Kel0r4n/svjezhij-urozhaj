import re
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional

HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
SLUG_RE = re.compile(r"^[a-z0-9_]+$")
PHONE_RE = re.compile(r"^\+?[0-9\s\-()]{10,20}$")


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value.strip())
    if digits.startswith("8"):
        digits = "7" + digits[1:]
    elif not digits.startswith("7"):
        digits = "7" + digits
    if len(digits) != 11:
        raise ValueError("Введите полный номер: +7 и 10 цифр")
    return f"+{digits}"


def clean_pydantic_msg(msg: str) -> str:
    return re.sub(r"^Value error,\s*", "", msg, flags=re.IGNORECASE)


# --- Auth ---
class UserRegister(BaseModel):
    first_name: str = Field(min_length=1, max_length=128)
    last_name: str = Field(min_length=1, max_length=128)
    patronymic: Optional[str] = Field(default=None, max_length=128)
    phone: str = Field(min_length=10, max_length=32)
    email: Optional[EmailStr] = None
    password: str = Field(min_length=6, max_length=128)

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        return normalize_phone(v)


class UserLogin(BaseModel):
    login: str = Field(min_length=3, max_length=255)
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    login: str = Field(min_length=3, max_length=255)


class ForgotPasswordResponse(BaseModel):
    message: str
    new_password: Optional[str] = None


# --- User ---
class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    patronymic: Optional[str] = Field(default=None, max_length=128)
    phone: Optional[str] = Field(default=None, min_length=10, max_length=32)
    email: Optional[EmailStr] = None
    telegram_username: Optional[str] = Field(default=None, max_length=64)

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return normalize_phone(v)

    @field_validator("telegram_username")
    @classmethod
    def clean_tg(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        return v.strip().lstrip("@")


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    patronymic: Optional[str]
    phone: str
    email: Optional[str]
    telegram_username: Optional[str]
    is_admin: bool
    full_name: str
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def add_full_name(cls, data):
        if hasattr(data, "full_name"):
            return {
                "id": data.id,
                "first_name": data.first_name,
                "last_name": data.last_name,
                "patronymic": data.patronymic,
                "phone": data.phone,
                "email": data.email,
                "telegram_username": data.telegram_username,
                "is_admin": data.is_admin,
                "full_name": data.full_name,
                "created_at": data.created_at,
            }
        return data


# --- Delivery ---
class DeliveryAddressCreate(BaseModel):
    address: str = Field(min_length=5, max_length=512)


class DeliveryAddressResponse(BaseModel):
    id: int
    address: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DeliveryAddressPublicResponse(DeliveryAddressResponse):
    next_delivery_date: Optional[date] = None
    next_delivery_time: Optional[str] = None
    next_delivery_weekday: Optional[str] = None
    delivery_notice: Optional[str] = None


class DeliveryScheduleSlotCreate(BaseModel):
    delivery_address_id: int
    slot_date: date
    delivery_time: str = Field(pattern=r"^\d{1,2}:\d{2}$")


class DeliveryScheduleSlotResponse(BaseModel):
    id: int
    delivery_address_id: int
    slot_date: date
    delivery_time: str
    is_active: bool

    model_config = {"from_attributes": True}


class ScheduleImportRequest(BaseModel):
    route_date: date
    text: str = Field(min_length=3)


class DeliveryUpcomingSlot(BaseModel):
    date: date
    time: str
    weekday_label: str
    notice: Optional[str] = None


class DeliveryRouteStop(BaseModel):
    time: str
    address: str
    orders_count: int
    items_count: int


class DeliveryRouteResponse(BaseModel):
    date: date
    stops: list[DeliveryRouteStop]


class DeliveryExceptionCreate(BaseModel):
    exception_date: date
    action: str = Field(pattern=r"^(postponed|cancelled)$")
    new_date: Optional[date] = None
    message: str = Field(default="", max_length=2000)
    address_ids: list[int] = Field(min_length=1)


class DeliveryExceptionResponse(BaseModel):
    id: int
    exception_date: date
    action: str
    new_date: Optional[date]
    message: str
    is_active: bool
    address_ids: list[int] = []

    model_config = {"from_attributes": True}


class DeliveryNextResponse(BaseModel):
    delivery_date: date
    delivery_time: Optional[str]
    weekday_label: str
    notice: Optional[str]
    delivery_date_id: int


class DeliveryDateCreate(BaseModel):
    delivery_date: date

    @field_validator("delivery_date")
    @classmethod
    def must_be_future(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Дата доставки должна быть в будущем")
        return v


class DeliveryDateResponse(BaseModel):
    id: int
    delivery_date: date
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Category ---
class CategoryCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=64)
    label: str = Field(min_length=1, max_length=128)
    chart_color: str = Field(default="#A8B5A0")
    sort_order: int = Field(default=0, ge=0)

    @field_validator("slug")
    @classmethod
    def valid_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not SLUG_RE.match(v):
            raise ValueError("Код категории: латиница, цифры и _")
        return v

    @field_validator("chart_color")
    @classmethod
    def valid_color(cls, v: str) -> str:
        if not HEX_COLOR_RE.match(v):
            raise ValueError("Укажите цвет в формате #RRGGBB")
        return v


class CategoryUpdate(BaseModel):
    label: Optional[str] = Field(default=None, min_length=1, max_length=128)
    chart_color: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = Field(default=None, ge=0)

    @field_validator("chart_color")
    @classmethod
    def valid_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not HEX_COLOR_RE.match(v):
            raise ValueError("Укажите цвет в формате #RRGGBB")
        return v


class CategoryResponse(BaseModel):
    id: int
    slug: str
    label: str
    chart_color: str
    is_active: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Product ---
class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    price: float = Field(gt=0)
    description: str = ""
    category: str = Field(min_length=2, max_length=64)
    stock: int = Field(ge=0)
    is_active: bool = True
    image_bg_color: str = Field(default="#E6E0D4")
    image_zoom: float = Field(default=1.0, ge=0.5, le=4.0)
    image_pan_x: float = Field(default=0.0, ge=-100.0, le=100.0)
    image_pan_y: float = Field(default=0.0, ge=-100.0, le=100.0)

    @field_validator("image_bg_color")
    @classmethod
    def valid_bg(cls, v: str) -> str:
        if not HEX_COLOR_RE.match(v):
            raise ValueError("Укажите цвет фона в формате #RRGGBB")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    price: Optional[float] = Field(default=None, gt=0)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, min_length=2, max_length=64)
    stock: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    image_bg_color: Optional[str] = None
    image_zoom: Optional[float] = Field(default=None, ge=0.5, le=4.0)
    image_pan_x: Optional[float] = Field(default=None, ge=-100.0, le=100.0)
    image_pan_y: Optional[float] = Field(default=None, ge=-100.0, le=100.0)

    @field_validator("image_bg_color")
    @classmethod
    def valid_bg(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not HEX_COLOR_RE.match(v):
            raise ValueError("Укажите цвет фона в формате #RRGGBB")
        return v


class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    description: str
    category: str
    stock: int
    image_url: Optional[str]
    image_bg_color: str
    image_zoom: float
    image_pan_x: float
    image_pan_y: float
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Cart ---
class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductResponse

    model_config = {"from_attributes": True}


class CartSyncItem(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class CartSyncRequest(BaseModel):
    items: list[CartSyncItem]


# --- Order ---
class OrderCreate(BaseModel):
    delivery_address_id: int
    delivery_date_id: Optional[int] = None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    category: str
    price: float
    quantity: int

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: int
    user_id: int
    status: str
    address: str
    delivery_date: date
    total: float
    created_at: datetime
    items: list[OrderItemResponse]

    model_config = {"from_attributes": True}


class AdminOrderResponse(OrderResponse):
    user_name: str
    user_phone: str


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    pages: int


class AdminOrderListResponse(BaseModel):
    items: list[AdminOrderResponse]
    total: int
    page: int
    pages: int


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(created|confirmed|in_transit|delivered|cancelled)$")


# --- Admin ---
class StockUpdateItem(BaseModel):
    product_id: int
    stock: int = Field(ge=0)


class StockBulkUpdateRequest(BaseModel):
    items: list[StockUpdateItem]


class DashboardStats(BaseModel):
    orders_today: int
    orders_week: int
    total_revenue: float
    top_products: list[dict]


class AdminUserResponse(BaseModel):
    id: int
    email: Optional[str]
    phone: str
    first_name: str
    last_name: str
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=5000)
    price: Optional[float] = Field(default=None, ge=0)


class UserEventResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    price: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserDetailResponse(AdminUserResponse):
    patronymic: Optional[str] = None
    orders: list[AdminOrderResponse] = []
    orders_count: int = 0
    orders_total: float = 0
    events: list[UserEventResponse] = []


class DeliveryManifestRow(BaseModel):
    contact: str
    phone: str
    product: str
    price: float
    quantity: int
    address: str


class DeliveryManifestResponse(BaseModel):
    date: date
    rows: list[DeliveryManifestRow]
    total_rows: int


class SalesDayData(BaseModel):
    date: str
    total: float
    categories: dict[str, float]
    products: dict[str, float]


class SalesAnalyticsResponse(BaseModel):
    days: list[SalesDayData]
    top_categories: list[str]
    category_labels: dict[str, str]
    category_colors: dict[str, str]
    all_categories: list[str]


class DayDetailProduct(BaseModel):
    name: str
    category: str
    quantity: int
    revenue: float


class DayDetailResponse(BaseModel):
    date: str
    total: float
    products: list[DayDetailProduct]
    categories: dict[str, float]
    category_labels: dict[str, str]
