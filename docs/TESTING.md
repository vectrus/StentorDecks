# Testing

StentorDeck uses three automated layers. **Never require the physical RMX2 in CI.**

| Layer | Tool | Command | What it covers |
|---|---|---|---|
| Unit | Vitest (node) | `npm test` | Curves, CDJ cue, MIDI decode, takeover, stores |
| Component | Vitest + Testing Library (jsdom) | `npm test` (`*.component.test.tsx`) | React chrome (brand, MIDI monitor, …) |
| End-user | Playwright | `npm run test:e2e` | Mockup journeys + app smoke with mocked IPC |
| Doc screenshots | Playwright | `npm run docs:screenshots` | PNG contract shots for `docs/mockups/` |

## Quick commands

```bash
npm test                 # unit + component
npm run test:watch       # vitest watch
npm run test:coverage    # unit/component + coverage report
npm run test:e2e         # Playwright end-user suite
npm run test:e2e:ui      # Playwright UI mode
npm run docs:screenshots # mockup PNGs
```

## Conventions

- **Unit first** for pure logic (docs/03–04 math, decode, takeover) — before UI wiring.
- **Component tests** use `*.component.test.tsx` and jsdom; mock `stores/root` when a component reads singletons.
- **E2E** must not depend on RMX2, WASAPI, or real MIDI. App smoke injects `window.stentor` and fakes `mediaDevices`.
- **`[HW]` criteria** stay owner-only (`docs/E2-HW-CHECKLIST.md`, `docs/E3-HW-CHECKLIST.md`); automation marks READY FOR HW VERIFICATION, never self-passes.
- Human-comprehensible errors (`.cursorrules` §5b) should be covered when adding `formatUserError` branches.

## CI

`.github/workflows/ci.yml` runs lint → typecheck → `npm test` → Playwright Chromium install → `test:e2e` → `docs:screenshots` → build → `dist:dir`.
