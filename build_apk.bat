@echo off
echo ===================================================
echo   AQ TRACK - Mobile Android App Builder
echo ===================================================
echo.

cd /d "%~dp0\client"

echo [1/3] Compiling React web production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b %errorlevel%
)

echo [2/3] Syncing assets with Android Native Project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %errorlevel%
)

echo [3/3] Opening Android Studio...
call npx cap open android

echo.
echo ===================================================
echo   Done! Android Studio is loading your project.
echo   To generate APK: Build -> Build APK(s)
echo   To publish on Play Store: Build -> Generate Signed Bundle (.aab)
echo ===================================================
pause
