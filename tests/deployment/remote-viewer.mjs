// Used only against the disposable fixture created by the backend Docker smoke.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const origin = process.env.HOANXU_BROWSER_SMOKE_ORIGIN;
if (!origin || !/^http:\/\/localhost:\d+$/.test(origin)) throw new Error("Requires the local Docker smoke fixture origin.");
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const request = context.request;
  const headers = { Origin: "http://localhost:3000" };
  let response = await request.post(`${origin}/api/v1/auth/internal/login`, { headers, data: { username: "smokeadmin", password: "docker-smoke-admin-password" } });
  if (!response.ok()) throw new Error("Fixture login failed.");
  response = await request.get(`${origin}/api/v1/me`);
  const me = await response.json();
  headers["X-CSRF-Token"] = me.data.csrfToken;
  response = await request.post(`${origin}/api/v1/auth/internal/reauth`, { headers, data: { password: "docker-smoke-admin-password" } });
  if (!response.ok()) throw new Error("Fixture reauthentication failed.");
  response = await request.post(`${origin}/api/v1/admin/browser/access`, { headers });
  if (!response.ok()) throw new Error("Fixture display access failed.");
  const access = await response.json();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(access.data.url);
  await page.waitForFunction(() => document.getElementById("status")?.textContent === "Đã kết nối", undefined, { timeout: 15000 });
  if (!await page.locator("#screen canvas").isVisible()) throw new Error("VNC canvas is not visible.");
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#screen canvas");
    if (!(canvas instanceof HTMLCanvasElement) || !canvas.width || !canvas.height) return false;
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    // Wait for a painted Chrome window, rather than only the VNC handshake.
    for (let i = 0; i < pixels.length; i += 4 * 1024) {
      if (pixels[i] > 200 && pixels[i + 1] > 200 && pixels[i + 2] > 200) return true;
    }
    return false;
  }, undefined, { timeout: 15000 });
  if (errors.length) throw new Error("Remote viewer JavaScript failed.");
  const results = new URL("../results/", import.meta.url);
  await fs.mkdir(results, { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL("remote-browser-desktop.png", results)) });
  await page.setViewportSize({ width: 360, height: 800 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("Remote viewer overflows at 360px.");
  await page.screenshot({ path: fileURLToPath(new URL("remote-browser-mobile.png", results)) });
  await page.getByRole("button", { name: "Đóng phiên điều khiển" }).click();
  await page.waitForURL(`${origin}/browser/`);
  const screen = await request.get(`${origin}/browser/screen`);
  if (screen.status() !== 401) throw new Error("Close button did not revoke the display cookie.");
  console.log("Remote viewer passed: bootstrap, noVNC rendering, desktop/mobile layout and close-session control.");
} finally {
  await browser.close();
}
