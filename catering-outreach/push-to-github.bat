@echo off
REM Push outreach-app to YOUR GitHub (apexwebworxusa-svg/outreach-app)
REM Run this AFTER creating an empty repo at https://github.com/new?name=outreach-app

echo.
echo Pushing to https://github.com/apexwebworxusa-svg/outreach-app
echo.

git remote remove outreach-origin 2>nul
git remote add outreach-origin https://github.com/apexwebworxusa-svg/outreach-app.git
git push -u outreach-origin HEAD:main

if errorlevel 1 (
    echo.
    echo Push failed. Make sure:
    echo   1. Repo exists: https://github.com/apexwebworxusa-svg/outreach-app
    echo   2. You are logged into GitHub on this PC
    echo   3. You created the repo EMPTY ^(no README^)
    echo.
    pause
    exit /b 1
)

echo.
echo Done! Your app is at:
echo https://github.com/apexwebworxusa-svg/outreach-app
echo.
pause
