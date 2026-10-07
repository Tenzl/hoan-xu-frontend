import { test, expect, type Page, type Route } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

const sourceURL = "https://shopee.vn/product/100/200";
const result = { affiliateUrl: "https://s.shopee.vn/3B7ybQjO2E", trackingCode: "0".repeat(49), tierCode: "bronze", minSharePercent: 50, maxSharePercent: 60, effectiveSharePercent: 55, payoutFactor: "0.55", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+6*24*60*60*1000).toISOString() };

async function fixture(page: Page, create?: (route: Route) => Promise<void>) {
  const writes: { path: string; body: any }[] = [];
  await page.addInitScript((url) => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      readText: async () => url,
      writeText: async (value: string) => { (window as any).copiedLink = value; },
    } });
  }, sourceURL);
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname;
    let data: unknown = [];
    if (req.method() !== "GET") writes.push({ path, body: req.postDataJSON() });
    if (path.endsWith("/me")) data = { id: "customer", name: "Nguyễn An", role: "customer", csrfToken: "fixture-csrf", permissions: [] };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/me/dashboard")) data = { membership: { tierCode: "platinum", minSharePercent: 60, maxSharePercent: 70 } };
    if (path.endsWith("/affiliate-channels")) data = [{ id: "shopee", name: "Shopee", status: "available" }, { id: "lazada", name: "Lazada", status: "not_configured" }];
    if (path.endsWith("/product-checks")) data = { itemId: "200", shopId: "100", productName: "Tai nghe không dây — phiên bản giới hạn", schemaVerified: true, price: 579000, commission: 55005, commissionRate: 9.5, sellerCommission: 40000, shopeeCommission: 15005, commissionCap: 40000 };
    if (path.endsWith("/affiliate-links") && req.method() === "POST") {
      expect(req.headers()["x-csrf-token"]).toBe("fixture-csrf");
      if (create) return create(route);
      data = result;
    }
    await route.fulfill({ json: { data } });
  });
  return writes;
}

test("paste, preview, create and copy fit VI/EN, light/dark and small screens without saved links", async ({ page, isMobile }) => {
  const writes = await fixture(page);
  await page.setViewportSize(isMobile ? { width: 375, height: 812 } : { width: 1440, height: 960 });
  await page.goto("/link");
  await expect(page.locator('a[href="/save"]')).toHaveCount(0);
  const submit = page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true });
  await expect(submit).toBeDisabled();
  await expect(page.locator(".link-composer").getByText("Sản phẩm của bạn sẽ hiển thị ở đây", { exact: true })).toBeVisible();
  await expect(page.locator(".wallet-membership .reward-tier-badge")).toHaveText("Bạch kim");
  await page.screenshot({ path: test.info().outputPath("link-empty-vi.png"), fullPage: true });
  await page.getByRole("button", { name: "Dán link", exact: true }).click();
  await expect(page.getByLabel("Link sản phẩm Shopee", { exact: true })).toHaveValue(sourceURL);
  await expect(page.getByRole("region", { name: "Sản phẩm và khoảng nhận" })).toContainText("33.003–38.504đ");
  expect(writes.filter((write) => write.path.endsWith("/affiliate-links"))).toHaveLength(0);
  await page.screenshot({ path: test.info().outputPath("link-preview-vi.png"), fullPage: true });
  await submit.click();
  const output = page.getByRole("region", { name: "Link của bạn đã sẵn sàng", exact: true });
  await expect(output).not.toContainText("Hạng áp dụng cho link");
  await expect(output).not.toContainText("Hệ số hoàn Xu");
  await expect(output).toContainText("Còn 6 ngày");
  await expect(output.getByRole("button", { name: "Xóa link", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Link của bạn", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Lịch sử mua hàng", exact: true })).toHaveCount(0);
  await expect(output).not.toContainText("Tracking:");
  await expect(output.getByRole("link", { name: "Mở để mua" })).toHaveAttribute("href", result.affiliateUrl);
  await output.getByRole("button", { name: "Sao chép", exact: true }).click();
  expect(await page.evaluate(() => (window as any).copiedLink)).toBe(result.affiliateUrl);
  await expect(page.getByRole("button", { name: /^(Lưu link|Đã lưu link|Lưu|Bỏ lưu)$/ })).toHaveCount(0);
  expect(writes.filter((write) => write.path.includes("affiliate-links"))).toEqual([
    { path: "/api/v1/affiliate-links", body: { url: sourceURL } },
  ]);
  await page.screenshot({ path: test.info().outputPath("link-success-vi.png"), fullPage: true });
  await switchLanguage(page, "EN");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await expect(page.getByRole("region", { name: "Your link is ready", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Save link|Link saved|Save|Unsave)$/ })).toHaveCount(0);
  await expect(page.locator(".link-howto")).toContainText("Paste & check");
  await page.screenshot({ path: test.info().outputPath("link-success-en-dark.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  if (!isMobile) {
    await page.setViewportSize({ width: 768, height: 1024 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath("link-tablet-en-dark.png"), fullPage: true });
  }
  await page.getByRole("button", { name: "Clear product link", exact: true }).click();
  await expect(page.locator(".composer-result")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Get cashback link", exact: true })).toBeDisabled();
});

test("a changed input cannot show a link created for the old product", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const writes = await fixture(page, async (route) => {
    await gate;
    await route.fulfill({ json: { data: result } });
  });
  await page.goto("/link");
  const input = page.getByLabel("Link sản phẩm Shopee", { exact: true });
  await input.fill(sourceURL);
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect.poll(() => writes.filter((write) => write.path.endsWith("/affiliate-links")).length).toBe(1);
  await input.fill("https://shopee.vn/product/100/201");
  release();
  await expect(page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true })).toBeEnabled();
  await expect(page.locator(".composer-result")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Sản phẩm và khoảng nhận" })).toBeVisible();
});

test("overview transfers its result and purchase history shows imported orders", async ({ page }) => {
  const writes = await fixture(page);
  await page.goto("/");
  await expect(page.getByText("Có thể rút", {exact:true})).toBeVisible();
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill(sourceURL);
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(page).toHaveURL(/\/link$/);
  await expect(page.locator(".composer-orders-note")).toContainText("Link đã được cập nhật trong mục Đơn hàng.");
  await expect(page.locator(".out")).toContainText(result.affiliateUrl);
  await expect(page.locator(".out").getByRole("link", { name: "Mở để mua" })).toHaveAttribute("href", result.affiliateUrl);
  await expect(page.getByRole("button", { name: "Lưu link", exact: true })).toHaveCount(0);
  await page.route("**/api/v1/me/purchases?**", (route) => route.fulfill({ json: { data: [{ id: "purchase-order", kind: "order", status: "progress", link: null, order: { id: "report-order", channel: "shopee", productName: "Imported Shopee order", orderedAt: "2026-10-05T12:00:00+07:00", value: 100000, cashback: 5500, sharePercent: 55, tierCode: "bronze", status: "pending" } }], meta: { hasNext: false } } }));
  await page.goto("/link");
  await expect(page.getByRole("region", { name: "Lịch sử mua hàng", exact: true })).toHaveCount(0);
  await page.goto("/orders");
  await page.getByRole("button", { name: "Đang xử lý", exact: true }).click();
  const history = page.getByRole("region", { name: "Lịch sử mua hàng", exact: true });
  await expect(history).toContainText("Imported Shopee order");
  await expect(history).toContainText("Đang xử lý");
  await expect(history.getByRole("button", { name: "Sao chép", exact: true })).toHaveCount(0);
  await expect(page.locator(".composer-result")).toHaveCount(0);
  expect(writes.filter((write) => write.path.includes("affiliate-links"))).toEqual([
    { path: "/api/v1/affiliate-links", body: { url: sourceURL } },
  ]);
});

test("expiry locks copy and purchase and generating again renews the result", async ({ page }) => {
 let generation=0;
 await fixture(page, async(route)=>{
  generation++;
  await route.fulfill({json:{data:{...result,expiresAt:generation===1?new Date(Date.now()+2000).toISOString():result.expiresAt}}});
 });
 await page.goto('/link');await page.getByLabel('Link sản phẩm Shopee',{exact:true}).fill(sourceURL);
 await page.getByRole('button',{name:'Lấy link hoàn tiền',exact:true}).click();
 const output=page.locator('.composer-result');
 await expect(output.getByRole('button',{name:'Sao chép',exact:true})).toBeEnabled();
 await expect(output).toContainText('Link đã bị cancel — hết thời hạn hoàn Xu',{timeout:6000});
 await expect(output.getByRole('button',{name:'Sao chép',exact:true})).toBeDisabled();
 await expect(output.locator('a')).not.toHaveAttribute('href');
 await page.getByRole('button',{name:'Lấy link hoàn tiền',exact:true}).click();
 await expect(output.getByRole('button',{name:'Sao chép',exact:true})).toBeEnabled();
 await expect(output.locator('a')).toHaveAttribute('href',result.affiliateUrl);
 await page.reload();await expect(page.locator('.composer-result')).toHaveCount(0);
});
