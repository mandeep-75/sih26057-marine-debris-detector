@echo off
setlocal
cd /d "%~dp0"
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
)
start "mdeb-api" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
cd frontend
call npm run dev