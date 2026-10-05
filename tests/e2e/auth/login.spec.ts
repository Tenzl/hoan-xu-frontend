import { test, expect } from "@playwright/test";
import { openSidebar } from "../../helpers/sidebar";

test("customer sidebar opens one login page with passwords and Google", async ({ page }) => {
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: { data: path.endsWith("/me") ? null : path.endsWith("/config") ? { brand: "Hoàn Xu", googleConfigured: true } : [] } });
  });
  await page.goto("/");
  await openSidebar(page);
  await expect(page.getByText("Đăng nhập nội bộ", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveCount(1);
  await page.locator(".side-account").getByRole("link", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Tài khoản", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tiếp tục với Google" })).toHaveAttribute("href", "/api/v1/auth/google");
  await expect(page.getByText(/đăng k[ýí]/i)).toHaveCount(0);
  await expect(page.getByText("Đăng nhập nội bộ", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath(`login-${test.info().project.name}.png`) });
  await page.goto("/internal/login");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
});

test("password login preserves whitespace and redirects authenticated staff", async ({ page }) => {
  let signedIn = false;
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/auth/internal/login")) {
      expect(route.request().postDataJSON()).toEqual({ username: "admin", password: "  test-password-123  " });
      signedIn = true;
    }
    if (path.endsWith("/me")) data = signedIn ? { id: "admin", name: "Quản trị", role: "admin", permissions: [], csrfToken: "csrf" } : null;
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu", googleConfigured: false };
    if (path.endsWith("/dashboard") || path.endsWith("/browser")) data = {};
    await route.fulfill({ json: { data } });
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Google chưa sẵn sàng" })).toBeDisabled();
  await page.getByLabel("Tài khoản", { exact: true }).fill("admin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("  test-password-123  ");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await openSidebar(page);
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
});
