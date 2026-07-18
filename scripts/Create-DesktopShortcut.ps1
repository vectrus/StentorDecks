# Creates a Desktop shortcut to StentorDeck.exe (no console window).
# Prefers installed app, then release\win-unpacked from `npm run dist:dir`.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'StentorDeck.lnk'
$iconPng = Join-Path $root 'build\icon.png'

$candidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\StentorDeck\StentorDeck.exe'),
  (Join-Path $root 'release\win-unpacked\StentorDeck.exe')
)

$target = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $target) {
  Write-Host 'No StentorDeck.exe found. Run:  npm run dist   or   npm run dist:dir'
  Write-Host "Looked in:`n - $($candidates -join "`n - ")"
  exit 1
}

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = $target
$sc.WorkingDirectory = Split-Path -Parent $target
$sc.WindowStyle = 1
$sc.Description = 'StentorDeck — for julius'
if (Test-Path $iconPng) {
  # .lnk icon index prefers .ico/.exe; exe embeds the builder icon.
  $sc.IconLocation = "$target,0"
}
$sc.Save()

Write-Host "Desktop shortcut created:"
Write-Host "  $shortcutPath"
Write-Host "  → $target"
Write-Host 'Double-click the shortcut — no command window.'
