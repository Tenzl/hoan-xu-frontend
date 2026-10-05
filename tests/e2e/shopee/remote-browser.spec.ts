import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page, role = "admin", passwordOK = true, enabled = true) {
  const commands: string[] = [];
  await page.context().route("https://chrome.example.test/browser/**", route => route.fulfill({ contentType: "text/html", body: "<h1>Remote Chrome fixture</h1>" }));
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "internal", role, name: "Admin", permissions: ["settings"], mustChangePassword: false, csrfToken: "fixture-csrf" };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/admin/browser")) data = { enabled: true, trackingVerified: false, remoteAvailable: enabled, browser: { browser: true, state: "login_required" } };
    if (request.method() === "POST") {
      commands.push(path);
      expect(request.headers()["x-csrf-token"]).toBe("fixture-csrf");
    }
    if (path.endsWith("/auth/internal/reauth")) {
      expect(request.postDataJSON()).toEqual({ password: "fixture-password" });
      if (!passwordOK) {
        await route.fulfill({ status: 403, json: { error: { code: "INVALID_PASSWORD", message: "Mật khẩu không đúng." } } });
        return;
      }
      data = { verified: true };
    }
    if (path.endsWith("/admin/browser/access")) {
      expect(request.postData()).toBeNull();
      data = { url: "https://chrome.example.test/browser/#ticket=fixture", expiresAt: new Date(Date.now() + 60000).toISOString() };
    }
    await route.fulfill({ json: { data, meta: {} } });
  });
  return commands;
}

test("admin confirms password and opens remote Chrome directly at its backend origin", async ({ page }) => {
  const commands = await setup(page);
  await page.goto("/admin/cookies");
  await page.getByLabel("Xác nhận mật khẩu quản trị", { exact: true }).fill("fixture-password");
  const popupReady = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Mở Chrome trên server", exact: true }).click();
  const popup = await popupReady;
  await expect(popup).toHaveURL("https://chrome.example.test/browser/#ticket=fixture");
  await expect(page.getByLabel("Xác nhận mật khẩu quản trị", { exact: true })).toHaveValue("");
  expect(commands).toEqual(["/api/v1/auth/internal/reauth", "/api/v1/admin/browser/access"]);
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("failed password verification never requests display access", async ({ page }) => {
  const commands = await setup(page, "admin", false);
  await page.goto("/admin/cookies");
  await page.getByLabel("Xác nhận mật khẩu quản trị", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Mở Chrome trên server", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Mật khẩu không đúng." })).toBeVisible();
  expect(commands).toEqual(["/api/v1/auth/internal/reauth"]);
  await expect.poll(() => page.context().pages().length).toBe(1);
});

for (const [role, enabled] of [["staff", true], ["admin", false]] as const) {
  test(`remote control stays hidden for ${role}, enabled=${enabled}`, async ({ page }) => {
    await setup(page, role, true, enabled);
    await page.goto("/admin/cookies");
    await expect(page.getByLabel("Dán cookie Shopee", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mở Chrome trên server", exact: true })).toHaveCount(0);
  });
}
