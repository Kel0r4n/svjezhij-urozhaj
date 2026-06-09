import os

# Тесты API — без раздачи SPA (иначе GET / вернёт HTML)
os.environ.pop("SERVE_FRONTEND", None)

import pytest
from fastapi.testclient import TestClient

from app.main import app as api


@pytest.fixture
def client():
    """Smoke-тесты против локальной shop.db (таблицы создаёт lifespan)."""
    with TestClient(api) as test_client:
        yield test_client
