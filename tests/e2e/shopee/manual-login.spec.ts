import { switchLanguage } from "../../helpers/sidebar";
import { expect, test, type Page } from "@playwright/test";
async function setup(page: Page, role = "admin", permissions = ["settings"], local = false) {
  const status = { browser: true, authenticated: false, state: "login_required" };
  const commands: string[] = [];
  let publisher = "";
  await page.route("**/api/v1/**", async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "admin", name: "Admin", role, permissions, csrfToken: "fixture-csrf", mustChangePassword: false };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/admin/browser")) data = { publisher, enabled: true, remoteAvailable: role === "admin" && !local, localAvailable: role === "admin" && local, browser: status };
    if (req.method() !== "GET") {
      commands.push(path);
      expect(req.headers()["x-csrf-token"]).toBe("fixture-csrf");
    }
    if (path.endsWith("/browser/session-checks")) { expect(req.postData()).toBeNull(); status.authenticated = true; status.state = "authenticated"; data = status; }
    if (path.endsWith("/browser/access") && local) data = { local: true, browser: status };
    if (path.endsWith("/browser/publisher")) { publisher = req.postDataJSON().publisher; data = { publisher }; }
    expect(path.endsWith("/browser/cookies")).toBe(false);
    await route.fulfill({ json: { data, meta: {} } });
  });
  return { commands, status };
}

test("manual Shopee login has no cookie import and checks the existing browser session", async ({ page }) => {
  const fixture = await setup(page);
  await page.goto("/admin/cookies");
  await expect(page.getByRole("heading", { name: "Đăng nhập Shopee", level: 1, exact: true })).toBeVisible();
  await expect(page.getByLabel("Dán cookie Shopee", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tôi đã đăng nhập — Kiểm tra phiên", exact: true }).click();
  await expect(page.getByText("Đã đăng nhập Shopee. Backend đang dùng phiên Chrome này để kiểm tra sản phẩm.", { exact: true })).toBeVisible();
  expect(fixture.commands).toEqual(["/api/v1/admin/browser/session-checks"]);
});

test("publisher can be entered and restored in admin without environment variables", async ({ page }) => {
  const fixture = await setup(page);
  await page.goto("/admin/cookies");
  const input = page.getByLabel("Affiliate ID (Shopee Publisher)", { exact: true });
  await input.fill("123456789");
  await page.getByRole("button", { name: "Lưu Affiliate ID", exact: true }).click();
  await expect(input).toHaveValue("123456789");
  await expect(page.getByRole("button", { name: "Lưu Affiliate ID", exact: true })).toBeDisabled();
  await page.reload();
  await expect(input).toHaveValue("123456789");
  expect(fixture.commands).toEqual(["/api/v1/admin/browser/publisher"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("manual login supports English and guides Shopee verification in server Chrome", async ({ page }) => {
  const fixture = await setup(page);
  fixture.status.state = "verification_required";
  await page.goto("/admin/cookies");
  await switchLanguage(page, "EN");
  await expect(page.getByRole("heading", { name: "Shopee sign-in", level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Chrome on server", exact: true })).toBeVisible();
  await expect(page.getByLabel("Paste Shopee cookies", { exact: true })).toHaveCount(0);
});

test("staff without settings permission cannot see Shopee login navigation", async ({ page, isMobile }) => {
  await setup(page, "staff", ["audit"]);
  await page.goto("/admin");
  if (isMobile) await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(page.getByRole("link", { name: "Đăng nhập Shopee", exact: true })).toHaveCount(0);
});

test("local development opens native Chrome without a remote display popup", async ({ page }) => {
  const fixture = await setup(page, "admin", ["settings"], true);
  await page.goto("/admin/cookies");
  await page.getByLabel("Xác nhận mật khẩu quản trị", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Mở Chrome trên máy này", exact: true }).click();
  await expect(page.getByText("Đã mở Chrome trên máy chạy backend. Đăng nhập Shopee, sau đó quay lại kiểm tra phiên.", { exact: true })).toBeVisible();
  expect(fixture.commands).toEqual(["/api/v1/auth/internal/reauth", "/api/v1/admin/browser/access"]);
  expect(page.context().pages()).toHaveLength(1);
});
