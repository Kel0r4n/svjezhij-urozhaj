import os
from pathlib import Path

# Файловая SQLite (in-memory теряет данные между соединениями TestClient)
_test_db = Path(__file__).resolve().parent / "_pytest.db"
if _test_db.exists():
    _test_db.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db.as_posix()}"
os.environ.pop("SERVE_FRONTEND", None)

import pytest
from fastapi.testclient import TestClient

from app.main import app as api
from app.seed_db import run_seed


@pytest.fixture(scope="session")
def seeded_db():
    run_seed(reset=True)
    yield


@pytest.fixture
def client(seeded_db):
    with TestClient(api) as test_client:
        yield test_client


@pytest.fixture
def admin_headers(client):
    r = client.post("/api/auth/login", json={"login": "+79001234567", "password": "admin123"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
