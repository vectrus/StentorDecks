# Creates a Desktop shortcut to StentorDeck.
# Prefers installed / unpacked StentorDeck.exe; otherwise Launch-StentorDeck.vbs (dev).

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'StentorDeck.lnk'
$iconIco = Join-Path $root 'build\icon.ico'
$vbs = Join-Path $root 'scripts\Launch-StentorDeck.vbs'

$candidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\StentorDeck\StentorDeck.exe'),
  (Join-Path $root 'release\win-unpacked\StentorDeck.exe')
)

$target = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)

if ($target) {
  $sc.TargetPath = $target
  $sc.WorkingDirectory = Split-Path -Parent $target
  $sc.Arguments = ''
  $sc.IconLocation = if (Test-Path $iconIco) { "$iconIco,0" } else { "$target,0" }
} else {
  if (-not (Test-Path $vbs)) {
    Write-Host 'No StentorDeck.exe and no Launch-StentorDeck.vbs.'
    Write-Host 'Run:  npm run dist:dir   or keep scripts/Launch-StentorDeck.vbs'
    exit 1
  }
  $sc.TargetPath = 'wscript.exe'
  $sc.Arguments = "`"$vbs`""
  $sc.WorkingDirectory = $root
  if (Test-Path $iconIco) {
    $sc.IconLocation = "$iconIco,0"
  } elseif (Test-Path (Join-Path $root 'build\icon.png')) {
    # Explorer may ignore PNG; still better than Electron default until ico exists.
    $sc.IconLocation = "$(Join-Path $root 'build\icon.png'),0"
  }
}

$sc.WindowStyle = 1
$sc.Description = 'StentorDeck - for julius'
$sc.Save()

Write-Host "Desktop shortcut created:"
Write-Host "  $shortcutPath"
if ($target) {
  Write-Host "  → $target"
} else {
  Write-Host "  → wscript.exe $vbs  (dev / source tree)"
}
Write-Host 'Double-click the shortcut — no command window.'
