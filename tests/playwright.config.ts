import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
const port = process.env.E2E_PORT || "3025";
const workspace = process.env.E2E_WORKSPACE || path.resolve(__dirname, "..");
export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/security/csp.spec.ts",
  outputDir: process.env.E2E_OUTPUT_DIR || "./results/production",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    cwd: workspace,
    command: `node node_modules/next/dist/bin/next start --hostname localhost --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
