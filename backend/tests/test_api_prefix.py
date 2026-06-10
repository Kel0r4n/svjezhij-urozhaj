"""Запросы с префиксом /api (как в Docker/VITE_API_URL=/api)."""

import os

import pytest


@pytest.fixture
def api_client(seeded_db):
    """Клиент с SERVE_FRONTEND=0 — префикс /api всё равно должен работать."""
    prev = os.environ.pop("SERVE_FRONTEND", None)
    try:
        from fastapi.testclient import TestClient
        from app.main import app

        with TestClient(app) as client:
            yield client
    finally:
        if prev is not None:
            os.environ["SERVE_FRONTEND"] = prev


def _admin_token(client):
    r = client.post("/api/auth/login", json={"login": "+79001234567", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_api_prefix_health(api_client):
    assert api_client.get("/api/health").status_code == 200


def test_api_prefix_public_categories(api_client):
    r = api_client.get("/api/categories")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_api_prefix_admin_dashboard(api_client):
    token = _admin_token(api_client)
    r = api_client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    assert "orders_today" in r.json()


def test_api_prefix_admin_create_category(api_client):
    token = _admin_token(api_client)
    r = api_client.post(
        "/api/admin/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"slug": "api_test", "label": "API тест", "chart_color": "#AABBCC"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["slug"] == "api_test"
