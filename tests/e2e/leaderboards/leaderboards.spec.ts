import { test, expect, type Page } from "@playwright/test";
import { openSidebar, closeSidebar } from "../../helpers/sidebar";

async function fixture(page: Page, options: { guest?: boolean; rank?: number | null; count?: number; error?: boolean; delayMonth?: boolean; large?: boolean; zero?: boolean } = {}) {
  const items = Array.from({ length: options.count ?? 10 }, (_, i) => ({ id: `u${i + 1}`, name: i === 0 ? "Nguyễn Minh Anh" : `Thành viên ${i + 1}`, rank: i + 1, xu: 1250000 - i * 70000, orders: 30 - i }));
  if (options.large) { items[0].name = "TênThànhViênRấtDài".repeat(5); items[0].xu = 1000000000000; }
  if (options.zero) items.forEach(item => { item.xu = 0; });
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
  await expect(page.getByRole("heading", { name: "Bảng xếp hạng", exact: true, level: 1 })).toBeVisible();
  await expect(page.locator(".top-participants")).toHaveCount(0);
  await expect(page.locator(".top-podium .top-place-1")).toContainText("Nguyễn Minh Anh");
  await expect(page.getByRole("figure", { name: "Biểu đồ tích lũy top 10" })).toBeVisible();
  await expect(page.locator(".top-ranking li")).toHaveCount(10);
  await expect(page.locator(".top-intro")).toHaveCount(0);
  await expect(page.locator(".top-personal").getByRole("link", { name: "Đăng nhập để xem hạng của bạn" })).toBeVisible();
  await page.getByRole("tab", { name: "Tháng", exact: true }).click();
  await expect(page).toHaveURL(/period=month/);
  await expect(page.locator(".top-skeleton")).toBeVisible();
  await expect(page.locator(".top-place-1 .top-amount")).toHaveText("2.500.000");
  await page.getByRole("tab", { name: "Toàn bộ", exact: true }).click();
  await expect(page).toHaveURL(/period=all/);
  await expect(page.locator(".top-place-1 .top-amount")).toHaveText("1.250.000");
  await expect(page.locator(".top-countdown")).toHaveCount(0);
  await expect(page.locator(".top-place-3")).toHaveCSS("opacity", "1");
  await expect(page.locator(".top-race-bar").last()).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await page.screenshot({ path: testInfo.outputPath("top.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("personal position is visible outside top 10", async ({ page }) => {
  await fixture(page);
  await page.goto("/top?period=month");
  await expect(page.locator(".top-personal")).toContainText("#12");
  await expect(page.locator(".top-personal")).toContainText("50.001");
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
  await expect(page.locator(".top-place-1 .top-amount")).toHaveText("1.000.000.000.000");
  await expect(page.locator(".top-race-value").first()).toContainText("1.000.000.000.000 Xu");
  expect(await page.locator(".top-place-1 .top-amount .num").evaluate(element => {
    const value = element.getBoundingClientRect();
    const card = element.closest(".top-place")!.getBoundingClientRect();
    return value.left >= card.left && value.right <= card.right;
  })).toBeTruthy();
  await openSidebar(page);
  await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click();
  await closeSidebar(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("top-dark.png"), fullPage: true });
});

test("chart bars show proportional earnings and reveal the selected member", async ({ page }) => {
  await fixture(page, { rank: 2 });
  await page.goto("/top");
  const rows = page.locator(".top-race-row");
  await expect(rows).toHaveCount(10);
  await expect(page.locator(".top-race-bar").nth(0)).toHaveAttribute("width", "1000");
  await expect(page.locator(".top-race-bar").nth(1)).toHaveAttribute("width", "944");
  await expect(page.locator(".top-ranking .top-self")).toContainText("Thành viên 2");
  await rows.nth(1).click();
  await expect(rows.nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#top-entry-u2")).toContainText("Cách người dẫn đầu 70.000 Xu");
  await rows.first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#top-entry-u1")).toContainText("Đang dẫn đầu");
  await expect(page.locator("#top-entry-u2")).toBeHidden();
  await page.getByRole("tab", { name: "Tháng", exact: true }).click();
  await expect(page.locator(".top-race-value").first()).toContainText("2.500.000 Xu");
  await expect(page.locator(".top-race-detail:visible")).toHaveCount(0);
});

test("zero earnings keep zero-length bars and reduced motion disables chart animation", async ({ page }) => {
  await fixture(page, { guest: true, count: 2, zero: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/top");
  const bars = page.locator(".top-race-bar");
  await expect(bars).toHaveCount(2);
  for (const bar of await bars.all()) {
    await expect(bar).toHaveAttribute("width", "0");
    expect(await bar.evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  }
  await expect(page.locator(".top-race-axis")).toHaveText("0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("chart fits 320px with large values and English labels", async ({ page }) => {
  await fixture(page, { guest: true, large: true });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    localStorage.setItem("hoanxu.language", "en");
    localStorage.setItem("hoanxu.theme", "dark");
  });
  await page.goto("/top");
  await expect(page.getByRole("figure", { name: "Top 10 earnings chart" })).toBeVisible();
  await expect(page.locator(".top-race-value").first()).toContainText("1,000,000,000,000 Xu");
  await page.locator(".top-race-row").nth(1).click();
  await expect(page.locator("#top-entry-u2")).toContainText("Behind the leader by 999,998,820,000 Xu");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("overview celebrates the monthly top five with the winner centered", async ({ page }, testInfo) => {
  await fixture(page, { rank: 2 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const podium = page.getByLabel("Bục vinh danh top 5");
  await expect(podium).toBeVisible();
  await expect(podium.locator(".top-place")).toHaveCount(5);
  await expect(page.locator(".top-participants")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bứt phá cùng Hoàn Xu" })).toBeVisible();
  await expect(podium.locator(".top-place-1")).toContainText("Nguyễn Minh Anh");
  await expect(podium.locator(".top-place-1 .top-amount")).toHaveText("2.500.000");
  await expect(podium.locator(".top-place-4")).toContainText("Thành viên 4");
  await expect(podium.locator(".top-place-5")).toContainText("Thành viên 5");
  await expect(page.getByRole("link", { name: "Xem bảng xếp hạng →" })).toHaveAttribute("href", "/top?period=month");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const centers = await podium.locator(".top-place").evaluateAll(cards => Object.fromEntries(cards.map(card => { const box = card.getBoundingClientRect(); return [card.querySelector('.top-place-badge')!.textContent!.trim(), box.left + box.width / 2]; })));
    expect(centers["TOP 2"]).toBeLessThan(centers["TOP 1"]);
    expect(centers["TOP 1"]).toBeLessThan(centers["TOP 3"]);
    const heights = await podium.locator(".top-place").evaluateAll(cards => Object.fromEntries(cards.map(card => [card.querySelector('.top-place-badge')!.textContent!.trim(), card.getBoundingClientRect().height])));
    for (let rank = 1; rank < 5; rank++) {
      expect(heights[`TOP ${rank}`], `Top ${rank} must stand higher than top ${rank + 1} at ${width}px`).toBeGreaterThan(heights[`TOP ${rank + 1}`] + 8);
    }
  }
  await podium.locator("..").screenshot({ path: testInfo.outputPath("overview-top-five.png") });
});
