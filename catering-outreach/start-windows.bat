@echo off
REM Quick start for Windows PC
echo Catering Outreach - Windows Setup
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found. Install from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH"
    pause
    exit /b 1
)

if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat
pip install -r requirements.txt

if not exist .env (
    copy .env.example .env
    echo.
    echo Created .env - edit it with your API keys and email settings.
    echo.
)

echo.
echo Starting dashboard at http://127.0.0.1:5000
echo Press Ctrl+C to stop.
echo.
python main.py web
pause
