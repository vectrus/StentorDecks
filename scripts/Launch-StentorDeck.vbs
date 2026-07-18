' Silent launcher for Explorer — no console window.
' Prefers installed / unpacked StentorDeck.exe; otherwise falls back to npm start (dev).

Option Explicit
Dim sh, fso, root, candidates, i, target, cmd
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
  ' Dev fallback — still shows a brief console for Vite; prefer npm run dist:dir + shortcut.
  cmd = "cmd /c cd /d """ & root & """ && npm start"
  sh.Run cmd, 0, False
End If
