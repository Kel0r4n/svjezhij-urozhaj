# Сборка для RelaxDev / Docker: сайт + API в одном контейнере
# --- Frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Один домен: API через /api (proxy внутри FastAPI)
ENV VITE_API_URL=/api
RUN npm run build

# --- Backend ---
FROM python:3.12-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-build /build/frontend/dist ./frontend/dist
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p uploads data

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV SERVE_FRONTEND=1

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
