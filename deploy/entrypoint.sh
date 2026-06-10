#!/bin/sh
set -e

echo "[entrypoint] Запуск «Свежий урожай»..."

mkdir -p /app/data /app/uploads

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="sqlite:////app/data/shop.db"
  echo "[entrypoint] DATABASE_URL не задан — SQLite (пробный тариф без PostgreSQL)"
fi

if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "dev-secret-key-change-me" ]; then
  echo "[WARN] SECRET_KEY не задан или дефолтный — смените в панели RelaxDev!"
fi

echo "[entrypoint] Миграции БД (Alembic)..."
python -c "from app.migrate import run_migrations; run_migrations()" || echo "[WARN] Alembic не применён"

if [ "$RUN_SEED" = "1" ]; then
  echo "[entrypoint] Заполнение БД (RUN_SEED=1)..."
  python -c "from app.seed_db import run_seed; run_seed()"
else
  echo "[entrypoint] Пропуск seed (RUN_SEED не задан). Первый деплой: RUN_SEED=1"
fi

PORT="${PORT:-8000}"
echo "[entrypoint] uvicorn на порту $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
