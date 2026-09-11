@echo off
echo ===================================================
echo     AQ TRACK - Industrial Water Monitoring System
echo ===================================================
echo.
echo Starting Backend API Server (Port 5000)...
start "AQ TRACK Backend" cmd /k "cd server && npm start"

timeout /t 2 >nul

echo Starting Frontend Web Portal (Port 3000)...
start "AQ TRACK Frontend" cmd /k "cd client && npm run dev"

timeout /t 3 >nul

echo Opening browser at http://localhost:3000...
start http://localhost:3000

echo.
echo System is running!
echo Press any key to exit this launcher window (servers will stay running).
pause >nul
