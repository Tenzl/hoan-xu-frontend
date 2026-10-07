import { expect, test } from "@playwright/test";
import { settingsFixture } from "./settings-fixture";

test("one form saves publisher and Chrome together and restores after reload", async ({ page }) => {
  const fixture = await settingsFixture(page);
  await page.goto("/admin/cookies");
  await page.getByRole("button",{name:"Cấu hình kết nối",exact:true}).click();
  const panel = page.getByRole("region", { name: "Kết nối Shopee", exact: true });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true }).fill("987654321");
  await panel.getByLabel("Chế độ Chrome", { exact: true }).selectOption("remote");
  await panel.getByText("Nâng cao", { exact: true }).click();
  await panel.getByLabel("Địa chỉ Chrome từ xa (loopback)", { exact: true }).fill("http://127.0.0.1:9333");
  await panel.getByRole("button", { name: "Lưu cấu hình", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Lưu cấu hình", exact: true })).toBeDisabled();
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.writes[0].body).toMatchObject({ publisher: "987654321", mode: "remote", remoteUrl: "http://127.0.0.1:9333", enabled: false, version: "1:1" });
  await page.reload();
  await page.getByRole("button",{name:"Cấu hình kết nối",exact:true}).click();
  await expect(panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true })).toHaveValue("987654321");
  await expect(panel.getByLabel("Chế độ Chrome", { exact: true })).toHaveValue("remote");
  await expect(page.getByRole("button", { name: "Lưu Affiliate ID", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await panel.screenshot({ path: test.info().outputPath("shopee-settings.png") });
});

test("polling never overwrites a draft and conflicts preserve the entered publisher", async ({ page }) => {
  const fixture = await settingsFixture(page, { conflict: true });
  await page.goto("/admin/cookies");
  await page.getByRole("button",{name:"Cấu hình kết nối",exact:true}).click();
  const panel = page.getByRole("region", { name: "Kết nối Shopee" });
  await panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true }).fill("999999999");
  await page.getByRole("button",{name:"Phiên đăng nhập",exact:true}).click();
  await page.getByRole("button", { name: "Tôi đã đăng nhập — Kiểm tra phiên", exact: true }).click();
  await page.getByRole("button",{name:"Cấu hình kết nối",exact:true}).click();
  await expect(panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true })).toHaveValue("999999999");
  await panel.getByRole("button", { name: "Lưu cấu hình", exact: true }).click();
  await expect(panel.getByText("Cấu hình đã thay đổi ở nơi khác. Bản nháp của bạn vẫn được giữ.", { exact: true })).toBeVisible();
  await expect(panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true })).toHaveValue("999999999");
  await panel.getByRole("button", { name: "Bỏ bản nháp — Tải cấu hình mới", exact: true }).click();
  await expect(panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true })).toHaveValue(fixture.settings.publisher);
});

for (const fails of [false, true]) test(`native verification ${fails ? "failure blocks" : "success enables"} customer links`, async ({ page }) => {
  const fixture = await settingsFixture(page, { failVerification: fails });
  await page.goto("/admin/cookies");
  await page.getByRole("button",{name:"Cấu hình kết nối",exact:true}).click();
  const panel = page.getByRole("region", { name: "Kết nối Shopee" });
  const enabled = panel.getByLabel("Cho phép khách tạo link", { exact: true });
  await expect(enabled).toBeDisabled();
  await expect(panel.getByLabel("Đã xác minh tracking và Sub_id")).toHaveCount(0);
  await panel.getByLabel("Link sản phẩm để kiểm tra", { exact: true }).fill("https://shopee.vn/product/83496725/6939920023");
  await panel.getByRole("button", { name: "Kiểm tra sản phẩm và tracking", exact: true }).click();
  if (fails) { await expect(panel.getByRole("alert")).toContainText("Phiên Shopee Affiliate"); await expect(enabled).toBeDisabled(); }
  else {
    await expect(enabled).toBeEnabled(); await enabled.check();
    await panel.getByRole("button", { name: "Lưu cấu hình", exact: true }).click();
    await expect.poll(() => fixture.settings.enabled).toBe(true);
    await panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true }).fill("222222222");
    await expect(enabled).not.toBeChecked(); await expect(enabled).toBeDisabled();
  }
});

test("staff cannot edit configuration or self-verify tracking", async ({ page }) => {
  await settingsFixture(page, { role: "staff" }); await page.goto("/admin/cookies");
  await page.getByRole("button",{name:"Cấu hình kết nối",exact:true}).click();
  await expect(page.getByRole("region", { name: "Kết nối Shopee" })).toHaveCount(0);
});

test("a failed background refresh and recovery keep the unsaved draft", async ({ page }) => {
  await settingsFixture(page);
  await page.goto("/admin/cookies");
  await page.getByRole("button",{name:"Cấu hình kết nối",exact:true}).click();
  const panel = page.getByRole("region", { name: "Kết nối Shopee" });
  const publisher = panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true });
  await publisher.fill("999999999");
  await page.route("**/api/v1/admin/browser/settings", route => route.fulfill({
    status: 503, json: { error: { code: "INTERNAL_ERROR", message: "Không xử lý được yêu cầu." } },
  }));
  await expect(panel.getByRole("alert")).toBeVisible({ timeout: 20000 });
  await expect(publisher).toHaveValue("999999999");
  await page.unroute("**/api/v1/admin/browser/settings");
  await expect(panel.getByRole("alert")).toHaveCount(0, { timeout: 10000 });
  await expect(publisher).toHaveValue("999999999");
  await expect(panel.getByText("Có thay đổi chưa lưu", { exact: true })).toBeVisible();
});
