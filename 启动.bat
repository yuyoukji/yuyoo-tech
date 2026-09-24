@echo off
chcp 65001 >nul
cd /d "%~dp0"
start python -m http.server 8899
timeout /t 2 /nobreak >nul
start http://localhost:8899/index.html
