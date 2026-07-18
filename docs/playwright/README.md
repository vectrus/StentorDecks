# Playwright — documentation screenshots

Maintains visual documentation for StentorDeck. Ruled by `.cursorrules` §2b.

## Mockup screenshots

```bash
npm run docs:screenshots
```

Writes PNGs to [`../mockups/screenshots/`](../mockups/screenshots/) from each authoritative HTML mockup. Commit the PNGs when mockups change.

## Future

- Electron app / E2 harness shots (deterministic fixtures, no RMX2 in CI)
- Optional visual regression against baseline PNGs (`toHaveScreenshot`) once UI stabilizes in E6
