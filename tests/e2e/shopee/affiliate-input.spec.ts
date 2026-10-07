import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

const productLink = "https://s.shopee.vn/50ZB7ULNGm";
const shopLink = "https://s.shopee.vn/5AqOFtF1C3";
const ownLink = "https://s.shopee.vn/OwnHoanXu";
const shopMessage = "Link gian hàng không thể ghi nhận hoàn xu";

async function fixture(page: Page, options: { networkError?: boolean; lateShop?: boolean; rejectCreate?: boolean } = {}) {
  const writes: { path: string; body: any }[] = [];
  let fail = Boolean(options.networkError);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { (window as any).copiedLink = value; } } });
  });
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const body = request.method() === "POST" ? request.postDataJSON() : undefined;
    if (body) writes.push({ path, body });
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "customer", name: "An", role: "customer", csrfToken: "csrf", permissions: [] };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu", googleConfigured: true };
    if (path.endsWith("/me/dashboard")) data = { available: 0, membership: { tierCode: "bronze", minSharePercent: 65, maxSharePercent: 75, approvedOrders: 0 } };
    if (path.endsWith("/affiliate-channels")) data = [{ id: "shopee", name: "Shopee", status: "available" }];
    if (path.endsWith("/checkins")) data = { streak: 0, best: 0, today: "2026-10-07", checkedIn: false };
    if (path.endsWith("/product-checks")) {
      if (body.url === shopLink) {
        if (options.lateShop) await gate;
        return route.fulfill({ status: 422, json: { error: { code: "NOT_PRODUCT_LINK", message: shopMessage } } }).catch(() => {});
      }
      if (fail) { fail = false; return route.fulfill({ status: 502, json: { error: { code: "URL_RESOLVE_FAILED", message: "Sensitive redirect details" } } }); }
      data = { shopId: "264049024", itemId: "27783958254", productLink: "https://shopee.vn/product/264049024/27783958254", schemaVerified: true, productName: "Món yêu thích", price: 100000, commission: 10000 };
    }
    if (path.endsWith("/affiliate-links") && body) {
      if (options.rejectCreate) return route.fulfill({ status: 422, json: { error: { code: "NOT_PRODUCT_LINK", message: shopMessage } } });
      data = { affiliateUrl: ownLink, trackingCode: "own-customer", tierCode: "bronze", minSharePercent: 65, maxSharePercent: 75, status: "active", expiresAt: new Date(Date.now() + 6 * 86400000).toISOString() };
    }
    await route.fulfill({ json: { data } });
  });
  return { writes, release: () => release() };
}

for (const path of ["/", "/link"]) {
  test(`${path}: affiliate product input creates and copies a new personal link`, async ({ page }) => {
    const { writes } = await fixture(page);
    await page.goto(path);
    await expect(page.getByText("Nhận cả link sản phẩm và link affiliate Shopee.", { exact: true })).toHaveCount(0);
    await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(productLink);
    if (path === "/") {
      await expect(page.locator(".overview-link-preview")).toContainText(/6[.,]500/);
      await expect(page.locator(".reward-product")).toHaveCount(0);
    } else await expect(page.locator(".reward-product")).toContainText("Món yêu thích");
    await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
    const result = page.locator(".out").filter({ has: page.locator("code") }).first();
    await expect(result.locator("code")).toHaveText(ownLink);
    await expect(result.getByRole("link", { name: "Mở Shopee để mua", exact: true })).toHaveAttribute("href", ownLink);
    await result.getByRole("button", { name: "Sao chép link", exact: true }).click();
    expect(await page.evaluate(() => (window as any).copiedLink)).toBe(ownLink);
    expect(writes.filter(x => x.path.endsWith("/affiliate-links"))).toEqual([{ path: "/api/v1/affiliate-links", body: { url: productLink } }]);
  });

  test(`${path}: shop warning blocks generation, is bilingual and clears with new input`, async ({ page }) => {
    const { writes } = await fixture(page);
    await page.goto(path);
    const input = page.getByLabel("Link sản phẩm Shopee", { exact: true });
    await input.fill(shopLink);
    const alert = page.locator(".product-input-warning");
    await expect(alert).toHaveText(shopMessage);
    await expect(page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true })).toBeDisabled();
    await expect(alert.getByRole("button")).toHaveCount(0);
    await switchLanguage(page, "EN");
    await expect(alert).toHaveText("Shop links cannot earn cashback Xu");
    await expect(page.getByRole("button", { name: "Get cashback link", exact: true })).toBeDisabled();
    await page.getByLabel("Shopee product link", { exact: true }).fill(productLink);
    await expect(alert).toHaveCount(0);
    if (path === "/") {
      await expect(page.locator(".overview-link-preview")).toContainText(/6[.,]500/);
      await expect(page.locator(".reward-product")).toHaveCount(0);
    } else await expect(page.locator(".reward-product")).toContainText("Món yêu thích");
    await expect(page.getByRole("button", { name: "Get cashback link", exact: true })).toBeEnabled();
    expect(writes.filter(x => x.path.endsWith("/affiliate-links"))).toHaveLength(0);
  });

  test(`${path}: failed resolution can retry and a late shop response cannot block new input`, async ({ page }) => {
    const { writes, release } = await fixture(page, { networkError: true, lateShop: true });
    await page.goto(path);
    const input = page.getByLabel("Link sản phẩm Shopee", { exact: true });
    await input.fill(productLink);
    const alert = page.locator("main").getByRole("alert");
    await expect(alert).toContainText("Chưa mở được link Shopee. Bạn thử lại nhé.");
    await expect(alert).not.toContainText("Sensitive");
    await alert.getByRole("button", { name: "Thử lại" }).click();
    if (path === "/") {
      await expect(page.locator(".overview-link-preview")).toContainText(/6[.,]500/);
      await expect(page.locator(".reward-product")).toHaveCount(0);
    } else await expect(page.locator(".reward-product")).toContainText("Món yêu thích");
    await input.fill(shopLink);
    await expect.poll(() => writes.filter(x => x.body.url === shopLink).length).toBe(1);
    await input.fill(productLink);
    release();
    if (path === "/") {
      await expect(page.locator(".overview-link-preview")).toContainText(/6[.,]500/);
      await expect(page.locator(".reward-product")).toHaveCount(0);
    } else await expect(page.locator(".reward-product")).toContainText("Món yêu thích");
    await expect(page.locator(".product-input-warning")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true })).toBeEnabled();
  });

  test(`${path}: creation rejection also locks the shop input`, async ({ page }) => {
    await fixture(page, { rejectCreate: true });
    await page.goto(path);
    await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(productLink);
    if (path === "/") await expect(page.locator(".overview-link-preview")).toContainText("6.500");
    else await expect(page.locator(".reward-product")).toBeVisible();
    await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
    await expect(page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true })).toBeDisabled();
    await expect(page.locator("main")).toContainText(shopMessage);
    await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill("https://shopee.vn/product/1/2");
    await expect(page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true })).toBeEnabled();
  });
}
