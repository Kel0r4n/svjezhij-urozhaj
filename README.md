# 🍒 Свежий урожай — интернет-магазин

Интернет-магазин фруктов и овощей. FastAPI + React + SQLite.

## Технологии

- **Backend:** Python, FastAPI, SQLAlchemy, JWT
- **Frontend:** React, TailwindCSS, Vite, Recharts
- **БД:** SQLite

## Быстрый старт

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Тестовые данные

Из корня проекта:

```bash
python seed.py
```

Создаст:
- **Админ:** `admin@example.com` / `admin123`
- **Пользователь:** `user@example.com` / `user123`
- 14 товаров с категориями и 8 демо-заказов

### 3. Запуск

**Одной командой:**

```bash
start.bat
```

или `python start.py`

**По отдельности:**

```bash
# Backend
cd backend && uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm start
```

- Сайт: http://localhost:3000
- API: http://localhost:8000/docs

## Категории товаров

| Ключ | Название |
|------|----------|
| fruits | Фрукты |
| berry_hit | Ягодный хит |
| mixes | Выгодные миксы |
| berries | Ягоды |
| vegetables | Овощи |

## Админ-дашборд

- Продажи по дням (график с линией «Итого» и заливкой топ-5 категорий)
- Фильтры по периоду, категориям и товарам
- Управление товарами, заказами, пользователями, складом

## Структура

```
project/
├── backend/app/     — API
├── frontend/src/    — React
├── seed.py          — тестовые данные
├── start.bat        — запуск всего
└── README.md
```
