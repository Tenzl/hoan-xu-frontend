import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

const url = "https://shopee.vn/product/1/2";
async function fixture(page: Page, options: { guest?: boolean; highest?: boolean; equal?: boolean; missing?: boolean } = {}) {
  const writes: string[] = [];
  await page.route("**/api/v1/**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() !== "GET") writes.push(path);
    let data: unknown = [];
    if (path.endsWith("/me")) data = options.guest ? null : { id: "customer", name: "An", role: "customer", permissions: [], csrfToken: "csrf" };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu", googleConfigured: true };
    if (path.endsWith("/affiliate-channels")) data = [{ id: "shopee", name: "Shopee", status: "available" }];
    if (path.endsWith("/me/dashboard")) data = {
      available: 70000, pending: 20000, held: 1000, giftHeld: 0, totalOrders: 12, approvedOrders: 8, pendingOrders: 4,
      membership: { policyId: "current", tierCode: options.highest ? "diamond" : "bronze", minApprovedOrders: 0,
        minSharePercent: options.equal ? 50 : 65, maxSharePercent: options.equal ? 50 : 75,
        approvedOrders: 8, ordersToNext: 22,
        nextTier: options.highest ? null : { tierCode: "platinum", minApprovedOrders: 30, minSharePercent: 60, maxSharePercent: 80 } },
    };
    if (path.endsWith("/product-checks")) data = { schemaVerified: true, itemId: "2", shopId: "1", productName: "Sản phẩm yêu thích", price: 56060,
      ...(options.missing ? {} : { commission: 8409 }), commissionRate: 15, sellerCommission: 4485, shopeeCommission: 3924, commissionCap: 40000 };
    if (path.endsWith("/affiliate-links") && req.method() === "POST") data = { id: "personal", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+7*24*60*60*1000).toISOString(), affiliateUrl: "https://s.shopee.vn/personal", trackingCode: "own-tracking", policyId: "snapshot", tierCode: "bronze", minSharePercent: 25, maxSharePercent: 35 };
    await route.fulfill({ json: { data } });
  });
  return writes;
}

test("cashback money takes priority; next tier and wallet match without exposing commission details", async ({ page, isMobile }) => {
  const writes = await fixture(page);
  await page.setViewportSize(isMobile ? { width: 375, height: 812 } : { width: 1440, height: 960 });
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(url);
  const product = page.locator(".reward-product");
  await expect(product.locator(".reward-amount strong")).toHaveText("5.466–6.307đ");
  await expect(product.locator(".reward-current-tier")).toContainText("Đồng");
  await expect(product.locator(".reward-upgrade")).toContainText("Còn 22 đơn đã duyệt để lên Bạch kim");
  await expect(product.locator(".reward-next-estimate strong")).toHaveText("5.046–6.728đ");
  await expect(page.locator(".wallet-progress-detail dl>div:nth-child(3) dd")).toHaveText("5.466–6.307đ");
  await expect(page.locator(".wallet-membership .reward-next-estimate strong")).toHaveText("5.046–6.728đ");
  await expect(product.locator(".reward-product-price")).toContainText("56.060đ");
  await expect(product.locator(".reward-footnote")).toHaveText("Mua món mê say, tích Xu mỗi ngày.");
  await expect(product).not.toContainText("Khoảng chia theo hạng");
  await expect(product.locator(".reward-amount")).not.toContainText("Xu");
  await expect(product).not.toContainText("%");
  for (const hidden of ["8.409", "4.485", "3.924", "40.000", "Shop:", "Item:"]) await expect(product).not.toContainText(hidden);
  const sizes = await product.evaluate(el => [".reward-amount strong", ".reward-next-estimate strong", ".reward-product-price b"].map(s => parseFloat(getComputedStyle(el.querySelector(s)!).fontSize)));
  expect(sizes[0]).toBeGreaterThan(sizes[1]); expect(sizes[1]).toBeGreaterThan(sizes[2]);
  expect(writes).toEqual(["/api/v1/product-checks"]);
  await page.screenshot({ path: test.info().outputPath("reward-hierarchy-vi.png"), fullPage: true });
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(product.locator(".reward-amount strong")).toHaveText("2.103–2.944đ");
  await expect(product.locator(".reward-snapshot")).toContainText("Khoảng áp dụng cho link này");
  await expect(page.locator(".wallet-progress-detail dl>div:nth-child(3) dd")).toHaveText("2.103–2.944đ");
  await expect(page.locator(".wallet-chart figcaption strong")).toHaveText("70.000");
  await expect(page.locator(".wallet-order-stats")).toContainText("12");
  await switchLanguage(page, "EN");
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(product.locator(".reward-amount strong")).toHaveText("2,103–2,944₫");
  await expect(product.locator(".reward-product-price b")).toHaveText("56,060₫");
  await expect(product.locator(".reward-footnote")).toHaveText("Shop what you adore, save Xu for more.");
  await expect(product.locator(".reward-upgrade")).toContainText("22 approved orders to reach Platinum");
  await expect(product.locator(".reward-next-estimate strong")).toHaveText("5,046–6,728₫");
  if (!isMobile) await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath("reward-hierarchy-en-dark.png"), fullPage: true });
  await page.getByRole("button", { name: "Clear product link" }).click();
  await expect(product).toHaveCount(0);
  await expect(page.locator(".wallet-preview-ring")).toHaveCount(0);
  expect(writes).toEqual(["/api/v1/product-checks", "/api/v1/affiliate-links"]);
});

test("fixed range stays a single amount and highest tier has no invented upgrade", async ({ page }) => {
  await fixture(page, { equal: true, highest: true });
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(url);
  await expect(page.locator(".reward-amount strong")).toHaveText("4.205đ");
  await expect(page.locator(".wallet-progress-detail dl>div:nth-child(3) dd")).toHaveText("4.205đ");
  await expect(page.locator(".reward-product .reward-highest")).toBeVisible();
  await expect(page.locator(".reward-next-estimate")).toHaveCount(0);
});

test("missing commission does not invent cashback and a guest sees no assumed member benefit", async ({ page }) => {
  await fixture(page, { missing: true });
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(url);
  await expect(page.locator(".reward-amount strong")).toHaveCount(0);
  await expect(page.locator(".reward-product")).toContainText("Chưa xem được tiền hoàn cho món này. Bạn thử lại nhé.");
  await expect(page.locator(".wallet-progress-detail dl>div:nth-child(3) dd")).toHaveText("—");
  await expect(page.locator(".reward-next-estimate")).toHaveCount(0);
  await fixture(page, { guest: true });
  await page.reload();
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(url);
  await expect(page.locator(".reward-login")).toContainText("Đăng nhập để khám phá quyền lợi mua sắm của bạn.");
  await expect(page.locator(".reward-main, .reward-upgrade, .wallet-chart")).toHaveCount(0);
});

test("overview uses the same personal range and the created link snapshot", async ({ page }) => {
  const writes = await fixture(page);
  await page.goto("/");
  await expect(page.getByText("Có thể rút", { exact: true })).toBeVisible();
  const ticket = page.locator(".ticket-main");
  await ticket.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(url);
  await expect(ticket.locator(".overview-link-preview")).toContainText("5.466–6.307đ");
  await expect(ticket.locator(".reward-product")).toHaveCount(0);
  await expect(page.locator(".wallet-membership .reward-next-estimate strong")).toHaveText("5.046–6.728đ");
  await ticket.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(page).toHaveURL(/\/link$/);
  await expect(page.locator(".reward-product .reward-amount strong")).toHaveText("2.103–2.944đ");
  await expect(page.locator(".reward-product .reward-amount")).not.toContainText("Xu");
  expect(writes).toEqual(["/api/v1/product-checks", "/api/v1/affiliate-links"]);
});

test("failed membership loads no assumed range and retries without a second product check", async ({ page }) => {
  const writes = await fixture(page);
  let recovering = false;
  await page.route("**/api/v1/me/dashboard", async route => {
    if (recovering) return route.fallback();
    await route.fulfill({ status: 503, json: { error: { message: "Unavailable" } } });
  });
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(url);
  const product = page.locator(".reward-product");
  await expect(product).toContainText("Chưa tải được quyền lợi của bạn.");
  await expect(product.locator(".reward-amount strong")).toHaveCount(0);
  recovering = true;
  await product.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(product.locator(".reward-amount strong")).toHaveText("5.466–6.307đ");
  expect(writes).toEqual(["/api/v1/product-checks"]);
});
