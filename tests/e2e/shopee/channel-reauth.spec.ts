import { expect, test } from "@playwright/test";
import { settingsFixture } from "./settings-fixture";

for (const recent of [false, true]) test(`unified configuration requests password only when recent=${recent}`, async ({ page }) => {
  const fixture = await settingsFixture(page, { recent }); await page.goto("/admin/cookies");
  const panel = page.getByRole("region", { name: "Kết nối Shopee" });
  await panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true }).fill("987654321");
  const password = panel.getByLabel("Xác nhận mật khẩu quản trị để lưu hoặc kiểm tra", { exact: true });
  if (!recent) await password.fill("settings-password"); else await expect(password).toHaveCount(0);
  await panel.getByRole("button", { name: "Lưu cấu hình", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Lưu cấu hình", exact: true })).toBeDisabled();
  expect(fixture.writes.map(w => w.path)).toEqual(recent ? ["/api/v1/admin/browser/settings"] : ["/api/v1/auth/internal/reauth", "/api/v1/admin/browser/settings"]);
  await expect(password).toHaveCount(0);
});

test("wrong password keeps the draft and never sends a settings write", async ({ page }) => {
  const fixture = await settingsFixture(page, { recent: false }); await page.goto("/admin/cookies");
  const panel = page.getByRole("region", { name: "Kết nối Shopee" });
  await panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true }).fill("987654321");
  const password = panel.getByLabel("Xác nhận mật khẩu quản trị để lưu hoặc kiểm tra", { exact: true });
  await password.fill("wrong-password"); await panel.getByRole("button", { name: "Lưu cấu hình", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Mật khẩu không đúng.");
  expect(fixture.writes.filter(w => w.path.endsWith("/settings"))).toHaveLength(0);
  await expect(panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true })).toHaveValue("987654321");
  await password.fill("settings-password"); await panel.getByRole("button", { name: "Lưu cấu hình", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Lưu cấu hình", exact: true })).toBeDisabled();
});

test("a save error keeps the draft and never reports success", async ({ page }) => {
  await settingsFixture(page, { rejectSave: true }); await page.goto("/admin/cookies");
  const panel = page.getByRole("region", { name: "Kết nối Shopee" });
  await panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true }).fill("987654321");
  await panel.getByRole("button", { name: "Lưu cấu hình", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Không xử lý được yêu cầu.");
  await expect(panel.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true })).toHaveValue("987654321");
  await expect(panel.getByText("Đã lưu và áp dụng cấu hình.", { exact: true })).toHaveCount(0);
});

test("affiliate settings links to the single Shopee form", async ({ page }) => {
  await settingsFixture(page); await page.goto("/admin/settings");
  await page.getByRole("link", { name: "Kết nối Shopee", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/cookies$/);
  await expect(page.getByRole("region", { name: "Kết nối Shopee" })).toBeVisible();
});
