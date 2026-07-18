# Pre-Electron splash for the Desktop VBS / npm start path.
# Closes when Electron writes %TEMP%\stentordeck-ui-ready or a StentorDeck/Electron process appears.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$readyMarker = Join-Path $env:TEMP 'stentordeck-ui-ready'
Remove-Item $readyMarker -ErrorAction SilentlyContinue

$form = New-Object System.Windows.Forms.Form
$form.Text = 'StentorDeck'
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.Size = New-Object System.Drawing.Size(420, 280)
$form.BackColor = [System.Drawing.Color]::FromArgb(14, 17, 21)
$form.TopMost = $true
$form.ShowInTaskbar = $true

$wrap = New-Object System.Windows.Forms.Panel
$wrap.Dock = [System.Windows.Forms.DockStyle]::Fill
$wrap.BackColor = $form.BackColor
$form.Controls.Add($wrap)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'StentorDeck'
$title.ForeColor = [System.Drawing.Color]::FromArgb(244, 247, 251)
$title.Font = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(128, 88)
$wrap.Controls.Add($title)

$sub = New-Object System.Windows.Forms.Label
$sub.Text = 'for julius'
$sub.ForeColor = [System.Drawing.Color]::FromArgb(170, 180, 194)
$sub.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$sub.AutoSize = $true
$sub.Location = New-Object System.Drawing.Point(168, 128)
$wrap.Controls.Add($sub)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Starting…'
$status.ForeColor = [System.Drawing.Color]::FromArgb(170, 180, 194)
$status.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(168, 168)
$wrap.Controls.Add($status)

$bar = New-Object System.Windows.Forms.ProgressBar
$bar.Style = [System.Windows.Forms.ProgressBarStyle]::Marquee
$bar.MarqueeAnimationSpeed = 30
$bar.Size = New-Object System.Drawing.Size(180, 6)
$bar.Location = New-Object System.Drawing.Point(120, 200)
$wrap.Controls.Add($bar)

$started = Get-Date
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400
$timer.Add_Tick({
  if (Test-Path $readyMarker) {
    $timer.Stop()
    $form.Close()
    return
  }
  $procs = Get-Process -Name 'electron', 'StentorDeck' -ErrorAction SilentlyContinue
  if ($procs) {
    # Electron is up — its own splash takes over shortly
    Start-Sleep -Milliseconds 600
    $timer.Stop()
    $form.Close()
    return
  }
  $elapsed = ((Get-Date) - $started).TotalSeconds
  if ($elapsed -gt 180) {
    $timer.Stop()
    $form.Close()
    return
  }
  if ($elapsed -gt 8) { $status.Text = 'Building…' }
  if ($elapsed -gt 25) { $status.Text = 'Almost there…' }
})

$form.Add_Shown({ $timer.Start() })
[void]$form.ShowDialog()
$timer.Stop()
$timer.Dispose()
