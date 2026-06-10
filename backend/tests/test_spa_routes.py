"""SPA: обновление страницы /admin и других маршрутов React."""

import os

import pytest


@pytest.fixture
def spa_client(seeded_db):
    os.environ["SERVE_FRONTEND"] = "1"
    from fastapi.testclient import TestClient
    from app.main import app, FRONTEND_DIST

    if not FRONTEND_DIST.is_dir():
        pytest.skip("frontend/dist не собран")
    with TestClient(app) as client:
        yield client


@pytest.mark.parametrize("path", [
    "/admin",
    "/login",
    "/cart",
    "/orders",
    "/delivery-info",
    "/prices",
])
def test_spa_page_refresh_returns_html(spa_client, path):
    r = spa_client.get(path)
    assert r.status_code == 200, r.text
    assert "text/html" in r.headers.get("content-type", "")
    assert r.text.lstrip().startswith("<!") or "<html" in r.text.lower()


def test_spa_api_path_without_match_returns_json_404(spa_client):
    r = spa_client.get("/api/admin/no-such-endpoint")
    assert r.status_code == 404
    assert r.json()["detail"] == "Not Found"
