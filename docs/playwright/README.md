# Playwright — documentation screenshots

Maintains visual documentation for StentorDeck. Ruled by `.cursorrules` §2b.

## Live app screenshots

```bash
npm run docs:screenshots
```

Boots the Vite renderer with mocked `window.stentor` / devices (same approach as e2e),
opens Performance / Library / Audio / Settings, and writes PNGs to [`../screenshots/`](../screenshots/).
Commit the PNGs when the UI changes in a user-visible way.

HTML design-contract mockups remain under [`../mockups/`](../mockups/) for layout reference;
they are **not** the screenshot source anymore.

## End-user e2e (separate suite)

App smoke + mockup journeys live under [`../../e2e/`](../../e2e/) — run `npm run test:e2e`. See [`../TESTING.md`](../TESTING.md).

## Future

- Optional visual regression against baseline PNGs (`toHaveScreenshot`) once UI stabilizes in E6
- Full Electron launch helper (still no RMX2 in CI)
