# Миграции БД (Alembic)

## Автоматически

При старте API и в Docker entrypoint выполняется `alembic upgrade head`.

## Первый раз на существующей БД (уже есть таблицы)

На сервере один раз:

```bash
docker compose -f docker-compose.vps.yml exec app alembic stamp 001
docker compose -f docker-compose.vps.yml exec app alembic upgrade head
```

## Локально

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

## Новая миграция

```bash
cd backend
alembic revision -m "описание"
# отредактировать alembic/versions/...
alembic upgrade head
```
