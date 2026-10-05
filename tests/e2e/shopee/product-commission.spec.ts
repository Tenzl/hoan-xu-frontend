import { switchLanguage } from "../../helpers/sidebar";
import { test, expect, type Page, type Route } from "@playwright/test";

const product = {
  shopId: "1", itemId: "2", schemaVerified: true,
  productName: "Máy xay Shopee", price: 579000, commission: 55005,
  commissionRate: 9.5, sellerCommission: 40000, shopeeCommission: 15005,
  commissionCap: 40000,
};

async function fixture(page: Page, check: (route: Route) => Promise<void>) {
  const calls: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "POST") calls.push(path);
    if (path.endsWith("/product-checks")) return check(route);
    let data: unknown = [];
    if (path.endsWith("/me")) data = null;
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu", googleConfigured: true };
    if (path.endsWith("/affiliate-channels")) data = [{ id: "shopee", name: "Shopee", status: "available" }];
    await route.fulfill({ json: { data, meta: { requestId: "test" } } });
  });
  return calls;
}

test("pasting a link checks automatically below the input, with debounce and bilingual details", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const calls = await fixture(page, async (route) => {
    expect(route.request().postDataJSON()).toEqual({ url: "https://shopee.vn/product/1/2" });
    await gate;
    await route.fulfill({ json: { data: product } });
  });
  await page.goto("/link");
  const input = page.getByLabel("Link sản phẩm Shopee", { exact: true });
  await input.fill("https://shopee.vn/product/1/20");
  await input.fill("https://shopee.vn/product/1/21");
  await input.fill("  https://shopee.vn/product/1/2  ");
  await expect.poll(() => calls.length).toBe(1);
  await expect(page.getByRole("status")).toContainText("Đang lấy thông tin");
  release();
  const details = page.getByRole("region", { name: "Thông tin sản phẩm và hoa hồng" });
  await expect(details).toContainText("Máy xay Shopee");
  await expect(details).toContainText("55.005đ");
  await expect(details).toContainText("9.5%");
  expect((await details.boundingBox())!.y).toBeGreaterThan((await input.boundingBox())!.y);
  await switchLanguage(page, "EN");
  await expect(page.getByRole("region", { name: "Product details and commission" })).toContainText("Estimated commission");
  await expect(page.getByRole("region", { name: "Product details and commission" })).toContainText("55,005₫");
  expect(calls).toEqual(["/api/v1/product-checks"]);
  const englishInput = page.getByLabel("Shopee product link", { exact: true });
  await englishInput.fill("https://example.com/product/1/2");
  await expect(page.getByRole("region", { name: "Product details and commission" })).toHaveCount(0);
  await expect(page.getByText("Paste a valid Shopee product link to check commission automatically.")).toBeVisible();
  await englishInput.fill("");
  await expect(page.getByText("Paste a valid Shopee product link to check commission automatically.")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("a delayed previous product cannot replace the new product, and zero commission is displayed", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const calls = await fixture(page, async (route) => {
    const { url } = route.request().postDataJSON();
    if (url.endsWith("/2")) {
      await gate;
      await route.fulfill({ json: { data: product } }).catch(() => {}); // Old request may have been aborted.
    } else {
      await route.fulfill({ json: { data: { ...product, itemId: "3", productName: "Sản phẩm mới", commission: 0, commissionRate: 0 } } });
    }
  });
  await page.goto("/link");
  const input = page.getByLabel("Link sản phẩm Shopee", { exact: true });
  await input.fill("https://shopee.vn/product/1/2");
  await expect.poll(() => calls.length).toBe(1);
  await input.fill("https://shopee.vn/product/1/3");
  const details = page.getByRole("region", { name: "Thông tin sản phẩm và hoa hồng" });
  await expect(details).toContainText("Sản phẩm mới");
  release();
  await expect(details).not.toContainText("Máy xay Shopee");
  await expect(details.locator("dl > div").filter({ hasText: "Hoa hồng dự kiến" })).toContainText("0đ");
  expect(calls).toHaveLength(2);
});

test("checker errors allow retry and unverified amounts are never displayed as commission", async ({ page }) => {
  let attempts = 0;
  await fixture(page, async (route) => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, json: { error: { code: "SHOPEE_SESSION_EXPIRED", message: "Không lấy được dữ liệu Shopee. Kiểm tra phiên affiliate." } } });
    else await route.fulfill({ json: { data: { ...product, schemaVerified: false } } });
  });
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill("https://s.shopee.vn/test-product");
  await expect(page.locator("main").getByRole("alert")).toContainText("Kiểm tra phiên affiliate");
  expect(attempts).toBe(1);
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  const details = page.getByRole("region", { name: "Thông tin sản phẩm và hoa hồng" });
  await expect(details).toContainText("Thông tin hoa hồng tạm thời chưa sẵn sàng. Vui lòng thử lại sau.");
  await expect(details.locator("dl")).toHaveCount(0);
  await expect(details).not.toContainText("55.005đ");
  expect(attempts).toBe(2);
});
