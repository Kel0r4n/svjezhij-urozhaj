# Деплой «Свежий урожай»

Стек: **React (Vite)** + **FastAPI** + **PostgreSQL** + загрузка файлов (`uploads/`).

## Рекомендуемая схема: RelaxDev (всё в одном)

**Сайт + API + PostgreSQL** на [RelaxDev](https://relaxdev.ru/) — один Docker-проект, одна ссылка.

Порядок: **сначала проект из GitHub** → **потом PostgreSQL во вкладке «База данных» внутри проекта** → редеплой.

Пошаговая инструкция: **[RELAXDEV.md](./RELAXDEV.md)**

| Файл | Назначение |
|------|------------|
| `Dockerfile` | сборка фронта и бэкенда |
| `deploy/entrypoint.sh` | старт и seed |
| `deploy/relaxdev.env.example` | переменные для панели |

---

## Альтернатива: ONREZA + VPS

| Часть | Где | Почему |
|-------|-----|--------|
| Сайт (HTML/JS) | [ONREZA](https://onreza.ru/) — бесплатный static | CDN в РФ, деплой из Git |
| API (FastAPI) | VPS или [Amvera](https://amvera.ru/) | ONREZA PROCESS — Node/Bun, Python там не запускается |
| База | ONREZA PostgreSQL **или** Postgres на VPS | SQLite только для локальной разработки |

Если ONREZA Postgres недоступен с VPS снаружи — проще **всё на VPS** через `docker-compose.prod.yml` (~300 ₽/мес).

---

## 1. Локально с PostgreSQL

```bash
docker compose up -d db
```

Скопируйте `.env.example` → `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://shop:shop@localhost:5432/shop
SECRET_KEY=ваш-секрет
```

```bash
cd backend && pip install -r requirements.txt
cd .. && python seed.py --reset
python start.py
```

Сайт: http://localhost:3000

---

## 2. ONREZA — фронтенд

1. Регистрация на [onreza.ru](https://onreza.ru/)
2. Установите CLI: см. [nrz-cli](https://github.com/ONREZA/nrz-cli)
3. В панели создайте **Managed PostgreSQL** (бесплатный план) — сохраните `DATABASE_URL`
4. В каталоге `frontend/`:

```bash
npm ci
nrz init
nrz env set VITE_API_URL "https://ваш-api-домен.ru" --plain
nrz deploy --prod
```

`VITE_API_URL` — публичный URL бэкенда, например `https://api.ваш-домен.ru` (запросы пойдут на `/products`, `/auth/...` и т.д.).

---

## 3. API на VPS (запасной и надёжный вариант)

На сервере (Ubuntu):

```bash
git clone <ваш-репозиторий>
cd Project
cp .env.example .env   # задайте SECRET_KEY, POSTGRES_PASSWORD, CORS_ORIGINS
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api python -c "
import sys; sys.path.insert(0,'/app');
# seed с хоста проще:
"
```

С хоста (после поднятия контейнеров):

```bash
# DATABASE_URL в .env для seed с машины разработчика
set DATABASE_URL=postgresql+psycopg://shop:ПАРОЛЬ@IP_СЕРВЕРА:5432/shop
python seed.py --reset
```

В `CORS_ORIGINS` укажите URL фронта с ONREZA, например `https://ваш-проект.onreza.ru`.

Откройте порт **8000** в фаерволе или поставьте nginx с HTTPS.

---

## 4. Альтернативы (РФ, оплата в рублях)

| Сервис | Цена | Для чего |
|--------|------|----------|
| [ONREZA](https://onreza.ru/) | бесплатный план | фронт + PostgreSQL |
| [Amvera](https://amvera.ru/) | ~111 ₽ старт, от ~170 ₽/мес | FastAPI из Git |
| [Timeweb Cloud](https://timeweb.cloud/) | от ~200 ₽/мес | VPS, всё в одном |
| [REG.RU VPS](https://www.reg.ru/vps/) | от ~300 ₽/мес | VPS |

---

## Переменные окружения

| Переменная | Где | Описание |
|------------|-----|----------|
| `DATABASE_URL` | backend | `sqlite:///./shop.db` или `postgresql+psycopg://...` |
| `SECRET_KEY` | backend | JWT, обязательно сменить на проде |
| `CORS_ORIGINS` | backend | URL фронта через запятую |
| `VITE_API_URL` | frontend build | Базовый URL API, напр. `https://api.example.com` |

---

## Загрузки изображений

На VPS папка `uploads/` в volume (см. `docker-compose.prod.yml`). На serverless/PaaS без диска — позже подключить S3-совместимое хранилище (Selectel, Timeweb).
