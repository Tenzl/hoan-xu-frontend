# Frontend tests

- `e2e/`: Playwright cases grouped by account, admin, app, authentication, cashback, leaderboards, navigation, notifications and Shopee.
- `helpers/`: shared navigation and other test helpers.
- `deployment/remote-viewer.mjs`: noVNC canvas, desktop/mobile layout and close-session smoke, launched by the backend's `tests/deployment/docker-smoke.ps1 -ViewerTest ../frontend/tests/deployment/remote-viewer.mjs` against a disposable local Docker fixture.
- `playwright.config.ts`: desktop/mobile configuration.
- `results/current/`: traces, screenshots and output from the current run, ignored by Git.
- `results/<previous-folder>/`: preserved output from earlier runs, ignored by Git.

Run from the frontend repository root:

```sh
npx playwright install chromium
npm test
npm test -- --list
npm test -- e2e/leaderboards --project=mobile
```

Build the app first with `npm run build` when no development server is running. Playwright starts the production server from the repository root, or reuses the local server outside CI. On Windows, `./tests/run.ps1` runs type checking, the production build and all Playwright tests.

Use `test.info().outputPath(...)` for screenshots and other artifacts so they stay inside the configured results folder. Imports of shared helpers from feature folders use `../../helpers/`.
