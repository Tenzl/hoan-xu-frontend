# Frontend tests

- `e2e/`: Playwright cases grouped by account, admin, app, authentication, cashback, leaderboards, navigation, notifications and Shopee.
- `helpers/`: shared navigation and other test helpers.
- `deployment/remote-viewer.mjs`: noVNC canvas, desktop/mobile layout and close-session smoke, launched by the backend's `tests/deployment/docker-smoke.ps1 -ViewerTest ../frontend/tests/deployment/remote-viewer.mjs` against a disposable local Docker fixture.
- `playwright.config.ts`: desktop/mobile configuration.
- `results/<mode>-<time>-<pid>/`: isolated source copy, traces and screenshots for each run, ignored by Git.

Run from the frontend repository root:

```sh
npx playwright install chromium
npm test
npm test -- --list
npm test -- e2e/leaderboards --project=mobile
```

The runner copies source/config into a private run workspace, builds it, selects an ephemeral port and starts its own server. It never reuses a development server. `npm run test:csp` runs isolated development HMR and production CSP suites. On Windows, `./tests/run.ps1` also runs type checking. CI runs the complete desktop/mobile suite and both CSP modes.

Use `test.info().outputPath(...)` for screenshots and other artifacts so they stay inside the configured results folder. Imports of shared helpers from feature folders use `../../helpers/`.
