@echo off
setlocal
cd /d "%~dp0"

REM Day-to-day launch: prefer a packaged build; otherwise install ^& start from source.
if exist "%LOCALAPPDATA%\Programs\StentorDeck\StentorDeck.exe" (
  start "" "%LOCALAPPDATA%\Programs\StentorDeck\StentorDeck.exe"
  exit /b 0
)
if exist "%~dp0release\win-unpacked\StentorDeck.exe" (
  start "" "%~dp0release\win-unpacked\StentorDeck.exe"
  exit /b 0
)

call "%~dp0INSTALL.bat"
exit /b %ERRORLEVEL%
