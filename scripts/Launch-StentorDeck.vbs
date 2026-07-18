' Silent launcher for Explorer — no console window.
' Prefers installed / unpacked StentorDeck.exe; otherwise npm start with a boot splash.

Option Explicit
Dim sh, fso, root, candidates, i, target, cmd, splashPs1

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))

candidates = Array( _
  sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\StentorDeck\StentorDeck.exe", _
  root & "\release\win-unpacked\StentorDeck.exe" _
)

target = ""
For i = 0 To UBound(candidates)
  If fso.FileExists(candidates(i)) Then
    target = candidates(i)
    Exit For
  End If
Next

If target <> "" Then
  sh.Run """" & target & """", 1, False
Else
  ' Pre-Electron splash (covers shared/main build before Electron can paint).
  splashPs1 = root & "\scripts\show-boot-splash.ps1"
  If fso.FileExists(splashPs1) Then
    sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & splashPs1 & """", 0, False
  End If
  cmd = "cmd /c cd /d """ & root & """ && npm start"
  sh.Run cmd, 0, False
End If
