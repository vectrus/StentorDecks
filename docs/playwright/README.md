# Playwright — documentation screenshots

Maintains visual documentation for StentorDeck. Ruled by `.cursorrules` §2b.

## Mockup screenshots

```bash
npm run docs:screenshots
```

Writes PNGs to [`../mockups/screenshots/`](../mockups/screenshots/) from each authoritative HTML mockup. Commit the PNGs when mockups change.

## End-user e2e (separate suite)

App smoke + mockup journeys live under [`../../e2e/`](../../e2e/) — run `npm run test:e2e`. See [`../TESTING.md`](../TESTING.md).

## Future

- Optional visual regression against baseline PNGs (`toHaveScreenshot`) once UI stabilizes in E6
- Full Electron launch helper (still no RMX2 in CI)
