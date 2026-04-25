@echo off
title MedTrack Updater
cd /d "%~dp0.."
echo Stopping MedTrack...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5000 "') do taskkill /PID %%p /F >nul 2>&1
echo Backing up settings...
copy backend\.env backend\.env.backup >nul
echo Updating packages...
cd backend && call npm install --production --silent && cd ..\frontend && call npm install --legacy-peer-deps --silent && cd ..
echo Running migrations...
cd backend && node src/db/migrate.js && cd ..
echo.
echo Update complete! Your data is safe.
set /p "LAUNCH=Launch now? (Y/N): "
if /i "%LAUNCH%"=="Y" start "" "installer\StartMedTrack.bat"
pause
