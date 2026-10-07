import { test, expect, type Page } from "@playwright/test";
import { switchLanguage, openSidebar, closeSidebar } from "../../helpers/sidebar";
const legacy = "22222222-2222-4222-8222-222222222222";
const campaignID = "33333333-3333-4333-8333-333333333333";
const endedID = "44444444-4444-4444-8444-444444444444";
const awardID = "55555555-5555-4555-8555-555555555555";
const gift = { id: "weekly-gift", name: "Tai nghe Bluetooth", stock: 9, active: true, costXu: 100, imageUrl: "https://gift.invalid/broken.png", icon: "gift", description: "Quà từ kho" };
const example = JSON.stringify([{ productName: "Tai nghe", orderedAt: "2026-10-05T10:30:00+07:00", cashback: 12000, note: "Bổ sung" }, { productName: "Bình", orderedAt: "2026-10-06T15:00:00+07:00", cashback: 8000 }]);
async function fixture(page: Page, options: { guest?: boolean; customer?: boolean; uncertain?: boolean; noProgram?: boolean; delivered?: boolean; future?: boolean } = {}) {
  await page.clock.setFixedTime(new Date("2026-10-07T10:00:00+07:00"));
  await page.route("https://gift.invalid/**", route => route.fulfill({ status: 404, body: "No image" }));
  const current: Record<string, any> = { id: campaignID, weekStart: "2026-10-05T00:00:00+07:00", weekEnd: "2026-10-12T00:00:00+07:00", giftId: gift.id, gift, title: "Top 5 tuần, rước quà về!", description: "Tích lũy Xu vàng, bứt phá Top 5 và nhận quà từ Hoàn Xu.", status: "active", reservedCount: 5, version: 1, settledAt: null };
  const ended = { ...current, id: endedID, weekStart: "2026-09-28T00:00:00+07:00", weekEnd: "2026-10-05T00:00:00+07:00" };
  const winners = [{ id: legacy, name: "Khách cũ", rank: 1, xu: 20000, orders: 2 }];
  let finalized = false, delivered = !!options.delivered, count = 0, firstKey = "";
  const calls: { path: string; body: any; key: string }[] = [];
  await page.route("**/api/v1/**", async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace("/api/v1", "");
    const body = req.method() === "GET" ? undefined : req.postDataJSON();
    const reply = (data: unknown, status = 200) => route.fulfill({ status, json: { data, meta: {} } });
    if (body) { calls.push({ path, body, key: req.headers()["idempotency-key"] }); expect(req.headers()["x-csrf-token"]).toBe("csrf-test"); }
    if (path === "/me") return options.guest ? route.fulfill({ status: 401, json: { error: { code: "UNAUTHENTICATED", message: "Login" } } }) : reply({ id: options.customer ? legacy : "admin", name: "Admin", role: options.customer ? "customer" : "admin", csrfToken: "csrf-test" });
    if (path === "/config") return reply({ brand: "Hoàn Xu" });
    if (path === "/notifications") return reply([]);
    if (path === "/affiliate-channels") return reply([]);
    if (path === "/leaderboard-prizes/current") return reply(options.noProgram ? null : options.future ? { ...current, weekStart: current.weekEnd } : current);
    if (path === "/leaderboards") return reply({ period: url.searchParams.get("period"), startsAt: current.weekStart, endsAt: current.weekEnd, asOf: "2026-10-07T10:00:00+07:00", participants: 1, items: winners });
    if (path === "/me/leaderboard") return reply({ rank: 1, xu: 20000, orders: 2, target: null, xuToNext: null, lead: null });
    const award = { id: awardID, campaignId: endedID, userId: legacy, userName: "Khách cũ", rank: 1, xu: 20000, orders: 2, gift, weekStart: ended.weekStart, weekEnd: ended.weekEnd, status: delivered ? "delivered" : "pending", deliveryNote: delivered ? "PRIVATE-VOUCHER" : "", deliveredAt: null };
    if (path === "/me/leaderboard-awards") return reply([award]);
    if (path === "/me/dashboard") return reply({});
    if (path === "/admin/gifts") return reply([gift]);
    if (path === "/admin/leaderboard-prizes") {
      if (body) { current.title = body.title; current.description = body.description; current.status = body.enabled ? "active" : "draft"; current.version++; return reply(current); }
      return reply([current, ended]);
    }
    if (path.endsWith("/preview")) return reply({ campaign: path.includes(endedID) ? { ...ended, status: finalized ? "settled" : "active" } : current, winners, hash: "a".repeat(64), canSettle: path.includes(endedID) && !finalized });
    if (path.endsWith("/settle")) { expect(body.hash).toBe("a".repeat(64)); finalized = true; return reply({ ...ended, status: "settled" }); }
    if (path.endsWith("/awards")) return reply(finalized ? [award] : []);
    if (path.endsWith("/deliver")) { expect(body.deliveryNote).toBe("PRIVATE-VOUCHER"); delivered = true; return reply({ id: awardID, status: "delivered" }); }
    if (path === "/admin/users") return reply([{ id: legacy, name: "Khách cũ", email: "", kind: "legacy", weekRank: 1, monthRank: 2, available: 20000, held: 0, giftHeld: 0, createdAt: "2026-01-01T00:00:00Z" }]);
    if (path === `/admin/users/${legacy}`) return reply({ id: legacy, name: "Khách cũ", email: "", kind: "legacy", weekRank: 1, monthRank: 2, available: count ? 20000 : 0, held: 0, giftHeld: 0 });
    if (path === `/admin/users/${legacy}/orders/batch`) {
      expect(body.orders).toHaveLength(2);
      const key = req.headers()["idempotency-key"]; expect(key).toBeTruthy();
      if (options.uncertain && !firstKey) { firstKey = key; count = 2; return route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR", message: "Network uncertainty" } } }); }
      if (firstKey) expect(key).toBe(firstKey);
      count = 2; return reply({ orders: [], totalCashback: 20000 }, 201);
    }
    if (path.includes("/orders") || path.includes("/checkins")) return reply([]);
    throw new Error(`Unexpected weekly API ${path}`);
  });
  return calls;
}
test("JSON preview validates indexed fields, downloads sample, and retries without duplicates", async ({ page }) => {
  const calls = await fixture(page, { uncertain: true });
  await page.goto(`/admin/legacy-users/${legacy}/orders`);
  await page.locator(".legacy-order-example summary").click();
  await expect(page.getByRole("heading", { name: "Mẫu nhập nhiều đơn JSON" })).toBeVisible();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Tải mẫu .json" }).click(); expect((await download).suggestedFilename()).toBe("mau-don-hang.json");
  await page.getByRole("button", { name: "Nhập nhiều đơn", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Nhập nhiều đơn JSON" });
  await modal.getByLabel("Mảng JSON (1–100 đơn)").fill(example.replace('"cashback":8000', '"cashback":0'));
  await modal.getByRole("button", { name: "Kiểm tra và xem trước" }).click();
  await expect(modal.getByRole("alert")).toContainText("Đơn 2 · cashback");
  await expect(modal.getByRole("button", { name: "Lưu tất cả đơn" })).toBeDisabled();
  await modal.getByLabel("Mảng JSON (1–100 đơn)").fill(example);
  await modal.getByRole("button", { name: "Kiểm tra và xem trước" }).click();
  await expect(modal).toContainText("20.000 Xu");
  await page.screenshot({ path: test.info().outputPath("batch-preview.png"), fullPage: true });
  await modal.getByRole("button", { name: "Lưu tất cả đơn" }).click();
  await expect(modal.getByLabel("Mảng JSON (1–100 đơn)")).toBeDisabled();
  await modal.getByRole("button", { name: "Gửi lại cùng dữ liệu" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator(".customer-summary")).toContainText("20.000 Xu");
  expect(calls.filter(c => c.path.endsWith("/batch"))).toHaveLength(2);
});
test("customer lists show leaders and top 5 ranks from the shared board", async ({ page }) => {
  await fixture(page); await page.goto("/admin/legacy-users");
  await expect(page.locator(".customer-leaders")).toContainText("Dẫn đầu tuần");
  await expect(page.locator(".customer-leaders")).toContainText("Dẫn đầu tháng");
  await page.getByRole("button",{name:"Chi tiết",exact:true}).click();
  await expect(page.locator(".customer-rank-prize")).toHaveCount(2);
  await expect(page.getByText("Hạng tuần",{exact:true})).toBeVisible();
});
test("weekly admin edits banner, prevents early finalization and delivers fixed winners", async ({ page }) => {
  await fixture(page); await page.goto("/admin/leaderboard-prizes");
  await page.getByLabel("Tiêu đề banner").fill("Top tuần nhận tai nghe");
  await page.getByRole("button", { name: "Lưu chương trình" }).click();
  await expect(page.getByText("Đã lưu chương trình tuần.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chốt người thắng", exact: true }).click();
  await page.getByRole("button", { name: "Xem trước top 5", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Xác nhận chốt tuần" })).toBeDisabled();
  await page.getByRole("button", { name: "Xem trước top 5", exact: true }).nth(1).click();
  await page.getByRole("button", { name: "Xác nhận chốt tuần" }).click();
  await expect(page.locator("table").getByRole("button", { name: "Trao quà", exact: true })).toBeVisible();
  await page.locator("table").getByRole("button", { name: "Trao quà", exact: true }).click();
  await page.getByLabel(/Mã voucher hoặc ghi chú giao quà/).fill("PRIVATE-VOUCHER");
  await page.getByRole("button", { name: "Xác nhận đã trao" }).click();
  await expect(page.getByText("PRIVATE-VOUCHER", { exact: true })).toBeVisible();
  await expect(page.locator("table").getByRole("button", { name: "Trao quà", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath("weekly-admin.png"), fullPage: true });
});
test("banner is visible to guests, fits 320px and supports English, dark and reduced motion", async ({ page }) => {
  await fixture(page, { guest: true }); await page.goto("/");
  await expect(page.locator(".weekly-banner")).toContainText("TOP");
  await expect(page.locator(".weekly-banner")).toContainText(gift.name);
  await expect(page.locator(".weekly-banner .gift-picture-frame svg")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 780 }); await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await openSidebar(page); await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click(); await closeSidebar(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.locator(".weekly-banner").getByRole("link", { name: "Xem cuộc đua" }).focus();
  await expect(page.locator(".weekly-banner-cta")).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("weekly-banner-320-dark.png"), fullPage: true });
  await switchLanguage(page, "EN");
  await expect(page.locator(".weekly-banner")).toContainText("One gift per winner");
  await page.locator(".weekly-banner-cta").click();
  await expect(page).toHaveURL(/\/top\?period=week/);
  await expect(page.locator(".weekly-banner-rules")).toBeVisible();
});
test("own rewards show private delivery details and no disabled banner", async ({ page }) => {
  await fixture(page, { customer: true, noProgram: true, delivered: true }); await page.goto("/top");
  await expect(page.locator(".weekly-banner")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Quà Top tuần của bạn" })).toBeVisible();
  await expect(page.locator(".weekly-awards")).toContainText("Đã trao");
  await expect(page.locator(".weekly-awards")).toContainText("PRIVATE-VOUCHER");
});
test("members see the current banner at home while future programs stay hidden", async ({ page }) => {
  await fixture(page, { customer: true }); await page.goto("/");
  await expect(page.locator(".weekly-banner")).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
  await fixture(page, { guest: true, future: true }); await page.goto("/top");
  await expect(page.locator(".top-place-1")).toBeVisible();
  await expect(page.locator(".weekly-banner")).toHaveCount(0);
});
