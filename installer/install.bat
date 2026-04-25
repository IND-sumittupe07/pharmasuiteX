@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title MedTrack Installer v1.0.0
color 0F
cls

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║       MedTrack Pharmacy Suite — Installer v1.0       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Please right-click install.bat and "Run as Administrator"
  pause & exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js not found! Download from https://nodejs.org
  pause & exit /b 1
)
echo  [OK] Node.js found

set /p "DB_PASS=  Enter your PostgreSQL password: "
if "!DB_PASS!"=="" ( echo  [ERROR] Password required! & pause & exit /b 1 )

set PGPASSWORD=!DB_PASS!
psql -U postgres -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Cannot connect to PostgreSQL. Check password and make sure PostgreSQL is running.
  pause & exit /b 1
)
echo  [OK] PostgreSQL connected

psql -U postgres -c "CREATE DATABASE medtrack;" >nul 2>&1
echo  [OK] Database ready

set INSTALL_DIR=%~dp0..

echo PORT=5000 > "%INSTALL_DIR%\backend\.env"
echo NODE_ENV=production >> "%INSTALL_DIR%\backend\.env"
echo DATABASE_URL=postgresql://postgres:!DB_PASS!@localhost:5432/medtrack >> "%INSTALL_DIR%\backend\.env"
echo JWT_SECRET=medtrack-!DB_PASS!-secret-2026 >> "%INSTALL_DIR%\backend\.env"
echo JWT_EXPIRES_IN=7d >> "%INSTALL_DIR%\backend\.env"
echo FRONTEND_URL=http://localhost:3000 >> "%INSTALL_DIR%\backend\.env"
echo RAZORPAY_KEY_ID= >> "%INSTALL_DIR%\backend\.env"
echo RAZORPAY_KEY_SECRET= >> "%INSTALL_DIR%\backend\.env"
echo FAST2SMS_API_KEY= >> "%INSTALL_DIR%\backend\.env"
echo INTERAKT_API_KEY= >> "%INSTALL_DIR%\backend\.env"
echo  [OK] .env file created

echo  Installing backend packages...
cd /d "%INSTALL_DIR%\backend" && call npm install --production --silent
echo  [OK] Backend packages installed

echo  Setting up database tables...
node src/db/migrate_all.js
echo  [OK] Database tables created

echo  Loading demo data...
node src/db/seed.js
echo  [OK] Demo data loaded

echo  Installing frontend packages...
cd /d "%INSTALL_DIR%\frontend" && call npm install react-scripts@5.0.1 react react-dom react-router-dom axios --legacy-peer-deps --silent
echo  [OK] Frontend packages installed

set DESKTOP=%USERPROFILE%\Desktop
powershell -Command "$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut('%DESKTOP%\MedTrack.lnk');$s.TargetPath='%INSTALL_DIR%\installer\StartMedTrack.bat';$s.Description='MedTrack Pharmacy Suite';$s.Save()" >nul 2>&1
echo  [OK] Desktop shortcut created

echo.
echo  ═══════════════════════════════════════════════════════
echo  ✅  MedTrack installed successfully!
echo.
echo  Login: 9876543210 / demo1234
echo  URL:   http://localhost:3000
echo  ═══════════════════════════════════════════════════════
echo.
set /p "LAUNCH=  Launch MedTrack now? (Y/N): "
if /i "!LAUNCH!"=="Y" start "" "%INSTALL_DIR%\installer\StartMedTrack.bat"
pause
