import { test, expect, type Page } from "@playwright/test";
import { openSidebar, closeSidebar } from "../../helpers/sidebar";

async function fixture(page: Page, options: { guest?: boolean; rank?: number | null; count?: number; error?: boolean; delayMonth?: boolean; large?: boolean } = {}) {
  const items = Array.from({ length: options.count ?? 10 }, (_, i) => ({ id: `u${i + 1}`, name: i === 0 ? "Nguyễn Minh Anh" : `Thành viên ${i + 1}`, rank: i + 1, xu: 1250000 - i * 70000, orders: 30 - i }));
  if (options.large) { items[0].name = "TênThànhViênRấtDài".repeat(5); items[0].xu = 1000000000000; }
  const info = (period: string) => ({ period, startsAt: period === "all" ? null : "2026-10-04T17:00:00Z", endsAt: period === "all" ? null : "2026-10-11T17:00:00Z", asOf: "2026-10-05T05:00:00Z", participants: 32 });
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    const period = url.searchParams.get("period") || "week";
    let data: unknown = [];
    if (url.pathname.endsWith("/me")) data = options.guest ? null : { id: "u" + (options.rank ?? 12), name: "Bạn thử nghiệm", role: "customer" };
    if (url.pathname.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (url.pathname.endsWith("/leaderboards")) {
      if (options.error) { await route.fulfill({ status: 500, json: { error: { code: "FAILED", message: "Không tải được bảng top" } } }); return; }
      if (options.delayMonth && period === "month") await new Promise(resolve => setTimeout(resolve, 700));
      data = { ...info(period), items: items.map(item => ({ ...item, xu: period === "month" ? item.xu * 2 : item.xu })) };
    }
    if (url.pathname.endsWith("/me/leaderboard")) {
      const rank = options.rank === undefined ? 12 : options.rank;
      data = { ...info(period), rank, xu: rank ? 400000 : 0, orders: rank ? 8 : 0, target: rank === 1 ? null : { ...items[0], rank: 11, xu: 450000 }, xuToNext: rank === 1 ? null : 50001, lead: rank === 1 ? 70000 : null };
    }
    await route.fulfill({ json: { data } });
  });
}

test("public podium and chart switch periods without stale values", async ({ page }, testInfo) => {
  await fixture(page, { guest: true, delayMonth: true });
  await page.goto("/top");
  await expect(page.getByRole("heading", { name: "Đua top Hoàn Xu", exact: true })).toBeVisible();
  await expect(page.locator(".top-podium .top-place-1")).toContainText("Nguyễn Minh Anh");
  await expect(page.getByRole("img", { name: "Biểu đồ tích lũy top 10" })).toBeVisible();
  await expect(page.locator(".top-ranking li")).toHaveCount(10);
  await expect(page.getByText("1 Xu = 1 đồng", { exact: true })).toBeVisible();
  await expect(page.locator(".top-personal").getByRole("link", { name: "Đăng nhập để xem hạng của bạn" })).toBeVisible();
  await page.getByRole("tab", { name: "Tháng", exact: true }).click();
  await expect(page).toHaveURL(/period=month/);
  await expect(page.locator(".top-skeleton")).toBeVisible();
  await expect(page.locator(".top-place-1 .top-amount")).toHaveText("2.500.000 Xu");
  await page.getByRole("tab", { name: "Toàn bộ", exact: true }).click();
  await expect(page).toHaveURL(/period=all/);
  await expect(page.locator(".top-place-1 .top-amount")).toHaveText("1.250.000 Xu");
  await expect(page.locator(".top-countdown")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("top.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("personal position is visible outside top 10", async ({ page }) => {
  await fixture(page);
  await page.goto("/top?period=month");
  await expect(page.locator(".top-personal")).toContainText("#12");
  await expect(page.locator(".top-personal")).toContainText("50.001 Xu");
  await expect(page.getByRole("link", { name: "Lấy link tích lũy Xu" })).toHaveAttribute("href", "/link");
});

test("leader and newcomer have accurate encouragement", async ({ page }) => {
  await fixture(page, { rank: 1 });
  await page.goto("/top");
  await expect(page.locator(".top-personal")).toContainText("Bạn đang dẫn đầu kỳ này");
  await expect(page.locator(".top-ranking li").first()).toContainText("Bạn");
  await page.unrouteAll();
  await fixture(page, { rank: null });
  await page.reload();
  await expect(page.locator(".top-personal")).toContainText("Đơn đầu tiên được duyệt sẽ đưa bạn vào cuộc đua.");
});

test("empty and small boards do not invent winners", async ({ page }) => {
  await fixture(page, { count: 0, guest: true });
  await page.goto("/top");
  await expect(page.getByText("Cuộc đua đang chờ người mở màn", { exact: true })).toBeVisible();
  await expect(page.locator(".top-ranking li")).toHaveCount(0);
  await page.unrouteAll();
  await fixture(page, { count: 1, guest: true });
  await page.reload();
  await expect(page.locator(".top-place-1")).toContainText("Nguyễn Minh Anh");
  await expect(page.locator(".top-podium .top-vacant")).toHaveCount(2);
});

test("errors can be retried and keyboard motion respects preferences", async ({ page }) => {
  await fixture(page, { error: true, guest: true });
  await page.goto("/top");
  await expect(page.getByRole("alert").filter({ hasText: "Không tải được bảng top" })).toBeVisible();
  await page.unrouteAll();
  await fixture(page, { guest: true });
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".top-place-1")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.getByRole("tab", { name: "Tuần", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Tháng", exact: true })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Tháng", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".top-screen")).toHaveAttribute("data-keyboard", "true");
});

test("long names and large amounts fit in light and dark themes", async ({ page }, testInfo) => {
  await fixture(page, { guest: true, large: true });
  await page.goto("/top");
  await expect(page.locator(".top-place-1 .top-amount")).toHaveAttribute("title", "1.000.000.000.000 Xu");
  await openSidebar(page);
  await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click();
  await closeSidebar(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("top-dark.png"), fullPage: true });
});
