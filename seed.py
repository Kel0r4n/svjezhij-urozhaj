"""Seed script. Run from project root: python seed.py [--reset]"""
import argparse
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent / "backend"
os.chdir(backend_dir)
sys.path.insert(0, str(backend_dir))

from app.seed_db import run_seed

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Заполнение БД тестовыми данными")
    parser.add_argument("--reset", action="store_true", help="удалить все таблицы и заново заполнить")
    args = parser.parse_args()
    if not run_seed(reset=args.reset) and not args.reset:
        print("[i] База уже содержит данные. Для пересоздания: python seed.py --reset")
