import { test, expect } from "@playwright/test";
import { openSidebar, closeSidebar } from "../../helpers/sidebar";
test("internal passwords retain significant whitespace", async ({ page }) => {
  await page.route("**/api/v1/auth/internal/login", async (route) => {
    await route.fulfill({
      status: 401,
      json: {
        error: { code: "INVALID_CREDENTIALS", message: "Test login failure" },
      },
    });
  });
  await page.goto("/internal/login");
  await page.getByLabel("Tài khoản", { exact: true }).fill("admin");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("  test-password-123  ");
  const sent = page.waitForRequest(
    (r) => r.url().endsWith("/auth/internal/login") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await sent).postDataJSON().password).toBe("  test-password-123  ");
});
test("public screens remove demo and report unconfigured Google", async ({
  page,
}) => {
  const configResponse=await page.request.get('/api/v1/config');
  expect(configResponse.ok(), 'The public UI test requires a running Go API').toBeTruthy();
  const configuration=(await configResponse.json()).data;
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Dán link sản phẩm, nhận link hoàn tiền",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem bản mẫu" })).toHaveCount(0);
  await expect(page.locator(".modebar")).toHaveCount(0);
  await openSidebar(page);
  await expect(page.locator(".side-account").getByRole("button", { name: "Thông báo", exact: true })).toBeVisible();
  await closeSidebar(page);
  await expect(page.locator(".side .nav a[href='/notif']")).toHaveCount(0);
  await page.goto("/login");
  if(configuration.googleConfigured) await expect(page.getByRole('link',{name:'Tiếp tục với Google'})).toBeVisible();
  else await expect(page.getByRole("button", { name: "Google chưa sẵn sàng" })).toBeDisabled();
  await page.goto("/internal/login");
  await expect(page.getByLabel("Tài khoản", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/đăng k[ýí]/i),
  ).toHaveCount(0);
  for (const path of ["/demo", "/demo/hoan-xu-1.html", "/demo/hoan-xu-en.html"]) {
    expect((await page.request.get(path)).status()).toBe(404);
  }
});
test("customer screens render empty real data without sample balances", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: any = [];
    if (path.endsWith("/me"))
      data = {
        id: "customer",
        name: "Khách kiểm thử",
        email: "test@example.com",
        role: "customer",
        permissions: [],
        blocked: false,
        mustChangePassword: false,
        csrfToken: "test-csrf",
        sessionId: "test",
      };
    if (path.endsWith("/config"))
      data = {
        brand: "Hoàn Xu",
        googleConfigured: true,
        coinExchangeEnabled: false,
      };
    if (path.endsWith("/checkins"))
      data = {
        balance: 0,
        streak: 0,
        best: 0,
        lastDay: null,
        checkedIn: false,
      };
    if (path.endsWith("/dashboard"))
      data = {
        pending: 0,
        approved: 0,
        available: 0,
        coins: 0,
        approvedOrders: 0,
      };
    if (path.endsWith("/wallet")) data = { available: 0, held: 0, debt: 0 };
    if (path.endsWith("/affiliate-channels"))
      data = [{ id: "shopee", name: "Shopee", status: "not_configured" }];
    await route.fulfill({ json: { data, meta: { requestId: "test" } } });
  });
  for (const path of [
    "/",
    "/link",
    "/deal",
    "/checkin",
    "/history",
    "/gift",
    "/orders",
    "/wallet",
    "/help",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await openSidebar(page);
    await expect(
      page.getByRole("link", { name: "Khách kiểm thử", exact: true }),
    ).toBeVisible();
    await closeSidebar(page);
    await expect(page.getByText("Đang tải dữ liệu…")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
test("admin screens render all retained workflows", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: any = [];
    if (path.endsWith("/me"))
      data = {
        id: "admin",
        name: "Quản trị",
        role: "admin",
        permissions: [],
        mustChangePassword: false,
        csrfToken: "csrf",
        recentAuthentication: true,
      };
    if (path.endsWith("/config") || path.endsWith("/settings"))
      data = {
        brand: "Hoàn Xu",
        sharePercent: 50,
        coinExchangeEnabled: false,
        supportEmail: "",
      };
    if (path.endsWith("/dashboard") || path.endsWith("/browser")) data = {};
    await route.fulfill({ json: { data, meta: { requestId: "test" } } });
  });
  for (const path of [
    "/admin",
    "/admin/orders",
    "/admin/imports",
    "/admin/withdrawals",
    "/admin/users",
    "/admin/gifts",
    "/admin/deals",
    "/admin/notifications",
    "/admin/settings",
    "/admin/cookies",
    "/admin/accounts",
    "/admin/audit",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await openSidebar(page);
    await expect(page.getByRole("link", { name: "Quản trị", exact: true })).toBeVisible();
    await closeSidebar(page);
    await expect(page.getByText("Đang tải dữ liệu quản trị…")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
