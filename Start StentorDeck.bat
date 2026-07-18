@echo off
setlocal
cd /d "%~dp0"

REM Day-to-day launch: prefer a packaged build; ensure Desktop shortcut; else INSTALL.bat.

REM Refresh Desktop .lnk (exe or VBS) — cheap; ignores failure.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Create-DesktopShortcut.ps1" >nul 2>&1

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
