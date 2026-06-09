@echo off
echo.
echo ========================================
echo   MedTrack Windows Installer Builder
echo ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

:: Check NSIS
if not exist "C:\Program Files (x86)\NSIS\makensis.exe" (
    echo [ERROR] NSIS not found.
    echo Download from: https://nsis.sourceforge.io/Download
    echo Install NSIS, then run this script again.
    pause
    exit /b 1
)
echo [OK] NSIS found

echo.
echo [1/5] Building React frontend...
cd ..\frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed
    pause
    exit /b 1
)
echo [OK] Frontend built

echo.
echo [2/5] Preparing backend...
cd ..\backend
call npm install --production
echo [OK] Backend ready

echo.
echo [3/5] Creating dist folder...
cd ..\installer
if not exist "dist" mkdir dist
if not exist "dist\backend" mkdir dist\backend
if not exist "dist\frontend-build" mkdir dist\frontend-build
if not exist "assets" mkdir assets

:: Copy backend (excluding dev files)
xcopy ..\backend\src dist\backend\src /E /I /Q
xcopy ..\backend\node_modules dist\backend\node_modules /E /I /Q
copy ..\backend\package.json dist\backend\

:: Copy frontend build
xcopy ..\frontend\build dist\frontend-build /E /I /Q

echo [OK] Files copied to dist

echo.
echo [4/5] Creating README.txt...
(
echo MedTrack Pharmacy Suite - Quick Start Guide
echo =============================================
echo.
echo LOGIN CREDENTIALS:
echo   Mobile:   9876543210
echo   Password: demo1234
echo.
echo To open MedTrack:
echo   Double-click the MedTrack icon on your Desktop
echo.
echo The app runs at: http://localhost:3000
echo API runs at:     http://localhost:5000
echo.
echo SUPPORT:
echo   Email: support@medtrack.in
echo   Version: 1.0.0
) > assets\README.txt

echo [OK] README created

echo.
echo [5/5] Building installer EXE...
"C:\Program Files (x86)\NSIS\makensis.exe" MedTrack.nsi
if %errorlevel% neq 0 (
    echo [ERROR] Installer build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS!
echo   Output: MedTrack-Setup-v1.0.0.exe
echo   Size: 
for %%A in (MedTrack-Setup-v1.0.0.exe) do echo   %%~zA bytes
echo ========================================
echo.
pause
