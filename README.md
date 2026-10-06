# hoan-xu-frontend

Next.js/React frontend for Hoàn Xu. The backend is at https://github.com/Tenzl/hoan-xu-backend.

## Run

Use Node.js 22 or newer.

```sh
npm ci
```

Copy `.env.example` to `.env.local`, set `BACKEND_URL` to the Go backend, then run `npm run dev`. The frontend is at http://localhost:3000 and proxies `/api/v1/*` to the backend. Set the backend's `APP_ORIGIN` to the frontend origin for request validation. Google sign-in requires the backend's OAuth configuration.

Windows scripts `scripts/setup-local.ps1`, `scripts/dev.ps1` and `tests/run.ps1` run from this repository without a backend checkout. UI documentation is in `docs/`; the original HTML mockup is preserved in `docs/reference/` and is not served as a production page. Local screenshots, diagnostic output and UI logs are in `private-data/`, ignored by Git.

## Validate

```sh
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Playwright runs desktop and mobile cases with mocked API fixtures. All test files and configuration are in `tests/`, with feature groups under `tests/e2e/` and shared helpers under `tests/helpers/`. Screenshots and traces stay in `tests/results/`, ignored by Git. See `tests/README.md` for commands. The app includes customer, admin, cashback policy, product commission and leaderboard screens. Test fixtures do not create real orders or balances.

## Contract and translations

`contracts/openapi.yaml` is the backend contract snapshot used to generate frontend types:

```sh
npm run generate
npm run generate:i18n
```

Before regenerating types, copy the latest contract from the backend repository. `generate:i18n` validates `src/lib/en.json`. To also copy the catalog to a backend checkout, explicitly set `BACKEND_REPO_DIR` to its absolute root before running that command; no sibling folder is required or modified by default. `node scripts/extract-i18n.cjs` creates a local translation inventory in `private-data/` and optionally includes backend strings when `BACKEND_REPO_DIR` is set.

## Deployment

Set `BACKEND_URL` before `npm run build`; Next.js rewrites use the build-time value. Use `npm run start -- --hostname 0.0.0.0 --port YOUR_PORT` when binding to a cloud service port. Backend session cookies stay on the frontend origin through the API proxy. The backend repository includes Docker/Xvfb and authenticated remote Chrome access. Use **Đăng nhập Shopee** in admin to open server Chrome and sign in manually, then check the session. Enter and save the Shopee Affiliate ID on that page; the backend stores this configuration in the database. A persistent Chrome profile is required to retain the browser session across restarts.

## Unified wallet on the cashback page

`/link` includes a wallet donut, configured commission share range and inline withdrawal. Pasting a product never credits balances or creates an order. Check-in rewards and vouchers use the unified wallet (1 Xu = 1 VND). Start the local Go API with `../backend/scripts/dev-local.ps1` if its default `.env` points to another environment. Run frontend with `npm run dev`.

The product preview emphasizes the member's configured commission share range (for example, 65–75%), current tier, approved orders remaining to the next tier, and that tier's configured range. It never displays a calculated product reward or a randomly selected order rate as the advertised range. Shop/platform commission breakdowns, caps and product IDs remain hidden. Product price is VND; actual wallet balances are Xu. The product card and wallet use the created link's policy snapshot once available. Fixed ranges display one percentage. A missing product commission does not erase the independently configured share range. The wallet ring only shows actual withdrawal progress, without an estimated money overlay. The overview uses the same preview component; created links and recorded orders retain their policy details.

`tests/e2e/cashback/reward-hierarchy.spec.ts` covers visual hierarchy, synchronized ranges, snapshot preservation, highest tier, fixed ranges, unavailable data and guests. Existing checker tests cover debounce, stale responses, zero commission and retries; wallet tests cover actual balances and withdrawals. Desktop/mobile fixtures include VI/EN, light/dark and reduced motion without changing financial data.

CSP development/production policy and isolated Windows verification: [docs/csp.md](docs/csp.md). Run `npm run test:csp` to test both modes on ports 3011/3012 without using the dev server at 3000.
