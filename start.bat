@echo off
chcp 65001 >nul
title Свежий урожай — запуск
cd /d "%~dp0"

if not exist "backend\venv\Scripts\uvicorn.exe" (
    echo [ERROR] Backend venv not found. Run first:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

python start.py
pause
