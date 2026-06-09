@echo off
chcp 65001 >nul
title Свежий урожай — база данных
cd /d "%~dp0"
python start.py --db
pause
