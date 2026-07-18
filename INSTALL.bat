@echo off
setlocal
cd /d "%~dp0"

title StentorDeck - Install ^& Start
echo.
echo  StentorDeck - easy install ^& start
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
call node -v
REM IMPORTANT: npm is npm.cmd — without CALL, the .bat ends here and never runs setup.
call npm -v
echo.

echo Starting setup ^(install + shortcut + launch^)…
REM Full path: npm install → rebuild → Desktop shortcut → start packaged exe or dev
call npm run setup
set EXITCODE=%ERRORLEVEL%

if not %EXITCODE%==0 (
  echo.
  echo Install/start failed ^(exit %EXITCODE%^).
  echo Tip: use Node 22 LTS, close apps locking node_modules, delete node_modules, run again.
  echo.
  pause
  exit /b %EXITCODE%
)

echo.
echo Done. Desktop shortcut: StentorDeck
echo If the window flashed and closed, another copy may already be running — check the taskbar.
echo.
echo Updates later:
echo   Installed app  - Settings - Check for updates  ^(after npm run release^)
echo   Source tree    - UPDATE.bat
echo   Fresh installer - npm run dist  then run release\StentorDeck-Setup-*.exe
echo.
exit /b 0
