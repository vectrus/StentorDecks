@echo off
setlocal
cd /d "%~dp0"

title StentorDeck — Install ^& Start
echo.
echo  StentorDeck — easy install ^& start
echo  Repo: %CD%
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found.
  echo Install Node.js 22 LTS from https://nodejs.org then double-click INSTALL.bat again.
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: node not found. Install Node.js 22 LTS from https://nodejs.org
  pause
  exit /b 1
)

echo Using:
where.exe node
node -v
npm -v
echo.

REM Full path: npm install (Electron ABI) → rebuild native → free port → start
call npm run setup
set EXITCODE=%ERRORLEVEL%

if not %EXITCODE%==0 (
  echo.
  echo Install/start failed ^(exit %EXITCODE%^).
  echo Tip: use Node 22 LTS, close apps locking node_modules, delete node_modules, run again.
  echo.
  pause
)
exit /b %EXITCODE%
