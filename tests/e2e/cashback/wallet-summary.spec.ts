import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

type Options = { green?: number; available?: number; debt?: number; rank?: number | null; campaign?: boolean; award?: "pending" | "delivered"; guest?: boolean; errorWallet?: boolean; errorRank?: boolean; expiredCampaign?: boolean };
async function fixture(page: Page, options: Options = {}) {
  const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const requests: string[] = [];
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    let data: unknown = [];
    if (path.endsWith("/me")) data = options.guest ? null : { id: "wallet-user", role: "customer", name: "An", csrfToken: "csrf", bankDetails: {} };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/me/dashboard")) {
      if (options.errorWallet) return route.fulfill({ status: 503, json: { error: { message: "Unavailable" } } });
      data = { available: options.available ?? 70000, greenAvailable: options.green ?? 1250, greenGiftHeld: 200, pending: 20000, held: 1000, debt: options.debt ?? 0, goldUsed: 10000, totalOrders: 12, pendingOrders: 4, approvedOrders: 8, membership: { tierCode: "member", nameVi: "Thân thiết", nameEn: "Member", minGoldTotal: 0, minSharePercent: 50, maxSharePercent: 60, periodGoldTotal: 100000, goldToMaintain: 0, nextTier: { tierCode: "silver", nameVi: "Bạc", nameEn: "Silver", minGoldTotal: 500000 } } };
    }
    if (path.endsWith("/affiliate-channels")) data = [{ id: "shopee", name: "Shopee", status: "available" }];
    if (path.endsWith("/me/leaderboard")) {
      if (options.errorRank) return route.fulfill({ status: 503, json: { error: { message: "Unavailable" } } });
      data = { period: "week", startsAt: start, endsAt: end, rank: options.rank === undefined ? 3 : options.rank, xu: 95000, orders: 8, participants: 23 };
    }
    const gift = { id: "gift", name: "Voucher mua sắm 100.000đ", imageUrl: "" };
    if (path.endsWith("/leaderboard-prizes/current")) data = options.campaign ? { id: "campaign", status: "active", weekStart: start, weekEnd: options.expiredCampaign ? start : end, gift } : null;
    if (path.endsWith("/me/leaderboard-awards")) data = options.award ? [{ id: "award", weekStart: start, weekEnd: end, rank: 2, gift, status: options.award, deliveryNote: options.award === "delivered" ? "Mã voucher: HOANXU-2026" : "" }] : [];
    await route.fulfill({ json: { data } });
  });
  return requests;
}

test("both real balances, weekly rank and membership stay visible without automatic switching", async ({ page }) => {
  const requests = await fixture(page);
  await page.clock.install();
  await page.goto("/link");
  const wallet = page.locator(".wallet-summary");
  await expect(wallet.locator(".wallet-balance-value")).toHaveText("70.000Xu");
  await expect(wallet.locator(".wallet-green-amount")).toHaveText("1.250Xu");
  await expect(wallet.locator(".wallet-weekly-rank>strong")).toHaveText("#3");
  await expect(wallet.locator(".wallet-weekly-rank")).toContainText("95.000 Xu · 8 đơn được duyệt");
  await expect(wallet.locator(".wallet-summary-membership")).toContainText("Thân thiết");
  await expect(wallet.getByRole("button", { name: "Rút tiền", exact: true })).toBeEnabled();
  await expect(wallet.getByRole("link", { name: "Đổi quà", exact: true })).toHaveAttribute("href", "/gift");
  await expect(wallet.getByRole("link", { name: "Đổi xu", exact: true })).toHaveAttribute("href", "/wallet?exchange=1");
  await expect(wallet.getByRole("link", { name: "Xem bảng xếp hạng tuần" })).toHaveAttribute("href", "/top?period=week");
  await expect(wallet.getByRole("link", { name: "Xem quyền lợi", exact: true })).toHaveAttribute("href", "/membership");
  const before = await wallet.locator(".wallet-summary-card").boundingBox();
  await page.clock.runFor(55000);
  await expect(wallet.locator(".wallet-balance-value")).toHaveText("70.000Xu");
  await expect(wallet.locator(".wallet-green-amount")).toHaveText("1.250Xu");
  const after = await wallet.locator(".wallet-summary-card").boundingBox();
  expect(after!.height).toBeCloseTo(before!.height, 0);
  await expect(wallet.locator(".wallet-carousel-dot")).toHaveCount(0);
  expect(requests.some(path => path.endsWith("/me/leaderboard"))).toBeTruthy();
});

for (const status of ["pending", "delivered"] as const) test(`weekly prize and confirmed ${status} reward have distinct labels`, async ({ page, isMobile }) => {
  await fixture(page, { campaign: true, award: status });
  await page.setViewportSize(isMobile ? { width: 375, height: 900 } : { width: 1440, height: 1100 });
  await page.goto("/link");
  const wallet = page.locator(".wallet-summary");
  await expect(wallet.locator(".wallet-weekly>.wallet-weekly-prize")).toContainText("Quà cho Top 5 tuần này");
  await expect(wallet.locator(".wallet-weekly>.wallet-weekly-prize")).toContainText("Chốt thưởng sau khi tuần kết thúc.");
  await expect(wallet.locator(".wallet-earned-prize")).toContainText(status === "pending" ? "Chờ trao" : "Đã trao");
  if (status === "delivered") await expect(wallet.locator(".wallet-award-note")).toHaveText("Mã voucher: HOANXU-2026");
  await page.screenshot({ path: test.info().outputPath(`wallet-${status}.png`), fullPage: true });
  await switchLanguage(page, "EN");
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await expect(wallet.getByRole("heading", { name: "This week's rank" })).toBeVisible();
  await expect(wallet.locator(".wallet-earned-prize")).toContainText(status === "pending" ? "Awaiting delivery" : "Delivered");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath(`wallet-${status}-dark-en.png`), fullPage: true });
});

test("empty weekly rank, zero green balance and expired campaign do not invent rewards", async ({ page }) => {
  await fixture(page, { green: 0, rank: null, campaign: true, expiredCampaign: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/link");
  const wallet = page.locator(".wallet-summary");
  await expect(wallet.locator(".wallet-green-amount")).toHaveText("0Xu");
  await expect(wallet.locator(".wallet-weekly-position")).toContainText("Chưa có hạng");
  await expect(wallet.locator(".wallet-prize-loading")).toHaveCount(0);
  await expect(wallet.locator(".wallet-weekly-prize,.wallet-earned-prize")).toHaveCount(0);
  await wallet.locator("summary").click();
  await expect(wallet.locator(".wallet-summary-breakdown")).toContainText("20.000");
  await expect(wallet.locator(".wallet-summary-breakdown")).toContainText("200");
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
});

for (const options of [{ available: 49999, debt: 0 }, { available: 70000, debt: 1000 }]) test(`withdrawal stays disabled for ${options.available} available and ${options.debt} debt`, async ({ page }) => {
  await fixture(page, options);
  await page.goto("/link");
  const wallet = page.locator(".wallet-summary");
  await expect(wallet.getByRole("button", { name: "Rút tiền", exact: true })).toBeDisabled();
  await expect(wallet.getByRole("progressbar", { name: "Tiến độ đạt ngưỡng rút tiền" })).toHaveAttribute("value", String(Math.min(options.available, 50000)));
});

test("refresh keeps balances in place and withdrawal dialog returns focus to its stable trigger", async ({ page }) => {
  await fixture(page);
  await page.clock.install();
  await page.goto("/link");
  const wallet = page.locator(".wallet-summary");
  const withdraw = wallet.getByRole("button", { name: "Rút tiền", exact: true });
  await expect(withdraw).toBeEnabled();
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/me/dashboard", async route => { await waiting; await route.fallback(); });
  await wallet.getByRole("button", { name: "Tải lại số dư ví" }).click();
  await expect(wallet.getByRole("button", { name: "Tải lại số dư ví" })).toBeDisabled();
  await expect(wallet.locator(".wallet-balance-value")).toHaveText("70.000Xu");
  await expect(wallet.locator(".wallet-summary-loading")).toHaveCount(0);
  release();
  await expect(wallet.getByRole("button", { name: "Tải lại số dư ví" })).toBeEnabled();
  await withdraw.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.clock.runFor(5500);
  await expect(wallet.locator(".wallet-balance-value")).toHaveText("70.000Xu");
  await page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(withdraw).toBeFocused();
});

test("rank failure leaves balances usable and guest makes no personal rank or award requests", async ({ page }) => {
  await fixture(page, { errorRank: true });
  await page.goto("/link");
  const wallet = page.locator(".wallet-summary");
  await expect(wallet.locator(".wallet-weekly-error")).toContainText("Chưa tải được hạng tuần.");
  await expect(wallet.locator(".wallet-balance-value")).toHaveText("70.000Xu");
  await expect(wallet.getByRole("button", { name: "Rút tiền", exact: true })).toBeEnabled();
  const requests = await fixture(page, { guest: true });
  await page.reload();
  await expect(wallet.getByRole("link", { name: "Đăng nhập Google" })).toBeVisible();
  await expect(wallet.locator(".wallet-balance-gold,.wallet-weekly,.wallet-summary-membership")).toHaveCount(0);
  expect(requests.filter(path => path.endsWith("/me/leaderboard") || path.endsWith("/me/leaderboard-awards"))).toEqual([]);
});

test("initial loading and failure never expose a withdrawal action", async ({ page }) => {
  await fixture(page, { errorWallet: true });
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/me/dashboard", async route => { await waiting; await route.fallback(); });
  await page.goto("/link");
  const wallet = page.locator(".wallet-summary");
  await expect(wallet.getByRole("status", { name: "Đang tải ví…" })).toBeVisible();
  await expect(wallet.getByRole("button", { name: "Rút tiền", exact: true })).toHaveCount(0);
  release();
  await expect(wallet.getByRole("alert")).toContainText("Chưa tải được ví của bạn.");
  await expect(wallet.getByRole("button", { name: "Thử lại" })).toBeVisible();
  await expect(wallet.getByRole("button", { name: "Rút tiền", exact: true })).toHaveCount(0);
});
