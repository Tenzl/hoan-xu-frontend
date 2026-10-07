import { test, expect, type Page } from "@playwright/test";
import { openSidebar, closeSidebar, switchLanguage } from "../../helpers/sidebar";

const freshId = "11111111-1111-4111-8111-111111111111";
const legacyId = "22222222-2222-4222-8222-222222222222";
const orderId = "33333333-3333-4333-8333-333333333333";
async function fixture(page: Page, options: { permissions?: string[]; empty?: boolean; error?: boolean; uncertain?: boolean; reauth?: boolean } = {}) {
  const fresh = { id: freshId, name: "New customer", email: "new@example.com", kind: "new", available: 1000, goldTotal: 10000, goldUsed: 9000, held: 0, giftHeld: 0, createdAt: "2026-01-01T00:00:00Z", blocked: false };
  const legacy = { ...fresh, id: legacyId, name: "Old customer", email: "", kind: "legacy", available: 2000 };
  let manual: Record<string, unknown> | undefined;
  let fail = !!options.error;
  let manualKey = "";
  let authenticated = !options.reauth;
  const calls: { path: string; method: string; body?: Record<string, unknown> }[] = [];
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    const body = method === "GET" ? undefined : request.postDataJSON();
    calls.push({ path: path + url.search, method, body });
    const reply = (data: unknown, meta = {}, status = 200) => route.fulfill({ status, json: { data, meta } });
    if (path === "/me") return reply({ id: "admin", name: "Admin", role: options.permissions ? "staff" : "admin", permissions: options.permissions, csrfToken: "fixture-csrf" });
    if (path === "/config") return reply({ brand: "Hoàn Xu" });
    if (path === "/notifications") return reply([]);
    if (path === "/leaderboard-prizes/current") return reply(null);
    if (path === "/me/leaderboard-awards") return reply([]);
    if (path === "/leaderboards") return reply({ period: url.searchParams.get("period"), items: [], total: 0 });
    if (path === "/auth/internal/reauth") { authenticated = true; return reply({ ok: true }); }
    if (path === "/admin/work-queues") return reply({pendingOrders:0,pendingWithdrawals:0,processingWithdrawals:0,pendingGifts:0});
    if (path === "/admin/dashboard") return reply({ commission: 100, cashback: 50, retained: 50, pendingCommission: 20, users: 1, links: 2 });
    if (path === "/admin/users") {
      expect(["new", "legacy"]).toContain(url.searchParams.get("kind"));
      const customer = url.searchParams.get("kind") === "legacy" ? legacy : fresh;
      return reply(!url.searchParams.get("q") || customer.name.includes(url.searchParams.get("q")!) ? [customer] : []);
    }
    const match = path.match(/^\/admin\/users\/([^/]+)(.*)$/);
    if (match) {
      const customer = match[1] === legacyId ? legacy : fresh;
      const suffix = match[2];
      if (options.permissions && (!options.permissions.includes("orders") || !options.permissions.includes("users")))
        return route.fulfill({ status: 403, json: { error: { code: "FORBIDDEN", message: "Bạn không có quyền." } } });
      if (method !== "GET") {
        expect(request.headers()["x-csrf-token"]).toBe("fixture-csrf");
        expect(customer.kind).toBe("legacy");
        if (!authenticated) return route.fulfill({ status: 403, json: { error: { code: "REAUTH_REQUIRED", message: "Vui lòng xác thực lại mật khẩu." } } });
        if (suffix === "/name") { legacy.name = body.name; return reply(legacy); }
        if (suffix === "/orders") {
          expect(request.headers()["idempotency-key"]).toBeTruthy();
          expect(body).toMatchObject({ productName: "Added product", cashback: 12000, note: "Historical note" });
          expect(body.orderedAt).toMatch(/\+07:00$/);
          const key = request.headers()["idempotency-key"];
          if (options.uncertain && manualKey) {
            expect(key).toBe(manualKey);
            return reply({ id: orderId, cashback: 12000, status: "approved" }, {}, 201);
          }
          legacy.available += 12000;
          legacy.goldTotal += 12000;
          manualKey = key;
          manual = { id: orderId, userId: legacyId, name: legacy.name, externalId: "MANUAL-1", lineId: "1", productName: body.productName, orderedAt: body.orderedAt, value: 0, commission: 12000, cashback: 12000, status: "approved", sourceStatus: "approved", publisher: "admin-legacy", channel: "shopee", tierCode: null, sharePercent: 100, isManual: true, note: body.note };
          if (options.uncertain) return route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR", message: "Uncertain response" } } });
          return reply({ id: orderId, cashback: 12000, status: "approved" }, {}, 201);
        }
      }
      if (!suffix) return reply(customer);
      if (suffix === "/orders" && fail) { fail = false; return route.fulfill({ status: 503, json: { error: { message: "Fixture unavailable" } } }); }
      const row = manual || { id: orderId, userId: customer.id, name: customer.name, externalId: "SOURCE-1", lineId: "LINE-1", productName: "Tracked product", orderedAt: "2026-10-06T12:00:00+07:00", value: 100000, commission: 10000, cashback: 5000, status: "approved", sourceStatus: "approved", publisher: "Publisher", channel: "shopee", tierCode: "bronze", sharePercent: 50, isManual: false, note: "" };
      if (suffix.startsWith("/orders/")) return reply(row);
      if (suffix === "/orders") {
        const status = url.searchParams.get("status");
        const second = url.searchParams.get("page") === "2";
        return reply(options.empty || status === "pending" ? [] : [{ ...row, externalId: second ? "SOURCE-2" : row.externalId }], { hasNext: !second && !status && !options.empty });
      }
    }
    throw new Error(`Unexpected API ${method} ${path}`);
  });
  return calls;
}

test("new customers have a read-only order page with detail, filters and paging", async ({ page }) => {
  const calls = await fixture(page);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Khách hàng", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Khóa", exact: true })).toHaveCount(0);
  await expect(page.getByRole("columnheader",{name:"Tổng Xu vàng",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Chi tiết",exact:true}).click();
  await expect(page.getByText("Tổng Xu vàng",{exact:true})).toBeVisible();
  await expect(page.getByText("Đã sử dụng",{exact:true})).toBeVisible();
  await page.getByRole("link", { name: "Xem đơn hàng" }).click();
  await expect(page).toHaveURL(new RegExp("/admin/users/"+freshId+"/orders\\?"));
  await expect(page.getByText("new@example.com", { exact: true })).toBeVisible();
  await page.getByText("Số dư và xếp hạng chi tiết",{exact:true}).click();
  await expect(page.locator(".customer-summary dl")).toContainText("Tổng Xu vàng10.000 Xu");
  await expect(page.locator(".customer-summary dl")).toContainText("Đã sử dụng9.000 Xu");
  await page.getByText("Số dư và xếp hạng chi tiết",{exact:true}).click();
  await expect(page.getByRole("button", { name: "Sửa tên" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thêm đơn", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Chi tiết đơn hàng" });
  await dialog.getByText("Thông tin kỹ thuật",{exact:true}).click();
  await expect(dialog.getByText("LINE-1", { exact: true })).toBeVisible();
  await expect(dialog.getByText("50%", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp →" }).click();
  await expect(page.getByText("SOURCE-2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chờ duyệt", exact: true }).click();
  await expect(page.getByText("Chưa có đơn hàng", { exact: true })).toBeVisible();
  expect(calls.some(call => call.path.includes("status=pending") && call.path.includes("page=1"))).toBeTruthy();
  await page.reload();
  await expect(page.getByText("Tracked product", { exact: true })).toBeVisible();
  await openSidebar(page);
  await expect(page.locator('.nav a[href="/admin/users"]')).toHaveAttribute("aria-current", "page");
  await closeSidebar(page);
  expect(calls.filter(call => call.method !== "GET")).toHaveLength(0);
});

test("legacy customers can be searched, renamed and credited by a manual order", async ({ page }) => {
  await fixture(page);
  await page.goto("/admin/legacy-users");
  await expect(page.getByRole("heading", { name: "Khách hàng", exact: true })).toBeVisible();
  await page.getByLabel("Tìm khách hàng").fill("Old");
  await page.getByRole("link", { name: "Xem đơn hàng" }).click();
  await page.getByRole("button", { name: "Sửa tên", exact: true }).click();
  const rename = page.getByRole("dialog", { name: "Sửa tên" });
  await rename.getByLabel("Tên khách hàng").fill("Renamed legacy");
  await rename.getByRole("button", { name: "Lưu tên" }).click();
  await expect(rename).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Renamed legacy" })).toBeVisible();
  await page.getByRole("button", { name: "Thêm đơn", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Thêm đơn cho khách cũ" });
  await form.getByLabel("Sản phẩm", { exact: true }).fill("Added product");
  await form.getByLabel("Ngày giờ đặt (GMT+7)").fill("2026-01-01T10:00");
  await form.getByLabel("Số Xu hoàn").fill("12000");
  await form.getByLabel("Ghi chú").fill("Historical note");
  await form.getByRole("button", { name: "Thêm đơn", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(page.getByText("Added product", { exact: true })).toBeVisible();
  await expect(page.locator(".customer-summary")).toContainText("14.000 Xu");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Historical note");
  await page.screenshot({ path: test.info().outputPath("manual-order-detail.png"), fullPage: true });
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("link", { name: "← Danh sách khách hàng" }).click();
  await expect(page.getByText("Renamed legacy", { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("legacy-users.png"), fullPage: true });
});

test("direct URLs redirect customers to the correct group", async ({ page }) => {
  await fixture(page);
  await page.goto(`/admin/users/${legacyId}/orders`);
  await expect(page).toHaveURL(`/admin/legacy-users/${legacyId}/orders`);
  await expect(page.getByRole("button", { name: "Sửa tên", exact: true })).toBeVisible();
  await page.goto(`/admin/legacy-users/${freshId}/orders`);
  await expect(page).toHaveURL(`/admin/users/${freshId}/orders`);
  await expect(page.getByRole("button", { name: "Sửa tên", exact: true })).toHaveCount(0);
});

test("missing orders permission hides links and blocks direct detail access", async ({ page }) => {
  const calls = await fixture(page, { permissions: ["users"] });
  await page.goto("/admin/users");
  await expect(page.getByText("New customer", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem đơn hàng" })).toHaveCount(0);
  await page.goto(`/admin/users/${freshId}/orders`);
  await expect(page.getByRole("alert").filter({ hasText: "Bạn không có quyền." })).toBeVisible();
  expect(calls.some(call => call.path.includes(freshId))).toBeFalsy();
});

test("order errors retry and empty lists are explicit", async ({ page }) => {
  await fixture(page, { error: true, empty: true });
  await page.goto(`/admin/users/${freshId}/orders`);
  await expect(page.getByRole("alert").filter({ hasText: "Fixture unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByText("Chưa có đơn hàng", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp →" })).toBeDisabled();
});

test("overview explains that its totals include only new customers", async ({ page }) => {
  await fixture(page);
  await page.goto("/admin");
  await expect(page.getByText("Số liệu tài chính chỉ tính khách đăng ký; không gồm khách từ hệ thống cũ.", { exact: true })).toBeVisible();
  await expect(page.locator(".stat").filter({ hasText: "Khách đăng ký" })).toContainText("1");
});

test("customer management supports English", async ({ page }) => {
  await fixture(page);
  await page.goto(`/admin/legacy-users/${legacyId}/orders`);
  await expect(page.getByRole("button", { name: "Sửa tên", exact: true })).toBeVisible();
  await switchLanguage(page, "EN");
  await expect(page.getByRole("button", { name: "Edit name", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Customer list" })).toBeVisible();
});

test("uncertain manual order responses reuse the operation key when retried", async ({ page }) => {
  const calls = await fixture(page, { uncertain: true });
  await page.goto(`/admin/legacy-users/${legacyId}/orders`);
  await page.getByRole("button", { name: "Thêm đơn", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Thêm đơn cho khách cũ" });
  await form.getByLabel("Sản phẩm", { exact: true }).fill("Added product");
  await form.getByLabel("Ngày giờ đặt (GMT+7)").fill("2026-01-01T10:00");
  await form.getByLabel("Số Xu hoàn").fill("12000");
  await form.getByLabel("Ghi chú").fill("Historical note");
  await form.getByRole("button", { name: "Thêm đơn", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("Uncertain response");
  await form.getByRole("button", { name: "Thêm đơn", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(page.locator(".customer-summary")).toContainText("14.000 Xu");
  expect(calls.filter(call => call.method === "POST" && call.path.endsWith("/orders"))).toHaveLength(2);
});

test("legacy customer forms resume after password reauthentication", async ({ page }) => {
  await fixture(page, { reauth: true });
  await page.goto(`/admin/legacy-users/${legacyId}/orders`);
  await page.getByRole("button", { name: "Sửa tên", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Sửa tên", exact: true });
  await form.getByLabel("Tên khách hàng").fill("Reauthenticated name");
  await form.getByRole("button", { name: "Lưu tên" }).click();
  const reauth = page.getByRole("dialog", { name: "Xác thực lại mật khẩu" });
  await reauth.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password");
  await reauth.getByRole("button", { name: "Xác thực", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reauthenticated name" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
