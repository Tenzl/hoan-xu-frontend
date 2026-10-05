import { test, expect } from "@playwright/test";
import { openSidebar } from "./helpers/sidebar";

for (const fail of [false, true]) {
  test(`admin logout ${fail ? "keeps the session on failure" : "returns to the shared login"}`, async ({ page }) => {
    let signedIn = true;
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/logout")) {
        expect(route.request().method()).toBe("POST");
        expect(route.request().headers()["x-csrf-token"]).toBe("fixture-csrf");
        if (fail) {
          await route.fulfill({ status: 500, json: { error: { code: "FAILED", message: "Logout failed" } } });
          return;
        }
        signedIn = false;
      }
      const data = path.endsWith("/me")
        ? signedIn ? { id: "admin", name: "Admin", role: "admin", csrfToken: "fixture-csrf" } : null
        : path.endsWith("/config") ? { brand: "Hoàn Xu" } : {};
      await route.fulfill({ json: { data } });
    });
    await page.goto("/admin");
    await expect(page.locator(".modebar")).toHaveCount(0);
    await openSidebar(page);
    await expect(page.getByRole("link", { name: "Admin", exact: true })).toHaveAttribute("href", "/account");
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    if (fail) {
      await expect(page.getByRole("alert").filter({ hasText: "Logout failed" })).toBeVisible();
      await expect(page).toHaveURL(/\/admin$/);
      await openSidebar(page);
      await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeEnabled();
    } else {
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByLabel("Tài khoản", { exact: true })).toBeVisible();
      await expect(page.locator(".modebar")).toHaveCount(0);
      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "Cần tài khoản nội bộ" })).toBeVisible();
    }
  });
}
