import { test, expect, type Page } from "@playwright/test";
import { openSidebar } from "../../helpers/sidebar";

async function mockSession(page: Page, role: "customer" | "staff" | "admin" | null) {
  const adminRequests: string[] = [];
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    if (path.startsWith("/admin/")) adminRequests.push(path);
    const data = path === "/me" ? role ? { id: role, name: "An Nguyễn", role, permissions: ["orders"], csrfToken: "csrf" } : null
      : path === "/config" ? { brand: "Hoàn Xu", googleConfigured: true }
      : path === "/me/dashboard" || path === "/admin/dashboard" || path === "/admin/work-queues" ? {} : [];
    return route.fulfill({ json: { data } });
  });
  return adminRequests;
}

for (const role of ["staff", "admin"] as const) {
  test(`password login lets ${role} enter admin from the account with the same session`, async ({ page }) => {
    let signedIn = false;
    let loginCount = 0;
    await page.route("**/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      let data: unknown = [];
      if (path === "/auth/internal/login") {
        expect(route.request().postDataJSON()).toEqual({ username: "admin", password: "  test-password-123  " });
        signedIn = true;
        loginCount++;
      }
      if (path === "/me") data = signedIn ? { id: role, name: "An Nguyễn", role, permissions: ["orders"], csrfToken: "fresh-csrf", sessionId: "same-session" } : null;
      if (path === "/me" && route.request().method() === "PATCH") expect(route.request().headers()["x-csrf-token"]).toBe("fresh-csrf");
      if (path === "/config") data = { brand: "Hoàn Xu", googleConfigured: false };
      if (path === "/admin/dashboard" || path === "/admin/work-queues") data = {};
      await route.fulfill({ json: { data } });
    });
    await page.goto("/login");
    await page.getByLabel("Tài khoản", { exact: true }).fill("admin");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("  test-password-123  ");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByLabel("Tên hiển thị", { exact: true })).toHaveValue("An Nguyễn");
    const saved = page.waitForResponse(response => response.url().endsWith("/me") && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    await saved;
    await page.getByRole("link", { name: "Vào trang quản trị", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Việc cần xử lý", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Việc cần xử lý", exact: true })).toBeVisible();
    await openSidebar(page);
    await expect(page.locator(".side-profile")).toContainText("An Nguyễn");
    await expect(page.locator('.nav a[href="/admin/orders"]')).toBeVisible();
    if (role === "staff") await expect(page.locator('.nav a[href="/admin/accounts"]')).toHaveCount(0);
    expect(loginCount).toBe(1);
  });
}

test("invalid password stays on the shared login and can be retried", async ({ page }) => {
  await mockSession(page, null);
  await page.route("**/api/v1/auth/internal/login", route => route.fulfill({ status: 401, json: { error: { code: "INVALID_CREDENTIALS", message: "Tài khoản hoặc mật khẩu không đúng." } } }));
  await page.goto("/login");
  await page.getByLabel("Tài khoản", { exact: true }).fill("admin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".login-error")).toContainText("Tài khoản hoặc mật khẩu không đúng.");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeEnabled();
});

for (const role of [null, "customer"] as const) {
  test(`${role || "guest"} cannot enter admin or see its account link`, async ({ page }) => {
    const adminRequests = await mockSession(page, role);
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: role ? "Hồ sơ" : "Đăng nhập để xem dữ liệu cá nhân", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Vào trang quản trị", exact: true })).toHaveCount(0);
    for (const path of ["/admin", "/admin/orders", "/internal/password"]) {
      await page.goto(path);
      await expect(page).toHaveURL(role ? /\/account$/ : /\/login$/);
    }
    expect(adminRequests).toEqual([]);
  });
}

test("unauthenticated API response sends admin visitors to the shared login", async ({ page }) => {
  const adminRequests = await mockSession(page, null);
  await page.route("**/api/v1/me", route => route.fulfill({ status: 401, json: { error: { code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập." } } }));
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
  expect(adminRequests).toEqual([]);
});

test("admin waits for the session and lets visitors retry a connection failure", async ({ page }) => {
  const adminRequests = await mockSession(page, "staff");
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  let failed = true;
  await page.route("**/api/v1/me", async route => {
    if (failed) {
      await waiting;
      await route.fulfill({ status: 503, json: { error: { code: "API_UNAVAILABLE", message: "Kết nối đang gián đoạn. Vui lòng thử lại sau." } } });
    } else await route.fallback();
  });
  await page.goto("/admin");
  await expect(page.getByText("Đang kiểm tra phiên…", { exact: true })).toBeVisible();
  expect(adminRequests).toEqual([]);
  release();
  await expect(page.locator("main").getByRole("alert")).toContainText("Kết nối đang gián đoạn.");
  await expect(page).toHaveURL(/\/admin$/);
  expect(adminRequests).toEqual([]);
  failed = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Việc cần xử lý", exact: true })).toBeVisible();
});

for (const entry of ["admin", "login"] as const) {
test(`temporary passwords from ${entry} are changed before entering admin`, async ({ page }) => {
  const adminRequests = await mockSession(page, "staff");
  let mustChange = true;
  let signedIn = entry === "admin";
  await page.route("**/api/v1/me", route => route.fulfill({ json: { data: signedIn ? { id: "staff", name: "An Nguyễn", role: "staff", permissions: ["orders"], csrfToken: "csrf", mustChangePassword: mustChange } : null } }));
  await page.route("**/api/v1/auth/internal/login", route => {
    signedIn = true;
    return route.fulfill({ json: { data: { loggedIn: true } } });
  });
  await page.route("**/api/v1/me/password", route => {
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf");
    mustChange = false;
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto(entry === "admin" ? "/admin/orders" : "/login");
  if (entry === "login") {
    await page.getByLabel("Tài khoản", { exact: true }).fill("staff");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("temporary-password");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/internal\/password$/);
  await expect(page.locator("main")).toHaveClass(/customer-page/);
  await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill("temporary-password");
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill("new-password-123");
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  expect(adminRequests).toEqual([]);
  await page.getByRole("link", { name: "Vào trang quản trị", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
}

for (const fail of [false, true]) {
  test(`account logout ${fail ? "keeps the session on failure" : "returns to the shared login"}`, async ({ page }) => {
    await mockSession(page, "staff");
    await page.route("**/api/v1/auth/logout", async route => {
      expect(route.request().headers()["x-csrf-token"]).toBe("csrf");
      if (!fail) await page.route("**/api/v1/me", request => request.fulfill({ status: 401, json: { error: { code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập." } } }));
      return route.fulfill(fail ? { status: 503, json: { error: { code: "FAILED", message: "Logout failed" } } } : { json: { data: { loggedOut: true } } });
    });
    await page.goto("/account");
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    if (fail) {
      await expect(page.getByRole("status").filter({ hasText: "Logout failed" })).toBeVisible();
      await expect(page).toHaveURL(/\/account$/);
      await expect(page.getByRole("link", { name: "Vào trang quản trị", exact: true })).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
    }
  });
}
