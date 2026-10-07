import { test, expect } from "@playwright/test";

test("admin rate saves a new version after password reauthentication", async ({ page }) => {
  let recent = false;
  let version = "rate-1";
  let gold = 1, green = 1;
  let calls = 0;
  const keys: string[] = [];
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "admin", name: "Admin", role: "admin", csrfToken: "csrf", permissions: ["settings"] };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/admin/settings")) data = {};
    if (path.endsWith("/xu-exchange-policies/current")) data = { id: version, goldUnits: gold, greenUnits: green };
    if (path.endsWith("/auth/internal/reauth")) { expect(request.postDataJSON()).toEqual({ password: "test-password" }); recent = true; }
    if (path.endsWith("/admin/xu-exchange-policies")) {
      calls++; keys.push(request.headers()["idempotency-key"]);
      expect(request.headers()["x-csrf-token"]).toBe("csrf");
      expect(request.postDataJSON()).toEqual({ currentVersionId: "rate-1", goldUnits: 4, greenUnits: 3 });
      if (!recent) { await route.fulfill({ status: 403, json: { error: { code: "REAUTH_REQUIRED", message: "Cần xác thực lại" } } }); return; }
      version = "rate-2"; gold = 4; green = 3; data = { id: version, goldUnits: gold, greenUnits: green };
    }
    await route.fulfill({ json: { data } });
  });
  await page.goto("/admin/settings");
  await page.getByRole("button",{name:"Tỷ lệ đổi Xu",exact:true}).click();
  const card = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Tỷ lệ đổi Xu", exact: true }) });
  await card.getByLabel("Xu vàng", { exact: true }).fill("4");
  await card.getByLabel("Xu xanh", { exact: true }).fill("3");
  await card.getByRole("button", { name: "Lưu tỷ lệ đổi Xu" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await dialog.getByRole("button", { name: "Xác thực", exact: true }).click();
  await expect(card).toContainText("rate-2");
  expect(calls).toBe(2); expect(keys[0]).toBe(keys[1]);
  await expect(card.getByLabel("Xu vàng", { exact: true })).toHaveValue("4");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("stale admin rate keeps the draft until explicitly refreshed", async ({ page }) => {
  let current = "rate-1";
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "admin", name: "Admin", role: "admin", csrfToken: "csrf", permissions: ["settings"] };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/admin/settings")) data = {};
    if (path.endsWith("/xu-exchange-policies/current")) data = { id: current, goldUnits: 1, greenUnits: 1 };
    if (path.endsWith("/admin/xu-exchange-policies")) { current = "rate-2"; await route.fulfill({ status: 409, json: { error: { code: "EXCHANGE_POLICY_CHANGED", message: "Tỷ lệ đổi Xu đã thay đổi. Vui lòng kiểm tra lại." } } }); return; }
    await route.fulfill({ json: { data } });
  });
  await page.goto("/admin/settings");
  await page.getByRole("button",{name:"Tỷ lệ đổi Xu",exact:true}).click();
  const card = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Tỷ lệ đổi Xu", exact: true }) });
  await card.getByLabel("Xu vàng", { exact: true }).fill("4");
  await card.getByRole("button", { name: "Lưu tỷ lệ đổi Xu" }).click();
  await expect(card.getByRole("alert")).toContainText("Tỷ lệ đổi Xu đã thay đổi");
  await expect(card.getByLabel("Xu vàng", { exact: true })).toHaveValue("4");
  await card.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(card).toContainText("rate-2");
  await expect(card.getByLabel("Xu vàng", { exact: true })).toHaveValue("1");
});
