import { test, expect, type Page } from "@playwright/test";
import { openSidebar, switchLanguage } from "../../helpers/sidebar";

async function fixture(page: Page, options: { guest?: boolean; highest?: boolean; error?: boolean } = {}) {
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = options.guest ? null : { id: "user", name: "An", role: "customer" };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/me/dashboard")) {
      if (options.error) return route.fulfill({ status: 503, json: { error: { code: "UNAVAILABLE", message: "Chưa tải được quyền lợi của bạn." } } });
      data = { available: 0, membership: {
        tierCode: options.highest ? "diamond" : "member", nameVi: options.highest ? "Kim cương" : "Thân thiết", nameEn: options.highest ? "Diamond" : "Member",
        minGoldTotal: 0, minSharePercent: 50, maxSharePercent: 60, effectiveMinSharePercent: 45, effectiveMaxSharePercent: 54, previewAvailable: true, exchangeBonusPercent: 3,
        periodGoldTotal: 120000, goldToNext: 380000, goldToMaintain: 0, nextPeriodTierCode: "member", nextPeriodNameVi: "Thân thiết", nextPeriodNameEn: "Member",
        periodStartsAt: "2026-07-01T00:00:00+07:00", periodEndsAt: "2027-01-01T00:00:00+07:00",
        nextTier: options.highest ? null : { tierCode: "silver", nameVi: "Bạc ưu tiên", nameEn: "Priority Silver", minGoldTotal: 500000, minSharePercent: 60, maxSharePercent: 70, effectiveMinSharePercent: 54, effectiveMaxSharePercent: 63, previewAvailable: true, exchangeBonusPercent: 7 },
      } };
    }
    await route.fulfill({ json: { data } });
  });
}

test("membership menu opens current and next benefits from live membership data", async ({ page }) => {
  await fixture(page);
  await page.goto("/");
  await openSidebar(page);
  const link = page.locator(".nav").getByRole("link", { name: "Quyền lợi thành viên", exact: true });
  await expect(link).toHaveAttribute("href", "/membership");
  await link.click();
  await expect(page).toHaveURL(/\/membership$/);
  await expect(page.getByRole("heading", { name: "Quyền lợi thành viên", level: 1 })).toBeVisible();
  await expect(page.locator(".benefits-current")).toContainText("Thân thiết");
  await expect(page.locator(".benefits-current")).toContainText("45–54%");
  await expect(page.locator(".benefits-current")).toContainText("+3%");
  await expect(page.locator(".benefits-next")).toContainText("Bạc ưu tiên");
  await expect(page.locator(".benefits-next")).toContainText("54–63%");
  await expect(page.locator(".benefits-next")).toContainText("+7%");
  await expect(page.getByRole("progressbar", { name: "Tiến độ lên hạng" }).first()).toHaveAttribute("value", "120000");
  await expect(page.locator(".membership-benefits")).toContainText("380.000");
  await page.reload();
  await expect(page.locator(".benefits-current")).toContainText("45–54%");
  await openSidebar(page);
  await expect(page.locator(".nav").getByRole("link", { name: "Quyền lợi thành viên", exact: true })).toHaveAttribute("aria-current", "page");
  await switchLanguage(page, "EN");
  await expect(page.getByRole("heading", { name: "Membership benefits", level: 1 })).toBeVisible();
  await expect(page.locator(".benefits-next")).toContainText("Priority Silver");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.locator(".membership-benefits").screenshot({ path: test.info().outputPath("membership-benefits.png") });
});

test("membership handles highest tier, guests and retry after an API error", async ({ page }) => {
  await fixture(page, { highest: true });
  await page.goto("/membership");
  await expect(page.locator(".membership-benefits")).toContainText("Bạn đang ở hạng cao nhất");
  await expect(page.locator(".benefits-next")).toHaveCount(0);
  await page.unrouteAll();
  await fixture(page, { error: true });
  await page.reload();
  await expect(page.locator(".membership-benefits").getByRole("alert")).toBeVisible();
  await page.unrouteAll();
  await fixture(page);
  await page.locator(".membership-benefits").getByRole("button", { name: "Thử lại" }).click();
  await expect(page.locator(".benefits-current")).toContainText("Thân thiết");
  await page.unrouteAll();
  await fixture(page, { guest: true });
  await page.reload();
  await expect(page.getByRole("link", { name: "Tiếp tục với Google" })).toBeVisible();
  await expect(page.locator(".benefits-current")).toHaveCount(0);
});
