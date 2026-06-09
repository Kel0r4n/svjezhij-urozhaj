#!/usr/bin/env python3
"""Запуск backend, frontend и опционально просмотр БД.

  python start.py       — сайт на http://localhost:3000
  python start.py --db  — только просмотр SQLite в браузере
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
DB_FILE = BACKEND / "shop.db"
IS_WINDOWS = sys.platform == "win32"

VENV_BIN = BACKEND / "venv" / ("Scripts" if IS_WINDOWS else "bin")
UVICORN = VENV_BIN / ("uvicorn.exe" if IS_WINDOWS else "uvicorn")
SQLITE_WEB = VENV_BIN / ("sqlite_web.exe" if IS_WINDOWS else "sqlite_web")


def check_setup():
    if not UVICORN.exists():
        print("[ERROR] Backend venv not found.")
        print("  cd backend && python -m venv venv && pip install -r requirements.txt")
        sys.exit(1)
    if not (FRONTEND / "node_modules").exists():
        print("Installing frontend dependencies...")
        subprocess.run(["npm", "install"], cwd=FRONTEND, shell=IS_WINDOWS, check=True)


def start_window(title: str, cmd: str, cwd: Path):
    if IS_WINDOWS:
        subprocess.Popen(f'start "{title}" cmd /k "{cmd}"', cwd=cwd, shell=True)
    else:
        subprocess.Popen(cmd, cwd=cwd, shell=True)


def start_db_viewer():
    if not SQLITE_WEB.exists():
        print("[WARN] sqlite_web not installed. Run: pip install -r requirements.txt")
        return
    if not DB_FILE.exists():
        print(f"[WARN] Database not found: {DB_FILE}")
        print("  Run: python seed.py")
        return
    cmd = (
        r"venv\Scripts\sqlite_web shop.db -H 127.0.0.1 -p 8080"
        if IS_WINDOWS
        else "./venv/bin/sqlite_web shop.db -H 127.0.0.1 -p 8080"
    )
    print("Starting DB viewer  -> http://127.0.0.1:8080")
    start_window("Soft Shop - DB", cmd, BACKEND)


def start_app(with_db: bool):
    check_setup()

    backend_cmd = (
        r"venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
        if IS_WINDOWS
        else "./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
    )

    print("Starting backend  -> http://127.0.0.1:8000")
    start_window("Soft Shop - Backend", backend_cmd, BACKEND)
    time.sleep(1)

    print("Starting frontend -> http://localhost:3000")
    start_window("Soft Shop - Frontend", "npm start", FRONTEND)

    if with_db:
        time.sleep(0.5)
        start_db_viewer()

    print("\n" + "=" * 48)
    print("  Сайт:         http://localhost:3000")
    print("  API:          http://localhost:8000/docs")
    if with_db:
        print("  База данных:  http://127.0.0.1:8080")
    print("=" * 48)


def main():
    parser = argparse.ArgumentParser(description="Запуск магазина «Свежий урожай»")
    parser.add_argument(
        "--db",
        action="store_true",
        help="только веб-просмотр SQLite (http://127.0.0.1:8080)",
    )
    args = parser.parse_args()

    if args.db:
        check_setup()
        start_db_viewer()
        print("\nОткройте http://127.0.0.1:8080 в браузере.")
        return

    start_app(with_db=True)


if __name__ == "__main__":
    main()
