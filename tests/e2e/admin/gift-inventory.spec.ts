import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

async function setup(page: Page) {
  let stock = 3, price = 12000, pending = 1;
  await page.route("https://example.com/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="16" fill="#bd2732"/><text x="80" y="100" fill="white" text-anchor="middle" font-size="64" font-family="sans-serif">JB</text></svg>' }));
  const writes: { path: string; body: any; key?: string }[] = [];
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (request.method() !== "GET") {
      const body = request.postData() ? request.postDataJSON() : undefined;
      writes.push({ path, body, key: request.headers()["idempotency-key"] });
      if (path.endsWith("/out-of-stock")) { stock = 0; pending = 0; data = { giftId: "g1", stock, refundedCount: 1, refundedXu: 12000 }; }
      else if (request.method() === "PATCH") { if (body.stock !== undefined) stock = body.stock; if (body.costXu !== undefined) price = body.costXu; }
    } else {
      if (path.endsWith("/me")) data = { id: "admin", name: "Admin", role: "admin", permissions: ["gifts"], csrfToken: "csrf" };
      if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
      if (path.endsWith("/admin/gifts")) data = [{ id: "g1", name: "Voucher Shopee", channel: "shopee", costXu: price, stock, active: true, icon: "ticket", pendingCount: pending, pendingXu: pending * 12000 }];
      if (path.endsWith("/gift-redemptions")) data = pending ? [{ id: "r1", userId: "u1", name: "Minh An", giftId: "g1", giftName: "Voucher Shopee", costXu: 12000, status: "pending", createdAt: "2026-10-07" }] : [];
    }
    await route.fulfill({ json: { data, meta: { hasNext: false } } });
  });
  return writes;
}

test("out of stock refunds pending requests and can be replenished", async ({ page }) => {
  const writes = await setup(page);
  await page.goto("/admin/gifts");
  await page.getByRole("tab", { name: "Danh mục & tồn kho" }).click();
  await page.getByRole("button", { name: "Hết hàng và hoàn Xu", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã hoàn" })).toContainText("12.000 Xu");
  await expect(page.getByText("Hết hàng", { exact: true })).toBeVisible();
  expect(writes.filter(w => w.path.endsWith("out-of-stock"))).toHaveLength(1);
  expect(writes[0].key).toBeTruthy();
  await page.getByRole("button", { name: "Cập nhật tồn kho", exact: true }).click();
  await page.getByLabel("Số lượng còn lại", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Còn hàng", { exact: true })).toBeVisible();
  expect(writes.at(-1)?.body).toEqual({ stock: 5, expectedStock: 0 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("gift-catalog.png"), fullPage: true });
});

test("create gift in popup with image, description and no channel", async ({ page }) => {
  const writes = await setup(page);
  await page.goto("/admin/gifts");
  await page.getByRole("button", { name: "Cấp mã", exact: true }).click();
  await expect(page.getByText("Chào Minh An, voucher Voucher Shopee của bạn đã sẵn sàng. Mở Lịch sử đổi quà để xem mã.")).toBeVisible();
  await page.getByLabel("Mã voucher", { exact: true }).fill("SHOPEE-SECRET");
  await page.getByRole("button", { name: "Cấp voucher và thông báo" }).click();
  expect(writes.at(-1)?.body).toEqual({ action: "completed", code: "SHOPEE-SECRET", reason: "" });
  await page.getByRole("button", { name: "Thêm quà", exact: true }).click();
  await page.getByLabel("Tên quà", { exact: true }).fill("Tai nghe");
  await page.getByLabel("Giá Xu", { exact: true }).fill("25000");
  await expect(page.getByRole("dialog", { name: "Thêm quà", exact: true })).toBeVisible();
  await expect(page.getByLabel("Kênh", { exact: true })).toHaveCount(0);
  await page.getByLabel("Đường dẫn ảnh quà", { exact: true }).fill("https://example.com/jollibee.png");
  await page.getByLabel("Mô tả", { exact: true }).fill("Phiếu ăn 100.000đ\nÁp dụng tại cửa hàng.");
  await expect(page.getByRole("img", { name: "Ảnh Quà", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo quà", exact: true })).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath("gift-editor.png"), fullPage: true });
  await page.getByRole("button", { name: "Tạo quà", exact: true }).click();
  expect(writes.at(-1)?.body.imageUrl).toBe("https://example.com/jollibee.png");
  expect(writes.at(-1)?.body.description).toContain("Phiếu ăn");
  expect(writes.at(-1)?.body.channel).toBeUndefined();
  await expect(page.getByRole("button", { name: /Xóa mềm|Tặng miễn phí/ })).toHaveCount(0);
});

test("gift popup resumes after reauthentication and Escape restores focus", async ({ page }) => {
  const writes = await setup(page);
  let attempts = 0;
  await page.route("**/api/v1/admin/gifts", async route => {
    if (route.request().method() === "POST" && attempts++ === 0) await route.fulfill({ status: 403, json: { error: { code: "REAUTH_REQUIRED", message: "Vui lòng xác thực lại mật khẩu." } } });
    else await route.fallback();
  });
  await page.goto("/admin/gifts");
  const add = page.getByRole("button", { name: "Thêm quà", exact: true });
  await add.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Thêm quà", exact: true })).toHaveCount(0);
  await expect(add).toBeFocused();
  await add.click();
  await page.getByLabel("Tên quà", { exact: true }).fill("Phiếu ăn Jollibee");
  await page.getByLabel("Giá Xu", { exact: true }).fill("12000");
  await page.getByRole("button", { name: "Tạo quà", exact: true }).click();
  const auth = page.getByRole("dialog", { name: "Xác thực lại mật khẩu", exact: true });
  await expect(auth).toBeVisible();
  await auth.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await auth.getByRole("button", { name: "Xác thực", exact: true }).click();
  await expect(page.locator(".gift-modal")).toHaveCount(0);
  expect(writes.at(-1)?.body.name).toBe("Phiếu ăn Jollibee");
});

test("an uncertain refund preserves its key and locks new operations", async ({ page }) => {
  await setup(page);
  const keys: string[] = [];
  await page.route("**/api/v1/admin/gifts/g1/out-of-stock", async route => {
    keys.push(route.request().headers()["idempotency-key"]);
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf");
    if (keys.length === 1) await route.fulfill({ status: 503, json: { error: { code: "TEMPORARY_ERROR", message: "Chưa xác nhận kết quả." } } });
    else await route.fulfill({ json: { data: { refundedCount: 1, refundedXu: 12000, stock: 0 } } });
  });
  await page.goto("/admin/gifts");
  await page.getByRole("tab", { name: "Danh mục & tồn kho" }).click();
  await page.getByRole("button", { name: "Hết hàng và hoàn Xu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Thêm quà", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cập nhật tồn kho", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Thử lại thao tác", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã hoàn" })).toContainText("12.000 Xu");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await expect(page.getByRole("button", { name: "Thêm quà", exact: true })).toBeEnabled();
});

test("stock conflicts reload the editor and price-only updates preserve stock", async ({ page }) => {
  const writes = await setup(page);
  let requests = 0;
  await page.route("**/api/v1/admin/gifts/g1", async route => {
    const payload = route.request().postDataJSON();
    if (payload.stock !== undefined && requests++ === 0) {
      await route.fulfill({ status: 409, json: { error: { code: "GIFT_STOCK_CHANGED", message: "Tồn kho đã thay đổi. Vui lòng tải lại trước khi cập nhật." } } });
    } else await route.fallback();
  });
  await page.goto("/admin/gifts");
  await page.getByRole("tab", { name: "Danh mục & tồn kho" }).click();
  await page.getByRole("button", { name: "Cập nhật tồn kho", exact: true }).click();
  await page.getByLabel("Số lượng còn lại", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.locator(".admin-gift-error")).toContainText("Tồn kho đã thay đổi");
  await expect(page.getByLabel("Số lượng còn lại", { exact: true })).toHaveValue("3");
  await page.getByLabel("Số lượng còn lại", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.locator(".admin-gift-editor")).toHaveCount(0);
  await page.getByRole("button", { name: "Cập nhật giá", exact: true }).click();
  await page.getByLabel("Giá Xu", { exact: true }).fill("16000");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.locator(".admin-gift-editor")).toHaveCount(0);
  expect(writes.at(-1)?.body).toEqual({ costXu: 16000 });
});

test("admin gifts support 320px, English, dark mode and keyboard tabs", async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => localStorage.setItem("hoanxu.theme", "dark"));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/admin/gifts");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const tab = page.getByRole("tab", { name: "Yêu cầu đổi quà", exact: true });
  await tab.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Danh mục & tồn kho" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Danh mục & tồn kho" })).toHaveAttribute("aria-selected", "true");
  await switchLanguage(page, "EN");
  await expect(page.getByRole("button", { name: "Mark out of stock and refund Xu" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Add gift", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add gift", exact: true })).toBeVisible();
  await page.getByLabel("Description", { exact: true }).fill("Gift description");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("gift-editor-dark-320.png"), fullPage: true });
  await page.getByRole("button", { name: "Close editor", exact: true }).click();
  await page.getByRole("button", { name: "Continue editing", exact: true }).click();
  await expect(page.getByLabel("Description", {exact:true})).toHaveValue("Gift description");
  await page.getByRole("button", { name: "Close editor", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add gift", exact: true })).toBeFocused();
});
