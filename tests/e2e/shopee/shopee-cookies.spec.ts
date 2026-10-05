import { switchLanguage } from "../../helpers/sidebar";
import { test, expect, type Page } from "@playwright/test";
async function admin(page: Page, role = "admin", permissions: string[] = []) {
  const status = {
    browser: true,
    authenticated: true,
    savedCookies: false,
    state: "authenticated",
    starts: 1,
  };
  const imports: string[] = [];
  let probes = 0;
  const requests: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      p = new URL(req.url()).pathname;
    requests.push(p);
    let data: any = [];
    if (p.endsWith("/me"))
      data = {
        id: "admin",
        name: "Admin",
        role,
        permissions,
        csrfToken: "fixture-csrf",
        mustChangePassword: false,
      };
    if (p.endsWith("/config") || p.endsWith("/settings"))
      data = { brand: "Hoàn Xu", sharePercent: 50, coinExchangeEnabled: false };
    if (p.endsWith("/browser"))
      data = { browser: status, enabled: true, trackingVerified: false };
    if (p.endsWith("/browser/cookies")) {
      expect(req.headers()["x-csrf-token"]).toBe("fixture-csrf");
      const raw = req.postDataJSON().cookie;
      if (raw === "invalid") {
        await route.fulfill({
          status: 422,
          json: {
            error: {
              code: "INVALID_SHOPEE_COOKIES",
              message:
                "Cookie không hợp lệ. Dán JSON cookie xuất từ affiliate.shopee.vn hoặc Cookie header, tối đa 64 KB.",
            },
          },
        });
        return;
      }
      imports.push(raw);
      status.savedCookies = true;
      data = status;
    }
    if (p.endsWith("/browser/session-checks")) {
      expect(req.postData()).toBeNull();
      probes++;
      data = status;
    }
    await route.fulfill({ json: { data, meta: { requestId: "fixture" } } });
  });
  return {
    imports,
    requests,
    status,
    get probes() {
      return probes;
    },
  };
}
test("admin pastes cookies once and probes reuse the session without sending cookies again", async ({
  page,
}) => {
  const fixture = await admin(page);
  await page.goto("/admin/cookies");
  const input = page.getByLabel("Dán cookie Shopee", { exact: true });
  const exported = JSON.stringify({ url: "https://affiliate.shopee.vn", cookies: [{ name: "SPC_EC", value: "fixture=a==", domain: ".shopee.vn" }, { name: "SPC_ST", value: "fixture-b", domain: "affiliate.shopee.vn" }] });
  await input.fill(exported);
  await expect(input).toHaveAttribute("data-hidden", "true");
  await page
    .getByRole("button", { name: "Lưu và áp dụng cookie", exact: true })
    .click();
  await expect(input).toHaveValue("");
  await expect(
    page.getByText("Đã có cookie được lưu mã hóa", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kiểm tra phiên hiện có", exact: true })
    .click();
  await expect(
    page.getByText("Phiên Shopee đang sẵn sàng; Chromium được dùng lại.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.imports).toEqual([exported]);
  expect(fixture.probes).toBe(1);
  expect(fixture.status.starts).toBe(1);
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((value) =>
        String(value).includes("SPC_EC"),
      ),
    ),
  ).toBe(false);
});
test("cookie UI supports English and preserves input on validation failure", async ({
  page,
}) => {
  await admin(page);
  await page.goto("/admin/cookies");
  await switchLanguage(page, "EN");
  const input = page.getByLabel("Paste Shopee cookies", { exact: true });
  await input.fill("invalid");
  await page
    .getByRole("button", { name: "Save and apply cookies", exact: true })
    .click();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid cookies." })).toHaveText(
    "Invalid cookies. Paste cookie JSON exported from affiliate.shopee.vn or a Cookie header, up to 64 KB.",
  );
  await expect(input).toHaveValue("invalid");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Show cookies", exact: true }).click();
  await expect(input).toHaveAttribute("data-hidden", "false");
});

test("cookie navigation is separate and polling stops outside the cookie page", async ({ page, isMobile }) => {
  const fixture = await admin(page);
  await page.goto("/admin/cookies");
  await expect(page.getByRole("heading", { name: "Cài đặt cookie", exact: true })).toBeVisible();
  await expect(page.getByLabel("Dán cookie Shopee", { exact: true })).toBeVisible();
  expect(fixture.requests.filter(p => p.endsWith("/settings") || p.endsWith("/affiliate-channels") || p.endsWith("/audit-logs"))).toEqual([]);
  await page.clock.install();
  const before = fixture.requests.filter(p => p.endsWith("/browser")).length;
  await page.clock.runFor(5000);
  await expect.poll(() => fixture.requests.filter(p => p.endsWith("/browser")).length).toBeGreaterThan(before);
  if (isMobile) await page.getByRole("button", { name: "Thêm", exact: true }).click();
  const nav = page.locator(".side .nav");
  const links = await nav.locator("a").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
  expect(links.indexOf("/admin/cookies")).toBe(links.indexOf("/admin/settings") + 1);
  await nav.getByRole("link", { name: "Cài đặt affiliate", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await expect(page.getByRole("heading", { name: "Thông tin và chính sách", exact: true })).toBeVisible();
  await expect(page.getByLabel("Dán cookie Shopee", { exact: true })).toHaveCount(0);
  const after = fixture.requests.filter(p => p.endsWith("/browser")).length;
  await page.clock.runFor(10000);
  expect(fixture.requests.filter(p => p.endsWith("/browser")).length).toBe(after);
  if (isMobile) await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await nav.getByRole("link", { name: "Cài đặt cookie", exact: true }).click();
  await expect(page.getByLabel("Dán cookie Shopee", { exact: true })).toBeVisible();
});

test("staff without settings permission cannot see cookie navigation", async ({ page, isMobile }) => {
  await admin(page, "staff", ["audit"]);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Tổng quan", exact: true })).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(page.getByRole("link", { name: "Cài đặt cookie", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Cài đặt affiliate", exact: true })).toHaveCount(0);
});

test("Shopee verification shows recovery instructions instead of an expired-login message", async ({ page }) => {
  const fixture = await admin(page);
  fixture.status.state = "verification_required";
  fixture.status.authenticated = false;
  fixture.status.savedCookies = true;
  await page.goto("/admin/cookies");
  await expect(page.locator("p").filter({ hasText: "Phiên: Shopee yêu cầu xác minh truy cập" })).toBeVisible();
  const link = page.getByRole("link", { name: "Mở Shopee Affiliate", exact: true });
  await expect(link).toHaveAttribute("href", "https://affiliate.shopee.vn/dashboard");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByRole("button", { name: "Kiểm tra phiên hiện có", exact: true }).click();
  await expect(page.getByText("Shopee yêu cầu xác minh truy cập. Hoàn tất xác minh trên Shopee Affiliate, sau đó cập nhật cookie và kiểm tra lại phiên.", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Phiên Shopee chưa sẵn sàng. Cập nhật cookie hoặc đăng nhập lại.", { exact: true })).toHaveCount(0);
  await switchLanguage(page, "EN");
  await expect(page.getByRole("link", { name: "Open Shopee Affiliate", exact: true })).toBeVisible();
});
