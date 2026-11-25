@echo off
title Goethe B1 Monitor
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ install karein: https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing app packages...
  call npm install
  if errorlevel 1 pause & exit /b 1
  call npx playwright install chromium
)
start "" http://localhost:3000
call npm start
pause
