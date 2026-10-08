import { test, expect, type Page } from "@playwright/test";
import { openSidebar, switchLanguage } from "../../helpers/sidebar";

const tiers = [
  { tierCode: "member", nameVi: "Thân thiết", nameEn: "Member", minGoldTotal: 0, minSharePercent: 45, maxSharePercent: 54, previewAvailable: true, exchangeBonusPercent: 3 },
  { tierCode: "silver", nameVi: "Bạc ưu tiên", nameEn: "Priority Silver", minGoldTotal: 500000, minSharePercent: 54, maxSharePercent: 63, previewAvailable: true, exchangeBonusPercent: 7 },
  { tierCode: "gold", nameVi: "Vàng", nameEn: "Gold", minGoldTotal: 1500000, minSharePercent: 63, maxSharePercent: 72, previewAvailable: true, exchangeBonusPercent: 10 },
  { tierCode: "diamond", nameVi: "Kim cương", nameEn: "Diamond", minGoldTotal: 3000000, minSharePercent: 72, maxSharePercent: 81, previewAvailable: true, exchangeBonusPercent: 15 },
];

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
        minGoldTotal: 0, minSharePercent: 50, maxSharePercent: 60, effectiveMinSharePercent: 45, effectiveMaxSharePercent: 54, previewAvailable: true, exchangeBonusPercent: 3, tiers,
        periodGoldTotal: 120000, goldToNext: 380000, goldToMaintain: 0, nextPeriodTierCode: "member", nextPeriodNameVi: "Thân thiết", nextPeriodNameEn: "Member",
        periodStartsAt: "2026-07-01T00:00:00+07:00", periodEndsAt: "2027-01-01T00:00:00+07:00",
        nextTier: options.highest ? null : { tierCode: "silver", nameVi: "Bạc ưu tiên", nameEn: "Priority Silver", minGoldTotal: 500000, minSharePercent: 60, maxSharePercent: 70, effectiveMinSharePercent: 54, effectiveMaxSharePercent: 63, previewAvailable: true, exchangeBonusPercent: 7 },
      } };
    }
    await route.fulfill({ json: { data } });
  });
}

test("overview ends with full personal benefits and discovery opens the four tier guide", async ({ page }) => {
  await fixture(page);
  await page.goto("/");
  const personal = page.locator(".overview-membership");
  await expect(personal.locator(".benefits-current")).toContainText("45–54%");
  await expect(personal.locator(".benefits-current")).toContainText("+3%");
  await expect(personal.locator(".benefits-next")).toContainText("Bạc ưu tiên");
  await expect(personal.locator(".benefits-next")).toContainText("54–63%");
  await expect(personal.locator(".benefits-next")).toContainText("+7%");
  await expect(personal.getByRole("progressbar", { name: "Tiến độ lên hạng" })).toHaveAttribute("value", "120000");
  await expect(personal).toContainText("380.000");
  await expect(personal.getByRole("heading", { name: "Hiểu quyền lợi thành viên" })).toBeVisible();
  expect(await personal.evaluate(element => element === element.parentElement?.lastElementChild)).toBeTruthy();
  await personal.screenshot({ path: test.info().outputPath("overview-membership.png") });
  await openSidebar(page);
  const nav = page.locator(".nav");
  await expect(nav.locator(".nav-item-group a[href='/membership']")).toHaveCount(0);
  const gift = nav.getByRole("link", { name: "Đổi quà", exact: true });
  await expect(gift).toHaveAttribute("href", "/gift");
  await gift.click();
  await expect(page).toHaveURL(/\/gift$/);
  await expect(page.getByRole("heading", { name: "Đổi quà", level: 1 })).toBeVisible();
  await openSidebar(page);
  await expect(gift).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Khám phá", exact: true })).not.toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Khám phá", exact: true }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.locator(".discover-grid a[href='/gift']")).toHaveCount(0);
  const link = page.locator(".discover-grid").getByRole("link", { name: /Quyền lợi thành viên/ });
  await expect(link).toHaveAttribute("href", "/membership");
  await link.click();
  await expect(page).toHaveURL(/\/membership$/);
  await expect(page.getByRole("heading", { name: "Quyền lợi thành viên", level: 1 })).toBeVisible();
  const guide = page.locator(".membership-benefits");
  await expect(guide.locator(".membership-tier")).toHaveCount(4);
  for (const tier of tiers) {
    const card = guide.getByRole("region", { name: tier.nameVi, exact: true });
    await expect(card).toContainText(`${tier.minSharePercent}–${tier.maxSharePercent}%`);
    await expect(card).toContainText(`+${tier.exchangeBonusPercent}%`);
    await expect(card).toContainText(tier.minGoldTotal.toLocaleString("vi-VN"));
  }
  await expect(guide.locator(".benefits-current, .benefits-next, .reward-upgrade")).toHaveCount(0);
  await expect(guide.getByRole("heading", { name: "Hiểu quyền lợi thành viên" })).toBeVisible();
  await page.reload();
  await expect(guide.locator(".membership-tier")).toHaveCount(4);
  await openSidebar(page);
  await expect(nav.getByRole("link", { name: "Khám phá", exact: true })).toHaveAttribute("aria-current", "page");
  await switchLanguage(page, "EN");
  await expect(page.getByRole("heading", { name: "Membership benefits", level: 1 })).toBeVisible();
  await expect(guide.getByRole("region", { name: "Priority Silver", exact: true })).toContainText("54–63%");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.locator(".membership-benefits").screenshot({ path: test.info().outputPath("membership-benefits.png") });
});

test("personal benefits handle highest tier and retry while the guide keeps all four tiers", async ({ page }) => {
  await fixture(page, { highest: true });
  await page.goto("/");
  await expect(page.locator(".overview-membership")).toContainText("Bạn đang ở hạng cao nhất");
  await expect(page.locator(".overview-membership .benefits-next")).toHaveCount(0);
  await page.goto("/membership");
  await expect(page.locator(".membership-tier")).toHaveCount(4);
  await page.unrouteAll();
  await fixture(page, { error: true });
  await page.reload();
  await expect(page.locator(".membership-benefits").getByRole("alert")).toBeVisible();
  await page.unrouteAll();
  await fixture(page);
  await page.locator(".membership-benefits").getByRole("button", { name: "Thử lại" }).click();
  await expect(page.locator(".membership-tier")).toHaveCount(4);
  await page.unrouteAll();
  await fixture(page, { guest: true });
  await page.reload();
  await expect(page.getByRole("link", { name: "Tiếp tục với Google" })).toBeVisible();
  await expect(page.locator(".benefits-current")).toHaveCount(0);
});
