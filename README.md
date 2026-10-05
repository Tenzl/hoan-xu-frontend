# hoan-xu-frontend

Next.js/React frontend for Hoàn Xu. The backend is at https://github.com/Tenzl/hoan-xu-backend.

## Run

Use Node.js 22 or newer.

```sh
npm ci
```

Copy `.env.example` to `.env.local`, set `BACKEND_URL` to the Go backend, then run `npm run dev`. The frontend is at http://localhost:3000 and proxies `/api/v1/*` to the backend. Set the backend's `APP_ORIGIN` to the frontend origin for request validation. Google sign-in requires the backend's OAuth configuration.

## Validate

```sh
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Playwright runs desktop and mobile cases with mocked API fixtures. The app includes customer, admin, cashback policy, product commission and leaderboard screens. Test fixtures do not create real orders or balances.

## Contract and translations

`contracts/openapi.yaml` is the backend contract snapshot used to generate frontend types:

```sh
npm run generate
npm run generate:i18n
```

Before regenerating types, copy the latest contract from the backend repository. `generate:i18n` validates `src/lib/en.json`. To also copy the catalog to a backend checkout, set `BACKEND_REPO_DIR` to its absolute root before running that command. In the original shared workspace, the sibling `../backend` is detected automatically.

## Deployment

Set `BACKEND_URL` before `npm run build`; Next.js rewrites use the build-time value. Use `npm run start -- --hostname 0.0.0.0 --port YOUR_PORT` when binding to a cloud service port. Backend session cookies stay on the frontend origin through the API proxy. Render Docker/Xvfb/browser verification configuration has not yet been prepared.
