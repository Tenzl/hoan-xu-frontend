import { test, expect, type Page } from "@playwright/test";
import { openSidebar, switchLanguage } from "../../helpers/sidebar";

async function fixture(page: Page, role = "customer") {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "user", name: "Nguyễn Minh Anh", role, permissions: [], csrfToken: "csrf", recentAuthentication: true };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu", googleConfigured: true };
    if (path.endsWith("/dashboard")) data = {};
    await route.fulfill({ json: { data } });
  });
}

test("account tools occupy the sidebar footer with no top bar, and preferences persist", async ({ page }) => {
  await fixture(page);
  await page.goto("/link");
  await expect(page.locator(".modebar")).toHaveCount(0);
  await openSidebar(page);
  const account = page.locator(".side-account");
  await expect(account.getByRole("link", { name: "Nguyễn Minh Anh", exact: true })).toHaveAttribute("href", "/account");
  await expect(account.getByRole("button", { name: "Thông báo", exact: true })).toBeVisible();
  await expect(account.getByRole("button", { name: "Thông báo", exact: true })).toHaveText("");
  await expect(page.getByText("Mua sắm thông minh, tích lũy mỗi ngày", { exact: true })).toHaveCount(0);
  const navBounds = (await page.locator(".side > .nav").boundingBox())!;
  const bounds = (await account.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(navBounds.y + navBounds.height);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: test.info().outputPath("sidebar-light.png") });
  await account.getByRole("button", { name: "Đổi giao diện sáng tối" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await switchLanguage(page, "EN");
  await page.reload();
  await openSidebar(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(account.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  await expect(account.getByRole("button", { name: "EN", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: test.info().outputPath("sidebar-dark-en.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("short screens scroll the menu while account tools stay reachable and mobile Escape restores focus", async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 375, height: 667 } : { width: 1440, height: 540 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fixture(page, "admin");
  await page.goto("/admin");
  await openSidebar(page);
  const menu = page.locator(".side > .nav");
  const geometry = await menu.evaluate((node) => ({ height: node.clientHeight, content: node.scrollHeight }));
  expect(geometry.content).toBeGreaterThan(geometry.height);
  const before = (await page.locator(".side-account").boundingBox())!;
  await menu.getByRole("link", { name: "Nhật ký quản trị", exact: true }).scrollIntoViewIfNeeded();
  expect((await page.locator(".side-account").boundingBox())!.y).toBe(before.y);
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("sidebar-short-admin.png") });
  if (isMobile) {
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.locator(".brand")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator(".side")).toBeHidden();
    await expect(page.getByRole("button", { name: "Thêm", exact: true })).toBeFocused();
  }
});
