import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

async function giftPage(page: Page, available = 30000, stock = 1) {
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "customer", name: "An", role: "customer", csrfToken: "csrf", permissions: [] };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/wallet")) data = { available: 0, greenAvailable:available, held: 0, giftHeld: 0, debt: 0, unit: "xu" };
    if (path.endsWith("/gifts")) data = [{ id: "g1", name: "Voucher Shopee 50K", channel: "shopee", costXu: 10500, stock, active: true }];
    await route.fulfill({ json: { data } });
  });
}

for (const [name, available, stock] of [["insufficient Xu", 10499, 1], ["no stock", 30000, 0]] as const) {
  test(`gift redemption is disabled with ${name}`, async ({ page }) => {
    await giftPage(page, available, stock);
    await page.goto("/gift");
    await expect(page.getByRole("button", { name: "Đổi voucher", exact: true })).toBeDisabled();
    await expect(page.getByText("Hoàn tiền và Xu điểm danh cùng tích lũy vào ví. 1 Xu = 1đ.", { exact: true })).toHaveCount(0);
  });
}

test("gift submission locks all buttons and sends one authenticated request", async ({ page }) => {
  await giftPage(page);
  let calls = 0;
  let finish!: () => void;
  const hold = new Promise<void>(resolve => { finish = resolve; });
  await page.route("**/api/v1/gift-redemptions", async route => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ giftId: "g1", expectedCostXu: 10500 });
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf");
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    await hold;
    await route.fulfill({ json: { data: { id: "redemption", costXu: 10500, status: "pending" } } });
  });
  await page.goto("/gift");
  const button = page.getByRole("button", { name: "Đổi voucher", exact: true });
  await button.click();
  await expect(page.getByRole("button",{name:"Đang đổi…",exact:true})).toBeDisabled();
  expect(calls).toBe(1);
  finish();
  await expect(page.getByRole("link", { name: "Xem yêu cầu trong Lịch sử" })).toHaveAttribute("href", "/history?tab=gifts");
  expect(calls).toBe(1);
});

test("stock lost during submission displays an error without success and allows retry", async ({ page }) => {
  await giftPage(page);
  await page.route("**/api/v1/gift-redemptions", route => route.fulfill({ status: 409, json: { error: { code: "OUT_OF_STOCK", message: "Quà đã hết hàng." } } }));
  await page.goto("/gift");
  const button = page.getByRole("button", { name: "Đổi voucher", exact: true });
  await button.click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Quà đã hết hàng.");
  await expect(page.getByRole("link", { name: "Xem yêu cầu trong Lịch sử" })).toHaveCount(0);
  await expect(button).toBeEnabled();
});

test("a balance error locks redemption and can be retried", async ({ page }) => {
  await giftPage(page);
  let failed = true;
  await page.route("**/api/v1/wallet", async route => {
    await route.fulfill(failed ? { status: 503, json: { error: { code: "UNAVAILABLE", message: "Không tải được ví." } } } : { json: { data: { available: 0, greenAvailable:30000, giftHeld: 0, held: 0, debt: 0, unit: "xu" } } });
  });
  await page.goto("/gift");
  await expect(page.getByRole("button", { name: "Đổi voucher", exact: true })).toBeDisabled();
  await expect(page.locator("main").getByRole("alert")).toContainText("Chưa tải được số dư");
  failed = false;
  await page.getByRole("button", { name: "Thử lại số dư", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đổi voucher", exact: true })).toBeEnabled();
  await expect(page.locator(".gift-wallet-main")).toContainText("30.000");
});

test("a changed price is refreshed before a new redemption", async ({ page }) => {
  await giftPage(page);
  let cost = 10500;
  const submitted: number[] = [];
  await page.route("**/api/v1/gifts", route => route.fulfill({ json: { data: [{ id: "g1", name: "Voucher Shopee 50K", channel: "shopee", costXu: cost, active: true, stock: 1 }] } }));
  await page.route("**/api/v1/gift-redemptions", async route => {
    submitted.push(route.request().postDataJSON().expectedCostXu);
    if (submitted.length === 1) {
      cost = 12000;
      await route.fulfill({ status: 409, json: { error: { code: "GIFT_PRICE_CHANGED", message: "Giá đổi quà đã thay đổi. Vui lòng kiểm tra lại." } } });
    } else await route.fulfill({ json: { data: { id: "redemption", costXu: cost, status: "pending" } } });
  });
  await page.goto("/gift");
  await page.getByRole("button", { name: "Đổi voucher", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Giá đổi quà đã thay đổi");
  await expect(page.locator(".gift-price")).toHaveText("12.000");
  await page.getByRole("button", { name: "Đổi voucher", exact: true }).click();
  await expect(page.locator(".gift-success")).toContainText("12.000");
  expect(submitted).toEqual([10500, 12000]);
});

for (const failure of ["network", "server"] as const) {
 test(`an uncertain ${failure} result retries the same quote/key after stock and price change`, async ({ page }) => {
  await giftPage(page);
  const keys: string[] = [];
  let stock = 1;
  let cost = 10500;
  await page.route("**/api/v1/gifts", route => route.fulfill({json:{data:[{id:"g1",name:"Voucher Shopee 50K",costXu:cost,stock,active:true,channel:"shopee"}]}}));
  await page.route("**/api/v1/gift-redemptions", async route => {
    keys.push(route.request().headers()["idempotency-key"]);
    expect(route.request().postDataJSON()).toEqual({giftId:"g1",expectedCostXu:10500});
    if (keys.length === 1) {
      stock=0;cost=12000;
      if(failure==="network")await route.abort("failed");
      else await route.fulfill({status:500,json:{error:{code:"INTERNAL_ERROR",message:"Không xử lý được yêu cầu."}}});
    } else await route.fulfill({ json: { data: { id: "redemption", costXu: 10500, status: "pending" } } });
  });
  await page.clock.install();
  await page.goto("/gift");
  await page.getByRole("button", { name: "Đổi voucher", exact: true }).click();
  await expect(page.locator(".gift-uncertain")).toContainText("Chưa xác nhận được kết quả đổi quà.");
  await expect(page.getByRole("button", { name: "Đổi voucher", exact: true })).toBeDisabled();
  // A periodic catalog refresh can observe the committed reservation. Recovery
  // must still replay the original quote rather than creating a new request.
  await page.clock.fastForward(16000);
  await expect(page.locator(".gift-price")).toHaveText("12.000");
  await page.getByRole("button", { name: "Kiểm tra yêu cầu", exact: true }).click();
  await expect(page.locator(".gift-success")).toContainText("10.500");
  await expect(page.locator(".gift-uncertain")).toHaveCount(0);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
 });
}

test("empty catalog and catalog errors have clear recovery states", async ({ page }) => {
  await giftPage(page);
  let failed = true;
  await page.route("**/api/v1/gifts", route => route.fulfill(failed ? { status: 503, json: { error: { message: "Không tải được quà." } } } : { json: { data: [] } }));
  await page.goto("/gift");
  await expect(page.locator("main").getByRole("alert")).toContainText("Chưa tải được danh sách quà");
  failed = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".gift-empty")).toContainText("Chưa có quà để đổi");
});

test("gift prices and controls fit 320px and support keyboard and English", async ({ page }) => {
  await giftPage(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gift");
  await expect(page.locator(".gift-price")).toHaveText("10.500");
  await expect(page.locator(".gift-price").getByRole("button",{name:"Xu xanh",exact:true})).toBeVisible();
  const button = page.getByRole("button", { name: "Đổi voucher", exact: true });
  await button.focus();
  await expect(button).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath("gifts-mobile.png"), fullPage: true });
  await switchLanguage(page, "EN");
  await expect(page.locator(".gift-price")).toHaveText("10,500");
  await expect(page.getByRole("button", { name: "Redeem voucher", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.screenshot({ path: test.info().outputPath("gifts-desktop.png"), fullPage: true });
});

test("gift photos and plain text descriptions work without a channel", async ({ page }) => {
  await giftPage(page);
  await page.route("https://example.com/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#bd2732"/></svg>' }));
  const description = "Phiếu ăn 100.000đ\nÁp dụng tại cửa hàng.\nKhông đổi thành tiền mặt.\n<script>alert(1)</script>\nVui lòng đọc điều kiện trước khi đổi.";
  await page.route("**/api/v1/gifts", route => route.fulfill({ json: { data: [{ id: "g1", name: "Phiếu ăn Jollibee", channel: null, costXu: 12000, stock: 2, active: true, imageUrl: "https://example.com/jollibee.png", description }] } }));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/gift");
  await expect(page.getByRole("img", { name: "Ảnh Phiếu ăn Jollibee", exact: true })).toBeVisible();
  await expect(page.locator(".gift-channel")).toHaveCount(0);
  await page.getByRole("button", { name: "Xem thêm", exact: true }).click();
  await expect(page.locator(".gift-description")).toContainText("<script>alert(1)</script>");
  await expect(page.locator(".gift-description script")).toHaveCount(0);
  await page.getByRole("button", { name: "Thu gọn", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
