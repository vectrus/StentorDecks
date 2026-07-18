@echo off
setlocal
cd /d "%~dp0"

title StentorDeck - Update source
echo.
echo  StentorDeck - update source tree
echo  Repo: %CD%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: git not found.
  echo For the installed app, open Settings and use Check for updates.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js 22 LTS from https://nodejs.org
  pause
  exit /b 1
)

REM IMPORTANT: npm is npm.cmd — always CALL it from a .bat
call npm run update -- %*
set EXITCODE=%ERRORLEVEL%

if not %EXITCODE%==0 (
  echo.
  echo Update failed ^(exit %EXITCODE%^).
  echo If it complained about local changes: commit them, or run:
  echo   UPDATE.bat --stash
  echo.
  pause
  exit /b %EXITCODE%
)

echo.
echo Done. Use Start StentorDeck.bat or the Desktop shortcut to launch.
echo.
exit /b 0
