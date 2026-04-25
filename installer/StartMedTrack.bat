@echo off
title MedTrack - Starting...
cd /d "%~dp0.."

echo Starting MedTrack backend...
start /MIN "MedTrack API" cmd /c "cd backend && node src/server.js"
timeout /t 4 /nobreak >nul

echo Starting MedTrack frontend...
start /MIN "MedTrack UI" cmd /c "cd frontend && npm start"
timeout /t 8 /nobreak >nul

start http://localhost:3000
echo MedTrack is running at http://localhost:3000
echo Close this window to keep it running in background.
pause
