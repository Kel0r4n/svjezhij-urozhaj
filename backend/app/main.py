import os
import re
from pathlib import Path
from contextlib import asynccontextmanager

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

logger = logging.getLogger(__name__)
from .database import Base, engine, settings
from .migrate import run_migrations
from .routers import admin, cart, categories, delivery, orders, products, users

APP_ROOT = Path(__file__).resolve().parent.parent
UPLOADS_DIR = APP_ROOT / "uploads"


def _resolve_frontend_dist() -> Path:
    for candidate in (APP_ROOT / "frontend" / "dist", APP_ROOT.parent / "frontend" / "dist"):
        if candidate.is_dir():
            return candidate
    return APP_ROOT / "frontend" / "dist"


FRONTEND_DIST = _resolve_frontend_dist()
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def serve_frontend_enabled() -> bool:
    val = os.getenv("SERVE_FRONTEND", "").strip().lower()
    return val in ("1", "true", "yes") and FRONTEND_DIST.is_dir()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        run_migrations()
    except Exception as exc:
        print(f"[WARN] Alembic migrations: {exc}")
    if serve_frontend_enabled():
        print(f"[OK] Публичный режим: сайт + API ({FRONTEND_DIST})")
    yield


app = FastAPI(title="Свежий урожай", version="2.0.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

if FRONTEND_DIST.is_dir():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend_assets")


@app.middleware("http")
async def strip_api_prefix(request: Request, call_next):
    """Фронтенд в проде ходит на /api/* (VITE_API_URL=/api) — всегда снимаем префикс."""
    path = request.scope["path"]
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:]
    return await call_next(request)

app.include_router(users.router)
app.include_router(users.profile_router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(delivery.router)
app.include_router(categories.router)


_API_PREFIXES = (
    "api", "admin", "users", "products", "orders", "cart", "delivery", "categories",
    "health", "docs", "openapi.json", "uploads", "auth",
)


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(_request: Request, exc: IntegrityError):
    logger.exception("IntegrityError: %s", exc)
    return JSONResponse(status_code=400, content={"detail": "Запись уже существует или данные некорректны"})


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(_request: Request, exc: SQLAlchemyError):
    logger.exception("SQLAlchemyError: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Ошибка базы данных"})


@app.exception_handler(ResponseValidationError)
async def response_validation_exception_handler(_request: Request, exc: ResponseValidationError):
    logger.exception("ResponseValidationError: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Ошибка формата ответа сервера"})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    messages = []
    for err in exc.errors():
        msg = err.get("msg", "Ошибка валидации")
        msg = re.sub(r"^Value error,\s*", "", msg, flags=re.IGNORECASE)
        messages.append(msg)
    return JSONResponse(status_code=422, content={"detail": messages[0] if len(messages) == 1 else messages})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    if serve_frontend_enabled():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {"message": "Свежий урожай API", "docs": "/docs"}


if FRONTEND_DIST.is_dir():

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if not serve_frontend_enabled():
            raise HTTPException(status_code=404, detail="Not Found")
        root = full_path.split("/")[0] if full_path else ""
        if root in _API_PREFIXES:
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
