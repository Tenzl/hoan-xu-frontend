import { test, expect, type Page, type Route } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

const sourceURL = "https://shopee.vn/product/100/200";
const result = { id: "personal-link", affiliateUrl: "https://s.shopee.vn/an_redir?affiliate_id=fixture&origin_link=https%3A%2F%2Fshopee.vn%2Fproduct%2F100%2F200&sub_id=personal-fixture-tracking", trackingCode: "personal-fixture-tracking", tierCode: "bronze", minSharePercent: 50, maxSharePercent: 60 };

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

test("paste, preview, create, copy and save stay distinct and fit VI/EN, light/dark and small screens", async ({ page, isMobile }) => {
  const writes = await fixture(page);
  await page.setViewportSize(isMobile ? { width: 375, height: 812 } : { width: 1440, height: 960 });
  await page.goto("/link");
  const submit = page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true });
  await expect(submit).toBeDisabled();
  await expect(page.getByText("Sản phẩm của bạn sẽ hiển thị ở đây", { exact: true })).toBeVisible();
  await expect(page.locator(".link-share")).toHaveText("60–70%");
  await page.screenshot({ path: test.info().outputPath("link-empty-vi.png"), fullPage: true });
  await page.getByRole("button", { name: "Dán link", exact: true }).click();
  await expect(page.getByLabel("Link sản phẩm Shopee", { exact: true })).toHaveValue(sourceURL);
  await expect(page.getByRole("region", { name: "Thông tin sản phẩm và hoa hồng" })).toContainText("55.005đ");
  expect(writes.filter((write) => write.path.endsWith("/affiliate-links"))).toHaveLength(0);
  await page.screenshot({ path: test.info().outputPath("link-preview-vi.png"), fullPage: true });
  await submit.click();
  const output = page.getByRole("region", { name: "Link của bạn đã sẵn sàng", exact: true });
  await expect(output).toContainText("Đồng · 50–60%");
  await expect(output.getByRole("link", { name: "Mở để mua" })).toHaveAttribute("href", result.affiliateUrl);
  await output.getByRole("button", { name: "Sao chép", exact: true }).click();
  expect(await page.evaluate(() => (window as any).copiedLink)).toBe(result.affiliateUrl);
  await output.getByRole("button", { name: "Lưu link", exact: true }).click();
  await expect(output.getByRole("button", { name: "Đã lưu link", exact: true })).toBeDisabled();
  expect(writes.filter((write) => write.path.includes("affiliate-links"))).toEqual([
    { path: "/api/v1/affiliate-links", body: { url: sourceURL } },
    { path: "/api/v1/affiliate-links/personal-link", body: { saved: true } },
  ]);
  await page.screenshot({ path: test.info().outputPath("link-success-vi.png"), fullPage: true });
  await switchLanguage(page, "EN");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await expect(page.getByRole("region", { name: "Your link is ready", exact: true })).toBeVisible();
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
  await expect(page.getByRole("region", { name: "Thông tin sản phẩm và hoa hồng" })).toBeVisible();
});
