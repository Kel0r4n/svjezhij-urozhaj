from app.database import normalize_database_url


def test_normalize_postgres_url():
    assert normalize_database_url("postgres://u:p@host/db") == (
        "postgresql+psycopg://u:p@host/db"
    )


def test_normalize_postgresql_url():
    assert normalize_database_url("postgresql://u:p@host/db") == (
        "postgresql+psycopg://u:p@host/db"
    )


def test_sqlite_unchanged():
    assert normalize_database_url("sqlite:///./shop.db") == "sqlite:///./shop.db"
