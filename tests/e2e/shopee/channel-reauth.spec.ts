import { test, expect, type Page } from "@playwright/test";

const template = "https://s.shopee.vn/an_redir?source=channel-test";
async function fixture(page: Page, options: { recent?: boolean; saveError?: boolean } = {}) {
  let verified = Boolean(options.recent);
  let channel = { id: "shopee", name: "Shopee", status: "not_configured", settings: { template: "" } };
  const writes: { path: string; body: unknown; key?: string }[] = [];
  await page.route("**/api/v1/**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "admin", role: "admin", name: "Admin", csrfToken: "csrf", permissions: ["settings"], recentAuthentication: verified };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/admin/settings")) data = { brand: "Hoàn Xu", faq: [] };
    if (path.endsWith("/admin/affiliate-channels")) data = [channel];
    if (req.method() !== "GET") {
      writes.push({ path, body: req.postDataJSON(), key: req.headers()["idempotency-key"] });
      expect(req.headers()["x-csrf-token"]).toBe("csrf");
    }
    if (path.endsWith("/auth/internal/reauth")) {
      if (req.postDataJSON().password !== "correct-password") return route.fulfill({ status: 403, json: { error: { code: "INVALID_PASSWORD", message: "Mật khẩu không đúng." } } });
      verified = true; data = { verified: true };
    }
    if (path.endsWith("/admin/affiliate-channels/shopee")) {
      if (!verified) return route.fulfill({ status: 403, json: { error: { code: "REAUTH_REQUIRED", message: "Vui lòng xác thực lại mật khẩu." } } });
      if (options.saveError) return route.fulfill({ status: 409, json: { error: { code: "TRACKING_NOT_VERIFIED", message: "Cần xác minh tích hợp và tracking trước khi bật." } } });
      const value = req.postDataJSON(); channel = { ...channel, status: value.status, settings: { template: value.template } }; data = value;
    }
    await route.fulfill({ json: { data } });
  });
  return writes;
}

async function configure(page: Page) {
  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Cấu hình", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cấu hình Shopee" });
  await dialog.getByLabel("Trạng thái", { exact: true }).selectOption("available");
  await dialog.getByLabel("Mẫu link đã kiểm chứng").fill(template);
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
}

test("password confirmation saves the original channel selection automatically", async ({ page }) => {
  const writes = await fixture(page); await configure(page);
  const auth = page.getByRole("dialog", { name: "Xác thực lại mật khẩu" });
  await auth.getByLabel("Mật khẩu", { exact: true }).fill("correct-password");
  await auth.getByRole("button", { name: "Xác thực", exact: true }).click();
  await expect(auth).not.toBeVisible();
  await expect(page.getByText("Đang chạy", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Đã cập nhật" })).toBeVisible();
  expect(writes.map(w => w.path)).toEqual(["/api/v1/admin/affiliate-channels/shopee", "/api/v1/auth/internal/reauth", "/api/v1/admin/affiliate-channels/shopee"]);
  expect(writes[0].body).toEqual({ status: "available", template });
  expect(writes[2].body).toEqual(writes[0].body);
  expect(writes[0].key).toBeTruthy(); expect(writes[2].key).toBe(writes[0].key);
  await page.getByRole("button", { name: "Cấu hình", exact: true }).click();
  await expect(page.getByLabel("Trạng thái", { exact: true })).toHaveValue("available");
  await expect(page.getByLabel("Mẫu link đã kiểm chứng")).toHaveValue(template);
});

test("wrong password retains the pending selection until a successful confirmation", async ({ page }) => {
  const writes = await fixture(page); await configure(page);
  const auth = page.getByRole("dialog", { name: "Xác thực lại mật khẩu" });
  await auth.getByLabel("Mật khẩu", { exact: true }).fill("wrong-password");
  await auth.getByRole("button", { name: "Xác thực", exact: true }).click();
  await expect(auth).toContainText("Mật khẩu không đúng.");
  expect(writes.filter(w => w.path.endsWith("/shopee"))).toHaveLength(1);
  await auth.getByLabel("Mật khẩu", { exact: true }).fill("correct-password");
  await auth.getByRole("button", { name: "Xác thực", exact: true }).click();
  await expect(auth).not.toBeVisible();
  expect(writes.at(-1)?.body).toEqual({ status: "available", template });
});

test("canceling verification never replays the pending update", async ({ page }) => {
  const writes = await fixture(page); await configure(page);
  const auth = page.getByRole("dialog", { name: "Xác thực lại mật khẩu" });
  await expect(auth).toBeVisible(); await page.keyboard.press("Escape");
  await expect(auth).not.toBeVisible();
  await page.getByRole("button", { name: "Cấu hình", exact: true }).click();
  await expect(page.getByLabel("Trạng thái", { exact: true })).toHaveValue("not_configured");
  expect(writes).toHaveLength(1);
});

test("a rejected replay shows the save error and never reports success", async ({ page }) => {
  const writes = await fixture(page, { saveError: true }); await configure(page);
  const auth = page.getByRole("dialog", { name: "Xác thực lại mật khẩu" });
  await auth.getByLabel("Mật khẩu", { exact: true }).fill("correct-password");
  await auth.getByRole("button", { name: "Xác thực", exact: true }).click();
  await expect(auth).toContainText("Cần xác minh tích hợp và tracking trước khi bật.");
  await expect(page.getByRole("status").filter({ hasText: "Đã cập nhật" })).toHaveCount(0);
  expect(writes).toHaveLength(3);
});

test("closing verification during a password request cancels the pending save", async ({ page }) => {
  const writes = await fixture(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/auth/internal/reauth", async route => {
    await gate; await route.fallback().catch(() => {});
  });
  await configure(page);
  const auth = page.getByRole("dialog", { name: "Xác thực lại mật khẩu" });
  await auth.getByLabel("Mật khẩu", { exact: true }).fill("correct-password");
  const request = page.waitForRequest(req => req.url().endsWith("/auth/internal/reauth"));
  await auth.getByRole("button", { name: "Xác thực", exact: true }).click(); await request;
  await auth.getByRole("button", { name: "Đóng", exact: true }).click();
  release(); await expect(auth).not.toBeVisible();
  await page.getByRole("button", { name: "Cấu hình", exact: true }).click();
  await expect(page.getByLabel("Trạng thái", { exact: true })).toHaveValue("not_configured");
  expect(writes.filter(w => w.path.endsWith("/shopee"))).toHaveLength(1);
});

test("a recently authenticated admin saves without another confirmation", async ({ page }) => {
  const writes = await fixture(page, { recent: true }); await configure(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Đang chạy", { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
});
