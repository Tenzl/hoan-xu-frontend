import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
const runtime = process.env.CSP_RUNTIME;
if (runtime !== "development" && runtime !== "production") throw new Error("Set CSP_RUNTIME explicitly or use npm run test:csp");
const dev = runtime === "development";
const port = dev ? 3011 : 3012;
export default defineConfig({
  testDir: "./e2e/security", outputDir: `./results/csp-${runtime}`,
  fullyParallel: false, workers: 1, timeout: 60000, reporter: "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  webServer: {
    cwd: path.resolve(__dirname, ".."),
    command: `node node_modules/next/dist/bin/next ${dev ? "dev" : "start"} --hostname localhost --port ${port}`,
    url: `http://localhost:${port}/link`, reuseExistingServer: false, timeout: 120000,
    env: { NEXT_DIST_DIR: `.next-csp-${runtime}` },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
});
