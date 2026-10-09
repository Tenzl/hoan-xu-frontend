import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import jsQR from "jsqr";
import { switchLanguage } from "../../helpers/sidebar";

const code = "70KiDYrZuK";
const affiliateURL = `https://s.shopee.vn/${code}`;
const shareURL = (page: Page) => `${new URL(page.url()).origin}/shopee/${code}`;
const sharePrefix = (page: Page) => `${new URL(page.url()).host}/shopee/`;

async function fixture(page: Page, nativeShare = false) {
  await page.addInitScript((native) => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { (window as any).copiedLink = value; } } });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: native ? (data: ShareData) => data.files?.[0]?.type === "image/png" : undefined });
    Object.defineProperty(navigator, "share", { configurable: true, value: native ? async (data: ShareData) => {
      if ((window as any).shareFailure) throw new DOMException("fixture", (window as any).shareFailure);
      const file = data.files![0];
      (window as any).sharedImage = { name: file.name, type: file.type, size: file.size, count: data.files!.length };
    } : undefined });
    (window as any).cspViolations = [];
    document.addEventListener("securitypolicyviolation", event => (window as any).cspViolations.push(event.violatedDirective));
  }, nativeShare);
  const createdAt = new Date().toISOString();
  const link = { id: "shared", channel: "shopee", productName: "Tai nghe Bluetooth", affiliateUrl: affiliateURL, trackingCode: "tracking", legacy: false, status: "active", canDelete: true, createdAt, expiresAt: new Date(Date.now() + 5 * 86400000).toISOString() };
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "customer", name: "An", role: "customer", csrfToken: "csrf" };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/product-checks")) data = { schemaVerified: true, shopId: "1", itemId: "2", productName: link.productName, price: 100000, commission: 10000 };
    if (path.endsWith("/affiliate-links")) data = route.request().method() === "POST" ? link : [link];
    if (path.endsWith("/affiliate-links/shared")) data = link;
    await route.fulfill({ json: { data } });
  });
}

test("result blocks text interaction and animates only the prefix while copying the complete share link", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await fixture(page);
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill("https://shopee.vn/product/1/2");
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  const result = page.locator(".composer-result");
  const animation = result.locator(".link-url-animation");
  await expect(animation.locator(".typewriter-value")).toHaveText(sharePrefix(page));
  await expect(animation.locator(".typewriter-value")).toHaveClass(/link-url-destination/);
  await expect(animation.locator(".typewriter-prefix")).toHaveText("http://");
  await expect(result.locator(".typewriter-suffix")).toHaveText(code);
  await result.locator(".link-url-display").dblclick();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("");
  await expect(result.locator("code")).not.toBeFocused();
  expect(await result.locator("code").getAttribute("tabindex")).toBeNull();
  await expect.poll(() => animation.locator(".typewriter-value").evaluate(node => ({ text: node.textContent, source: node.classList.contains("link-url-source") })), { timeout: 10000, intervals: [10] }).toEqual({ text: "", source: true });
  await expect(animation.locator(".typewriter-value")).toHaveText("s.shopee.vn/", { timeout: 10000 });
  await expect(result.locator(".typewriter-suffix")).toHaveText(code);
  const colors = await animation.evaluate(node => [".typewriter-prefix", ".typewriter-value", ".typewriter-suffix"].map(selector => getComputedStyle(node.querySelector(selector)!).color));
  expect(new Set(colors).size).toBe(1);
  await expect(animation.locator(".typewriter-value")).toHaveClass(/link-url-source/);
  await expect(animation.locator(".typewriter-prefix")).toHaveText("https://");
  await result.getByRole("button", { name: "Sao chép link", exact: true }).click();
  expect(await page.evaluate(() => (window as any).copiedLink)).toBe(shareURL(page));
  await expect(animation).toBeVisible();
  await expect(result.getByRole("button", { name: "Đã sao chép", exact: true })).toBeVisible();
});

test("result holds the green link for three seconds before repeating and respects reduced motion", async ({ page }) => {
  await fixture(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill("https://shopee.vn/product/1/2");
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  const result = page.locator(".composer-result");
  const source = result.locator(".link-url-animation .typewriter-value.link-url-source");
  await expect(source).toHaveText("s.shopee.vn/", { timeout: 10000 });
  const destination = result.locator(".link-url-animation .typewriter-value.link-url-destination");
  await expect.poll(() => result.locator(".typewriter-value").textContent(), { timeout: 10000, intervals: [25] }).toBe(sharePrefix(page));
  await expect(result.locator(".typewriter-prefix")).toHaveText("http://");
  const greenStarted = await page.evaluate(() => performance.now());
  await result.screenshot({ path: test.info().outputPath("link-result-green.png") });
  await page.waitForTimeout(2000);
  await expect(destination).toHaveText(sharePrefix(page));
  await expect(result.locator(".typewriter-prefix")).toHaveText("http://");
  await expect.poll(() => result.locator(".typewriter-value").textContent(), { timeout: 5000, intervals: [25] }).not.toBe(sharePrefix(page));
  const interval = await page.evaluate(() => performance.now()) - greenStarted;
  expect(interval).toBeGreaterThan(2700);
  expect(interval).toBeLessThan(3800);
  await expect(source).toHaveText("s.shopee.vn/", { timeout: 5000 });
  await expect(result.locator(".typewriter-suffix")).toHaveText(code);
  await result.screenshot({ path: test.info().outputPath("link-result-red.png") });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } }));
  await page.evaluate(() => localStorage.setItem("hoanxu.theme", "dark"));
  await page.reload();
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill("https://shopee.vn/product/1/2");
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  await expect(destination).toHaveText(sharePrefix(page));
  await expect(result.locator(".typewriter-cursor")).toHaveCount(0);
  await result.getByRole("button", { name: "Sao chép link", exact: true }).click();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("");
  await expect(page.getByText("Không sao chép được", { exact: true })).toBeVisible();
  await expect(result.locator("code")).not.toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(result.getByRole("link", { name: "Mở Shopee để mua" })).toBeVisible();
  await expect(result.getByRole("button", { name: "Xóa link", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await result.screenshot({ path: test.info().outputPath("link-result-mobile-dark.png") });
});

test("public branded links redirect immediately to the fixed Shopee destination", async ({ request }) => {
  for (const method of ["GET", "HEAD"]) {
    const response = await request.fetch(`/shopee/${code}?url=https://evil.invalid`, { method, maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe(affiliateURL);
    expect(await response.text()).not.toContain("<html");
  }
  for (const path of ["/shopee", "/shopee/", "/shopee/a-b", "/shopee/a/b", "/shopee/%2Fevil.invalid", `/shopee/${code}/`]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers().location).toBeUndefined();
  }
  const canonical = await request.get("/help/?source=test", { maxRedirects: 0 });
  expect(canonical.status()).toBe(308);
  expect(new URL(canonical.headers().location, canonical.url()).pathname).toBe("/help");
  expect(new URL(canonical.headers().location, canonical.url()).search).toBe("?source=test");
});

test("created and saved links copy the branded URL while shopping and QR use the affiliate URL", async ({ page }) => {
  await fixture(page);
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee", { exact: true }).fill("https://shopee.vn/product/1/2");
  await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).click();
  const result = page.locator(".composer-result");
  await expect(result.locator("code")).toHaveText(shareURL(page));
  await expect(result.getByRole("link", { name: "Mở Shopee để mua" })).toHaveAttribute("href", affiliateURL);
  await result.getByRole("button", { name: "Sao chép link", exact: true }).click();
  expect(await page.evaluate(() => (window as any).copiedLink)).toBe(shareURL(page));
  await result.getByRole("button", { name: "Chia sẻ QR", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await expect(page.getByRole("dialog").locator(".link-qr-url")).toHaveText(affiliateURL);
  await page.keyboard.press("Escape");
  await expect(result.getByRole("button", { name: "Chia sẻ QR", exact: true })).toBeFocused();
  await page.goto("/saved-links");
  await page.getByRole("button", { name: "Sao chép link", exact: true }).click();
  expect(await page.evaluate(() => (window as any).copiedLink)).toBe(shareURL(page));
  await page.getByRole("button", { name: "Chia sẻ QR", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".link-qr-url")).toHaveText(affiliateURL);
});

test("downloaded 1024px PNG decodes directly to the Shopee affiliate URL and fits narrow VI/EN screens", async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/saved-links");
  await page.getByRole("button", { name: "Chia sẻ QR", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Chia sẻ QR", exact: true });
  await expect(dialog.getByRole("img")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Chia sẻ ảnh QR", exact: true })).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Tải PNG", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`hoanxu-qr-${code}.png`);
  const buffer = await readFile((await download.path())!);
  const pixels = await page.evaluate(async base64 => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d")!;
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, 256, 256);
    return { width: image.width, height: image.height, pixels: Array.from(context.getImageData(0, 0, 256, 256).data) };
  }, buffer.toString("base64"));
  expect(pixels.width).toBe(1024); expect(pixels.height).toBe(1024);
  expect(jsQR(new Uint8ClampedArray(pixels.pixels), 256, 256)?.data).toBe(affiliateURL);
  expect(pixels.pixels.slice(0, 4)).toEqual([255, 255, 255, 255]);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath("qr-mobile-vi.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await switchLanguage(page, "EN");
  await page.getByRole("button", { name: "Share QR", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Download PNG", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(await page.evaluate(() => (window as any).cspViolations)).toEqual([]);
});

test("native sharing sends the prepared PNG and handles cancellation and failures", async ({ page }) => {
  await fixture(page, true);
  await page.goto("/saved-links");
  await page.getByRole("button", { name: "Chia sẻ QR", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const share = dialog.getByRole("button", { name: "Chia sẻ ảnh QR", exact: true });
  await share.click();
  expect(await page.evaluate(() => (window as any).sharedImage)).toMatchObject({ name: `hoanxu-qr-${code}.png`, type: "image/png", count: 1 });
  await page.evaluate(() => { (window as any).shareFailure = "AbortError"; });
  await share.click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await page.evaluate(() => { (window as any).shareFailure = "NotAllowedError"; });
  await share.click();
  await expect(dialog.getByRole("alert")).toContainText("Bạn có thể tải PNG");
  await expect(dialog.getByRole("button", { name: "Tải PNG", exact: true })).toBeEnabled();
});

test("QR generation can be retried and clipboard failures select the branded URL", async ({ page }) => {
  await fixture(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } });
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    let fail = true;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      if (fail) { fail = false; callback(null); }
      else toBlob.call(this, callback, type, quality);
    };
  });
  await page.goto("/saved-links");
  await page.getByRole("button", { name: "Sao chép link", exact: true }).click();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(shareURL(page));
  await page.getByRole("button", { name: "Chia sẻ QR", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("Không tạo được mã QR");
  await expect(dialog.getByRole("button", { name: "Tải PNG", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Tải PNG", exact: true })).toBeEnabled();
  await expect(dialog.getByRole("img")).toBeVisible();
});
