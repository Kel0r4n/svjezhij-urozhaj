"""Запуск Alembic-миграций."""

from pathlib import Path

from alembic import command
from alembic.config import Config

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def run_migrations() -> None:
    ini_path = BACKEND_ROOT / "alembic.ini"
    if not ini_path.is_file():
        return
    cfg = Config(str(ini_path))
    cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    command.upgrade(cfg, "head")
