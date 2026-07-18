# Build resources

| File | Use |
|---|---|
| `icon.png` | Windows app + NSIS installer / shortcut icon (electron-builder). Source of truth: `brand/stentordeck-icon.png`. Also copied to `extraResources` for the splash / window icon. |

Copy updates from `brand/` into this folder before packaging if the mark changes.

## Shipping a double-clickable app (no command window)

```bash
npm run dist          # NSIS installer → Desktop + Start Menu shortcuts
# or
npm run dist:dir      # unpacked exe under release/win-unpacked/
npm run shortcut      # Desktop .lnk → that exe
```

Explorer: double-click **StentorDeck** shortcut / `StentorDeck.exe`. Closing the window runs graceful shutdown (analysis, DB, IPC).
