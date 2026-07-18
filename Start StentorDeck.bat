@echo off
setlocal
cd /d "%~dp0"

title StentorDeck
echo.
echo  StentorDeck — starting...
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js 20+ from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo First run: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo Ensuring native audio DB module matches Electron...
call npm run rebuild:native
if errorlevel 1 (
  echo WARNING: rebuild:native failed — app may still start if already built.
)

echo Freeing port 5173 if a previous Vite is still running...
call node scripts\free-port.mjs 5173

echo.
echo Launching ^(windowed for development^). Close the app window or press Ctrl+C here to stop.
echo.
call npm start
set EXITCODE=%ERRORLEVEL%

if not %EXITCODE%==0 (
  echo.
  echo App exited with code %EXITCODE%.
  pause
)
exit /b %EXITCODE%
