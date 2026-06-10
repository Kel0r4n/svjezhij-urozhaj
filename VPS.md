# Деплой на VPS (VDS) с CI/CD

Подходит для **[OneDash](https://rdp-onedash.ru/)**, FirstVDS, Timeweb, REG.RU и любого VPS с Ubuntu + Docker.

На сервере: **сайт + API + PostgreSQL** в Docker. База и картинки **не пропадают** при обновлении кода.

---

## Что купить на OneDash (rdp-onedash.ru)

| Параметр | Рекомендация |
|----------|----------------|
| Тип | **VPS** (не RDP — RDP для удалённого рабочего стола Windows) |
| ОС | **Ubuntu 22.04** (оптимально) или **24.04**. **Не берите 18** — устарела |
| CPU | 2 ядра |
| RAM | **2 ГБ** минимум, лучше **4 ГБ** (сборка Docker + PostgreSQL) |
| Диск | 20+ ГБ |
| IP | выделенный IPv4 (обычно в тарифе) |

После оплаты в личном кабинете OneDash придут **IP**, **логин** (часто `root`) и **пароль** для SSH.

Docker ставится одной командой (см. ниже) — образ «Docker» в маркетплейсе не обязателен.

---

## Часть 1. Первичная настройка сервера (один раз)

Подключитесь по SSH (логин/пароль из письма хостера):

```bash
ssh root@IP_ВАШЕГО_СЕРВЕРА
```

### 1.1. Docker

```bash
apt update && apt upgrade -y
apt install -y git curl
curl -fsSL https://get.docker.com | sh
```

### 1.2. Клонировать проект

```bash
mkdir -p /opt/svjezhij-urozhaj
cd /opt/svjezhij-urozhaj
git clone https://github.com/Kel0r4n/svjezhij-urozhaj.git .
```

(Замените URL на ваш репозиторий.)

### 1.3. Переменные окружения

```bash
cp deploy/vps.env.example .env
nano .env
```

Обязательно смените:

- `POSTGRES_PASSWORD`
- `SECRET_KEY`
- `DOMAIN` — ваш домен, например `shop.example.ru`  
  Для первого теста **только по IP** без SSL: `DOMAIN=:80`

Первый запуск: `RUN_SEED=1`. После успешного старта поставьте `RUN_SEED=0`.

### 1.4. Запуск

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

Первый раз сборка **10–20 минут**.

Проверка:

```bash
docker compose -f docker-compose.vps.yml ps
curl -s http://localhost/health
```

Откройте в браузере: `http://IP_СЕРВЕРА` (или `https://ваш-домен.ru`).

Вход админа (если был seed): `+79001234567` / `admin123`.

### 1.5. Домен (по желанию)

У регистратора домена:

- тип **A** → IP вашего VPS

В `.env`: `DOMAIN=ваш-домен.ru`, затем:

```bash
docker compose -f docker-compose.vps.yml up -d
```

Caddy сам получит SSL (Let's Encrypt).

### 1.6. Фаервол

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

---

## Часть 2. CI/CD (автодеплой из GitHub)

После настройки каждый `git push` в `main` обновляет сервер.

### 2.1. SSH-ключ для деплоя

**На своём компьютере** (PowerShell):

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\vps_deploy -N '""'
```

Публичный ключ на сервер:

```bash
# на VPS
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# вставьте содержимое файла vps_deploy.pub с компьютера
chmod 600 ~/.ssh/authorized_keys
```

(Или создайте отдельного пользователя `deploy` вместо root — безопаснее.)

### 2.2. Секреты в GitHub

Репозиторий → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Секрет | Значение |
|--------|----------|
| `VPS_HOST` | `89.125.121.37` или ваш домен |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | содержимое `vps_deploy` (приватный ключ, весь файл) |
| `VPS_APP_PATH` | `/opt/svjezhij-urozhaj` |
| `VPS_PORT` | `22` (опционально, если SSH не стандартный) |

### 2.3. Как это работает

Файл `.github/workflows/deploy-vps.yml`:

1. Вы делаете `git push` в `main`
2. GitHub Actions подключается к VPS по SSH
3. `git pull` + `docker compose up -d --build`
4. **PostgreSQL и uploads не трогаются** — данные сохраняются

Ручной запуск: GitHub → **Actions** → **Deploy to VPS** → **Run workflow**.

---

## Часть 3. Обновление вручную (без CI/CD)

```bash
ssh root@IP_СЕРВЕРА
cd /opt/svjezhij-urozhaj
git pull
docker compose -f docker-compose.vps.yml up -d --build
```

---

## Сравнение с RelaxDev

| | RelaxDev (пробный) | VPS |
|--|-------------------|-----|
| База при redeploy | часто сбрасывается (SQLite) | **сохраняется** (PostgreSQL + volume) |
| Картинки | могут пропадать | **volume uploads** |
| Настройка | проще | дольше первый раз |
| Цена | пробный / тарифы | ~300–600 ₽/мес |
| CI/CD | автодеплой из Git | GitHub Actions (настроили выше) |

---

## Файлы в репозитории

| Файл | Назначение |
|------|------------|
| `docker-compose.vps.yml` | PostgreSQL + приложение + Caddy (HTTPS) |
| `deploy/vps.env.example` | шаблон `.env` на сервере |
| `deploy/Caddyfile` | reverse proxy и SSL |
| `.github/workflows/deploy-vps.yml` | CI/CD |
| `Dockerfile` | сборка фронта и бэкенда |

---

## Если что-то не работает

```bash
docker compose -f docker-compose.vps.yml logs -f app
docker compose -f docker-compose.vps.yml logs -f db
```

Частые причины:

- не создан `.env` или слабый пароль не задан
- порт 80 занят — остановите другой веб-сервер
- домен не указывает на IP — SSL не выпустится
