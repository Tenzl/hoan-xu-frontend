import { test, expect, type Page, type Route } from "@playwright/test";
import { openSidebar, closeSidebar, switchLanguage } from "../../helpers/sidebar";

const source = "https://shopee.vn/product/100/200";
const another = "https://shopee.vn/product/100/201";
const product = { schemaVerified: true, shopId: "100", itemId: "200", productName: "Tai nghe yêu thích", price: 100000, commission: 10000 };
const link = { id: "personal-link", productName: product.productName, affiliateUrl: "https://s.shopee.vn/personal", trackingCode: "personal-tracking", tierCode: "bronze", minSharePercent: 50, maxSharePercent: 60, effectiveSharePercent: 55, status: "active", canDelete: true, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 6 * 86400000).toISOString() };

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
async function fixture(page: Page, options: { check?: (route: Route) => Promise<void>; create?: (route: Route) => Promise<void> } = {}) {
  const state = { checks: 0, creations: 0, saved: false, user: "customer" };
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: state.user, name: "An", role: "customer", csrfToken: "csrf", permissions: [] };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu", googleConfigured: true, faq: [] };
    if (path.endsWith("/wallet") || path.endsWith("/me/dashboard")) data = { available: 10000, pending: 5000, held: 0, giftHeld: 0, totalOrders: 3, approvedOrders: 1, pendingOrders: 2, membership: { tierCode: "bronze", minSharePercent: 50, maxSharePercent: 60, approvedOrders: 1, ordersToNext: 29, nextTier: { tierCode: "platinum", minApprovedOrders: 30, minSharePercent: 60, maxSharePercent: 70 } } };
    if (path.endsWith("/affiliate-channels")) data = [{ id: "shopee", name: "Shopee", status: "available" }];
    if (path.endsWith("/checkins")) data = { checkedIn: false, streak: 0, best: 0, today: "2026-10-07" };
    if (path.endsWith("/leaderboards")) data = { items: [], period: "month", participants: 0, asOf: new Date().toISOString() };
    if (path.endsWith("/me/leaderboard")) data = { rank: null, xu: 0, orders: 0, lead: null, target: null };
    if (path.endsWith("/product-checks")) {
      state.checks++;
      if (options.check) return options.check(route);
      data = { ...product, commission: request.postDataJSON().url === another ? 2000 : 10000 };
    }
    if (path.endsWith("/affiliate-links") && request.method() === "POST") {
      state.creations++;
      state.saved = true;
      if (options.create) return options.create(route);
      data = link;
    }
    if (path.endsWith("/affiliate-links/personal-link")) data = link;
    if (path.endsWith("/me/purchases")) data = state.saved ? [{ id: link.id, kind: "link", status: "selecting", link }] : [];
    await route.fulfill({ json: { data } });
  });
  return state;
}
async function navigate(page: Page, path: string) {
  await openSidebar(page);
  await page.locator(`.nav a[href="${path}"]`).click();
  await closeSidebar(page);
  await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/" : path}$`));
}

test("overview preserves its green ticket and stacks the mascot below the form on small screens", async ({ page }) => {
  await fixture(page);
  await page.goto("/");
  await expect(page.locator(".wallet-chart figcaption strong")).toHaveText("10.000");
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    const ticket = page.locator(".overview-ticket:visible");
    const main = ticket.locator(".ticket-main");
    const stub = ticket.locator(".ticket-stub");
    await expect(stub).toContainText("Tích lũy");
    await expect(stub).toContainText("Sắm món mình mê, rước quà mang về.");
    const mainRect = await main.boundingBox(), stubRect = await stub.boundingBox();
    if(width<=600) expect(stubRect!.y).toBeGreaterThanOrEqual(mainRect!.y+mainRect!.height-1);
    else {expect(stubRect!.x).toBeGreaterThanOrEqual(mainRect!.x+mainRect!.width-1);expect(stubRect!.y).toBeCloseTo(mainRect!.y,0);}
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
});

for (const path of ["/", "/link"]) {
  test(`pasted link shows checking on the submit button at ${path}`, async ({ page }) => {
    const check = deferred();
    await fixture(page, { check: async route => {
      await check.promise;
      await route.fulfill({ json: { data: product } });
    } });
    try {
      await page.goto(path);
      await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(source);
      const submit = page.locator(path === "/" ? ".overview-link-submit" : ".composer-submit");
      await expect(submit).toHaveText("Đang kiểm tra…");
      await expect(submit).toHaveAttribute("aria-busy", "true");
      if (path === "/") await expect(submit).toBeDisabled();
      await switchLanguage(page, "EN");
      await expect(submit).toHaveText("Verifying…");
      check.release();
      await expect(submit).toHaveText("Get cashback link");
      await expect(submit).toHaveAttribute("aria-busy", "false");
      await expect(submit).toBeEnabled();
      await page.getByLabel("Shopee product link", { exact: true }).fill(another);
      await expect(submit).toHaveText("Verifying…");
      await page.getByLabel("Shopee product link", { exact: true }).fill("");
      await expect(submit).toHaveText("Get cashback link");
      await expect(submit).toBeDisabled();
    } finally { check.release(); }
  });
}

test("overview estimates stay separate from its available balance", async ({ page, isMobile }) => {
  const state = await fixture(page);
  await page.setViewportSize(isMobile ? { width: 375, height: 812 } : { width: 1440, height: 960 });
  await page.goto("/");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(source);
  const preview = page.locator(".overview-link-preview");
  await expect(preview).toHaveText("← Bạn được hoàn dự kiến 5.000–6.000đ, lấy link ngay");
  await expect(page.locator(".reward-product, .composer-result, .wallet-product-preview")).toHaveCount(0);
  await expect(page.getByText("Nhận cả link sản phẩm và link affiliate Shopee.", { exact: true })).toHaveCount(0);
  await expect(page.locator(".wallet-chart figcaption strong")).toHaveText("10.000");
  await expect(page.locator(".link-wallet")).toHaveCount(1);
  const inputRect = await page.locator("#overview-product-url").boundingBox();
  const submitRect = await page.locator(".overview-link-submit").boundingBox();
  const previewRect = await preview.boundingBox();
  expect(inputRect).not.toBeNull(); expect(submitRect).not.toBeNull(); expect(previewRect).not.toBeNull();
  expect(previewRect!.y).toBeGreaterThanOrEqual(inputRect!.y + inputRect!.height);
  if(!isMobile) {expect(previewRect!.x).toBeGreaterThanOrEqual(submitRect!.x+submitRect!.width);expect(previewRect!.y+previewRect!.height/2).toBeCloseTo(submitRect!.y+submitRect!.height/2,0);}
  await page.screenshot({ path: test.info().outputPath("overview-wallet-vi.png"), fullPage: true });
  await switchLanguage(page, "EN");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(preview).toContainText("Your estimated cashback 5,000–6,000₫, get your link now");
  await expect(page.locator(".overview-link-submit")).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".link-wallet")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath("overview-wallet-en-dark.png"), fullPage: true });
  expect(state.creations).toBe(0);
});

test("overview blocks submission while checking, then transfers one complete result", async ({ page }) => {
  const creation = deferred(), check = deferred();
  const state = await fixture(page, {
    check: async route => { await check.promise; await route.fulfill({ json: { data: product } }); },
    create: async route => { await creation.promise; await route.fulfill({ json: { data: link } }); },
  });
  try {
    await page.goto("/");
    await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(source);
    await expect(page.getByRole("button", { name: "Đang kiểm tra…", exact: true })).toBeDisabled();
    await page.locator(".overview-link-form").evaluate(form => { (form as HTMLFormElement).requestSubmit(); });
    await expect(page).toHaveURL(/\/$/);
    expect(state.creations).toBe(0);
    check.release();
    await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
    await expect(page.getByRole("button", { name: "Đang xử lý…", exact: true })).toBeDisabled();
    await page.locator(".overview-link-form").evaluate(form => { (form as HTMLFormElement).requestSubmit(); });
    await expect.poll(() => state.creations).toBe(1);
    creation.release();
    await expect(page).toHaveURL(/\/link$/);
    await expect(page.getByLabel("Link sản phẩm Shopee", { exact: true })).toHaveValue(source);
    await expect(page.locator(".reward-product")).toContainText(product.productName);
    await expect(page.locator(".reward-product .reward-amount strong")).toHaveText("5.000–6.000đ");
    await expect(page.locator(".composer-result code")).toHaveText(link.affiliateUrl);
    await expect(page.locator(".composer-orders-note")).toContainText("Link đã lưu; đơn sẽ xuất hiện sau khi được ghi nhận.");
    await expect(page.getByRole("complementary", { name: "Ví Xu vàng", exact: true })).toHaveCount(1);
    expect(state.creations).toBe(1); expect(state.checks).toBe(1);
  } finally { creation.release(); check.release(); }
});

test("changing overview input during creation prevents stale results and navigation", async ({ page }) => {
  const gate = deferred();
  const state = await fixture(page, { create: async route => { await gate.promise; await route.fulfill({ json: { data: link } }); } });
  try {
    await page.goto("/");
    const input = page.getByLabel("Link sản phẩm Shopee", { exact: true });
    await input.fill(source);
    await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
    await expect.poll(() => state.creations).toBe(1);
    await input.fill(another);
    gate.release();
    await expect(page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true })).toBeEnabled();
    await expect(page.locator(".overview-link-preview")).toContainText("1.000–1.200đ");
    await expect(page).toHaveURL(/\/$/);
    await navigate(page, "/link");
    await expect(page.getByLabel("Link sản phẩm Shopee", { exact: true })).toHaveValue(another);
    await expect(page.locator(".composer-result")).toHaveCount(0);
    expect(state.creations).toBe(1);
  } finally { gate.release(); }
});

test("creation failure stays on overview and retry succeeds", async ({ page }) => {
  let fail = true;
  const operationKeys: string[] = [];
  const state = await fixture(page, { create: async route => {
    operationKeys.push(route.request().headers()["idempotency-key"]);
    if (fail) { fail = false; await route.fulfill({ status: 503, json: { error: { code: "API_UNAVAILABLE", message: "Kết nối đang gián đoạn. Vui lòng thử lại sau." } } }); }
    else await route.fulfill({ json: { data: link } });
  } });
  await page.goto("/");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(source);
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(page.locator(".overview-link-form").getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(page).toHaveURL(/\/link$/);
  expect(state.creations).toBe(2);
  expect(operationKeys[0]).toBeTruthy();
  expect(operationKeys[1]).toBe(operationKeys[0]);
});

test("a failed product check retries without duplicating a successful link", async ({ page }) => {
  let fail = true;
  const state = await fixture(page, { check: async route => {
    if (fail) await route.fulfill({ status: 502, json: { error: { code: "URL_RESOLVE_FAILED", message: "Unavailable" } } });
    else await route.fulfill({ json: { data: product } });
  } });
  await page.goto("/");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(source);
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(page.locator(".overview-link-form>.err")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  fail = false;
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(page).toHaveURL(/\/link$/);
  await expect(page.locator(".composer-result code")).toHaveText(link.affiliateUrl);
  expect(state.creations).toBe(1);
});

test("navigation shares input and results, Orders shows the link, session change clears it", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(source);
  await expect(page.locator(".overview-link-preview")).toContainText("5.000–6.000đ");
  await navigate(page, "/link");
  await expect(page.getByLabel("Link sản phẩm Shopee", { exact: true })).toHaveValue(source);
  await expect(page.locator(".reward-product")).toContainText(product.productName);
  await navigate(page, "/");
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(page).toHaveURL(/\/link$/);
  await page.locator(".composer-orders-note").getByRole("link", { name: "Xem đơn hàng" }).click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.locator(".purchase-link-details code")).toHaveText(link.affiliateUrl);
  await navigate(page, "/link");
  await expect(page.locator(".composer-result code")).toHaveText(link.affiliateUrl);
  expect(state.checks).toBe(1); expect(state.creations).toBe(1);
  state.user = "another-customer";
  await switchLanguage(page, "EN");
  await expect(page.getByLabel("Shopee product link", { exact: true })).toHaveValue("");
  await expect(page.locator(".composer-result")).toHaveCount(0);
  await expect(page.locator(".wallet-preview-ring")).toHaveCount(0);
  await page.getByLabel("Shopee product link", { exact: true }).fill(source);
  await expect(page.locator(".reward-product")).toContainText(product.productName);
  await page.reload();
  await expect(page.getByLabel("Shopee product link", { exact: true })).toHaveValue("");
});

test("customer screens preserve the three-column workspace and stack the rail on mobile",async({page,isMobile})=>{
 test.setTimeout(60000);await fixture(page);
 await page.setViewportSize(isMobile?{width:375,height:812}:{width:1440,height:960});
 for(const path of ["/","/link","/deal","/top","/gift","/orders","/wallet","/history","/help","/account","/login"]){
  await page.goto(path);await expect(page.locator(".link-wallet")).toHaveCount(path==="/login"?0:1);
  if(path==="/")await expect(page.locator(".overview-balances")).toHaveCount(0);
  if(path === "/link") {
   const center=(await page.locator(".customer-content").boundingBox())!;
   const rail=(await page.locator(".link-wallet").boundingBox())!;
   if(isMobile) expect(rail.y).toBeGreaterThanOrEqual(center.y+center.height);
   else { const menu=(await page.locator(".side").boundingBox())!;expect(center.x).toBeGreaterThanOrEqual(menu.x+menu.width);expect(rail.x).toBeGreaterThanOrEqual(center.x+center.width); }
   await expect(page.locator(".link-wallet").getByRole("progressbar",{name:"Tiến độ đạt ngưỡng rút tiền",exact:true})).toHaveAttribute("aria-valuenow","10000");
   await expect(page.locator(".wallet-awaiting-progress,.wallet-preview-ring")).toHaveCount(0);
   await expect(page.locator(".wallet-exchange")).toHaveAttribute("href","/wallet?exchange=1");
   await page.screenshot({path:test.info().outputPath("three-column-workspace.png"),fullPage:true});
  }
  if(path==="/wallet")await expect(page.locator(".xu-balances")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBeTruthy();
 }
 await page.goto("/admin");await expect(page.locator(".link-wallet")).toHaveCount(0);
});
