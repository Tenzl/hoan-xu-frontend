import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

async function setup(page: Page, gold = 101, green = 100000, tierCode = "member", bonusPercent = 3) {
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "customer", name: "An", role: "customer", csrfToken: "csrf", permissions: [] };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/wallet")) data = { available: gold, goldAvailable: gold, greenAvailable: green, goldTotal: 1000, goldUsed: 100, held: 0, giftHeld: 0, greenGiftHeld: 0, debt: 0 };
    if (path.endsWith("/exchange-policy")) data = { id: "rate-1", goldUnits: 4, greenUnits: 3, tierCode, bonusPercent, cashbackPolicyId: "cashback-1" };
    if (path.endsWith("/gifts")) data = [{ id: "g1", name: "Voucher", costXu: 1000, stock: 1, active: true }];
    await route.fulfill({ json: { data } });
  });
}
test("conversion previews exact floor, requires confirmation, and refreshes both balances", async ({ page }) => {
  await setup(page);
  let calls = 0;
  await page.route("**/api/v1/wallet/exchanges", async route => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ goldAmountXu: 101, expectedPolicyId: "rate-1", expectedTierCode: "member", expectedCashbackPolicyId: "cashback-1" });
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf");
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    await page.route("**/api/v1/wallet", r => r.fulfill({ json: { data: { available: 0, greenAvailable: 100078, goldTotal: 1000, goldUsed: 201, held: 0, debt: 0 } } }));
    await route.fulfill({ json: { data: { goldSpent: 101, greenReceived: 78 } } });
  });
  await page.goto("/wallet");
  await page.locator(".xu-green").getByRole("button", { name: "Đổi Xu vàng sang Xu xanh", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Số Xu vàng muốn đổi").fill("101");
  await expect(dialog).toContainText("78");
  await dialog.getByRole("button", { name: "Xem lại giao dịch" }).click();
  expect(calls).toBe(0);
  await dialog.getByRole("button", { name: "Xác nhận đổi", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".xu-green > b.num")).toContainText("100.078");
  expect(calls).toBe(1);
  await page.goto("/wallet");
  await expect(page.locator(".wallet-breakdown > div").filter({hasText:"Tổng Xu vàng"}).locator("dd .num")).toHaveText("1.000");
  await expect(page.locator(".wallet-breakdown > div").filter({hasText:"Đã sử dụng"}).locator("dd .num")).toHaveText("201");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
test("gold alone cannot buy gifts and the wallet green balance opens conversion", async ({ page }) => {
  await setup(page, 100000, 0);
  await page.goto("/gift");
  await expect(page.getByRole("button", { name: "Đổi voucher" })).toBeDisabled();
  await page.getByRole("button", { name: "Đổi Xu vàng sang Xu xanh" }).click();
  await expect(page).toHaveURL(/\/gift/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button",{name:"Đóng",exact:true}).click();
  await expect(page.getByRole("button", { name: "Đổi voucher" })).toBeDisabled();
  await page.goto("/wallet");
  await page.locator(".xu-green").getByRole("button", { name: "Đổi Xu vàng sang Xu xanh", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/wallet$/);
  await expect(page.getByText("Giữ Xu vàng đổi quà cũ", { exact: false })).toHaveCount(0);
});
test("stale policy requires a fresh confirmation, decimal and zero results cannot submit", async ({ page }) => {
  await setup(page, 10000);
  await page.route("**/api/v1/wallet/exchanges", async route => {
    await page.route("**/api/v1/wallet/exchange-policy", r => r.fulfill({ json: { data: { id: "rate-2", goldUnits: 1000, greenUnits: 1, tierCode: "member", bonusPercent: 3, cashbackPolicyId: "cashback-1" } } }));
    await route.fulfill({ status: 409, json: { error: { code: "EXCHANGE_POLICY_CHANGED", message: "Tỷ lệ đổi Xu đã thay đổi. Vui lòng kiểm tra lại." } } });
  });
  await page.goto("/gift");
  await page.getByRole("button", { name: "Đổi Xu vàng sang Xu xanh", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Số Xu vàng muốn đổi").fill("1.5");
  await expect(dialog.getByRole("button", { name: "Xem lại giao dịch" })).toBeDisabled();
  await dialog.getByLabel("Số Xu vàng muốn đổi").fill("101");
  await dialog.getByRole("button", { name: "Xem lại giao dịch" }).click();
  await dialog.getByRole("button", { name: "Xác nhận đổi", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Tỷ lệ đổi Xu đã thay đổi");
  await dialog.getByLabel("Số Xu vàng muốn đổi").fill("1");
  await expect(dialog.getByRole("button", { name: "Xem lại giao dịch" })).toBeDisabled();
});
test("uncertain conversion retries the original payload and key despite policy change", async ({ page }) => {
  await setup(page);
  const keys: string[] = [];
  await page.route("**/api/v1/wallet/exchanges", async route => {
    keys.push(route.request().headers()["idempotency-key"]);
    expect(route.request().postDataJSON()).toEqual({ goldAmountXu: 101, expectedPolicyId: "rate-1", expectedTierCode: "member", expectedCashbackPolicyId: "cashback-1" });
    if (keys.length === 1) {
      await page.route("**/api/v1/wallet/exchange-policy", r => r.fulfill({ json: { data: { id: "rate-2", goldUnits: 1, greenUnits: 1, tierCode: "member", bonusPercent: 3, cashbackPolicyId: "cashback-1" } } }));
      await route.fulfill({ status: 500, json: { error: { code: "UNKNOWN", message: "Chưa rõ kết quả" } } });
    } else await route.fulfill({ json: { data: { goldSpent: 101, greenReceived: 78 } } });
  });
  await page.goto("/gift");
  await page.getByRole("button", { name: "Đổi Xu vàng sang Xu xanh", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Số Xu vàng muốn đổi").fill("101");
  await dialog.getByRole("button", { name: "Xem lại giao dịch" }).click();
  await dialog.getByRole("button", { name: "Xác nhận đổi", exact: true }).click();
  await expect(dialog.getByRole("button",{name:"Kiểm tra yêu cầu"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Kiểm tra yêu cầu" }).click();
  await expect(dialog).toHaveCount(0);
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
});
test("history renders both conversion legs and gift currencies", async ({ page }) => {
  await setup(page);
  await page.route("**/api/v1/wallet/transactions?**", route => route.fulfill({ json: { data: [{ id: "conversion", description: "Đổi Xu vàng sang Xu xanh", amount: -101, greenAmount: 75, createdAt: "2026-10-07T00:00:00Z" }] } }));
  await page.route("**/api/v1/gift-redemptions?**", route => route.fulfill({ json: { data: [{ id: "old", giftName: "Old", costXu: 1000, currency: "gold", status: "rejected", createdAt: "2026-10-06T00:00:00Z" }, { id: "new", giftName: "New", costXu: 1000, currency: "green", status: "pending", createdAt: "2026-10-07T00:00:00Z" }] } }));
  await page.goto("/history");
  await expect(page.locator(".history-records")).toContainText("-101");
  await expect(page.locator(".history-records").getByRole("button",{name:"Xu vàng",exact:true})).toHaveCount(1);
  await expect(page.locator(".history-records")).toContainText("+75");
  await expect(page.locator(".history-records").getByRole("button",{name:"Xu xanh",exact:true})).toHaveCount(1);
  await page.getByRole("tab", { name: "Quà đã đổi", exact: true }).click();
  await expect(page.locator(".history-records")).toContainText("1.000");
  await expect(page.locator(".history-records")).toContainText("1.000");
  await switchLanguage(page, "EN");
  await expect(page.locator(".history-records")).toContainText("1,000");
});

for (const tier of [{code: "member", name: "Thân thiết", bonus: 3, received: 78}, {code: "silver", name: "Bạc", bonus: 6, received: 80}, {code: "gold", name: "Vàng", bonus: 10, received: 83}, {code: "diamond", name: "Kim cương", bonus: 15, received: 87}]) {
  test(`gift conversion previews ${tier.name} bonus before confirmation`, async ({page}) => {
    await setup(page, 101, 0, tier.code, tier.bonus);
    await page.goto("/gift?exchange=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(tier.name);
    await expect(dialog).toContainText(`+${tier.bonus}%`);
    await dialog.getByLabel("Số Xu vàng muốn đổi").fill("101");
    await expect(dialog.locator(".xu-exchange-receive")).toContainText(`${tier.received}`);
    await expect(dialog).not.toContainText("làm tròn xuống");
    await dialog.getByRole("button", {name:"Xem lại giao dịch"}).click();
    await expect(dialog.locator(".note")).toContainText(`${tier.received}`);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}

test("wallet conversion query opens in the green balance and applies the current tier", async ({page}) => {
  await setup(page, 1000, 0, "gold", 10);
  await page.goto("/wallet?exchange=1");
  await expect(page).toHaveURL(/\/wallet\?exchange=1/);
  const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Số Xu vàng muốn đổi").fill("200");
  await expect(dialog).toContainText("165");
  await expect(dialog).toContainText("Vàng");
  await expect(dialog).toContainText("+10%");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await switchLanguage(page,"EN");
  await page.getByRole("button",{name:"Convert gold Xu to green Xu",exact:true}).click();
  await expect(dialog).toContainText("Exchange bonus");
  await expect(dialog).toContainText("Gold");
});

test("tier change requires reviewing the refreshed bonus before a new confirmation", async ({page}) => {
  await setup(page, 1000, 0);
  let calls=0;
  await page.route("**/api/v1/wallet/exchanges", async route=>{
    calls++;
    if(calls===1){
      await page.route("**/api/v1/wallet/exchange-policy",r=>r.fulfill({json:{data:{id:"rate-1",goldUnits:4,greenUnits:3,tierCode:"gold",bonusPercent:10,cashbackPolicyId:"cashback-1"}}}));
      return route.fulfill({status:409,json:{error:{code:"EXCHANGE_TIER_CHANGED",message:"Hạng hoặc chính sách hạng đã thay đổi. Vui lòng kiểm tra lại tỷ lệ đổi Xu."}}});
    }
    expect(route.request().postDataJSON()).toMatchObject({expectedTierCode:"gold",expectedCashbackPolicyId:"cashback-1"});
    return route.fulfill({json:{data:{goldSpent:200,greenReceived:165}}});
  });
  await page.goto("/gift?exchange=1");const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Số Xu vàng muốn đổi").fill("200");
  await dialog.getByRole("button",{name:"Xem lại giao dịch"}).click();await dialog.getByRole("button",{name:"Xác nhận đổi",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("Hạng hoặc chính sách hạng đã thay đổi");
  await expect(dialog).toContainText("+10%");await expect(dialog).toContainText("165");expect(calls).toBe(1);
  await dialog.getByRole("button",{name:"Xem lại giao dịch"}).click();await dialog.getByRole("button",{name:"Xác nhận đổi",exact:true}).click();await expect(dialog).toHaveCount(0);expect(calls).toBe(2);
});

test("cached conversion policy refresh errors show retry instead of an unusable quote", async ({page}) => {
  await setup(page, 101, 0);
  await page.goto("/gift");const trigger=page.getByRole("button",{name:"Đổi Xu vàng sang Xu xanh",exact:true});
  await trigger.click();let dialog=page.getByRole("dialog");await expect(dialog).toContainText("+3%");
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);
  let recovered=false;
  await page.route("**/api/v1/wallet/exchange-policy",route=>route.fulfill(recovered?{json:{data:{id:"rate-1",goldUnits:4,greenUnits:3,tierCode:"member",bonusPercent:3,cashbackPolicyId:"cashback-1"}}}:{status:503,json:{error:{code:"UNAVAILABLE",message:"Unavailable policy"}}}));
  await trigger.click();dialog=page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("Chưa tải được tỷ lệ đổi Xu.");
  await dialog.getByLabel("Số Xu vàng muốn đổi").fill("101");await expect(dialog.getByRole("button",{name:"Xem lại giao dịch"})).toBeDisabled();
  recovered=true;await dialog.getByRole("button",{name:"Thử lại",exact:true}).click();
  await expect(dialog).toContainText("78");await expect(dialog.getByRole("button",{name:"Xem lại giao dịch"})).toBeEnabled();
});

test("exchange presets use available gold and show a review before submitting", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page, 85000, 12400, "gold", 10);
  await page.goto("/wallet?exchange=1");
  const dialog = page.getByRole("dialog");
  const input = dialog.getByLabel("Số Xu vàng muốn đổi");
  await dialog.getByRole("button", { name: "50%", exact: true }).click();
  await expect(input).toHaveValue("42500");
  await expect(dialog.locator(".xu-exchange-receive")).toContainText("35.062");
  await expect(dialog.getByRole("button", { name: "50%", exact: true })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Dùng tất cả", exact: true }).click();
  await expect(input).toHaveValue("85000");
  await input.fill("85001");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByRole("button", { name: "Xem lại giao dịch" })).toBeDisabled();
  await input.fill("25000");
  await expect(dialog).not.toContainText("làm tròn xuống");
  await page.screenshot({ path: testInfo.outputPath("exchange-entry.png") });
  await dialog.getByRole("button", { name: "Xem lại giao dịch" }).click();
  await expect(dialog.locator(".xu-exchange-remaining")).toContainText("60.000");
  await expect(dialog.locator(".xu-exchange-review")).toContainText("20.625");
  await page.screenshot({ path: testInfo.outputPath("exchange-review.png") });
  await dialog.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(input).toHaveValue("25000");
  await dialog.locator(".xu-exchange-body").evaluate(el => el.scrollTop = 0);
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await page.screenshot({ path: testInfo.outputPath("exchange-dark.png") });
  await page.keyboard.press("Escape");
  await switchLanguage(page, "EN");
  await page.getByRole("button", { name: "Convert gold Xu to green Xu", exact: true }).click();
  await expect(dialog.locator(".xu-exchange-receive")).toContainText("Green Xu received");
  await expect(dialog).not.toContainText("rounded down");
  await page.screenshot({ path: testInfo.outputPath("exchange-english.png") });
});

test("exchange keeps large balances within a narrow viewport", async ({ page }) => {
  await setup(page, 1e12, 0);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/wallet?exchange=1");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Dùng tất cả", exact: true }).click();
  await expect(dialog.getByLabel("Số Xu vàng muốn đổi")).toHaveValue("1000000000000");
  await expect(dialog.locator(".xu-exchange-receive")).toContainText("772.500.000.000");
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await dialog.getByRole("button", { name: "Xem lại giao dịch" }).click();
  expect(await dialog.locator(".xu-exchange-body").evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
});
