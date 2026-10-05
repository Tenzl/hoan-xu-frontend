import { test, expect } from "@playwright/test";
import { openSidebar } from "./helpers/sidebar";

test("notification popup supports scrolling, read state and keyboard dismissal", async ({ page }) => {
  const notices = Array.from({ length: 24 }, (_, i) => ({ id: `notice-${i}`, title: `Thông báo ${i + 1}`, body: "Nội dung cập nhật đơn hàng của bạn.", createdAt: "2026-10-05T02:00:00Z", read: i > 0 }));
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith("/me")) data = { id: "customer", name: "Khách kiểm thử", role: "customer", csrfToken: "csrf", permissions: [] };
    if (url.pathname.endsWith("/config")) data = { brand: "Hoàn Xu", googleConfigured: true };
    if (url.pathname.endsWith("/notifications")) {
      const second = url.searchParams.get("page") === "2";
      data = second ? notices.slice(20) : notices.slice(0, 20);
    }
    if (url.pathname.endsWith("/notice-0/read-receipt")) notices[0].read = true;
    if (url.pathname.endsWith("/notification-read-batches")) notices.forEach(n => n.read = true);
    await route.fulfill({ json: { data } });
  });
  await page.goto("/");
  await openSidebar(page);
  const trigger = page.getByRole("button", { name: "Thông báo", exact: true });
  await expect(trigger.locator(".notification-dot")).toBeVisible();
  await trigger.click();
  const popup = page.getByRole("dialog", { name: "Thông báo", exact: true });
  await expect(popup).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(popup.locator(".unread")).toHaveCount(1);
  await expect(popup.locator(".notification-state").getByText("Đã đọc", { exact: true })).toHaveCount(19);
  const bounds = await popup.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  const scroll = popup.locator(".notification-scroll");
  const geometry = await scroll.evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight }));
  expect(geometry.height).toBeLessThanOrEqual(500);
  expect(geometry.content).toBeGreaterThan(geometry.height);
  await page.screenshot({ path: `notification-test-results/popup-${test.info().project.name}.png` });
  await popup.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }).click();
  await expect(popup.locator(".unread")).toHaveCount(0);
  await expect(trigger.locator(".notification-dot")).toHaveCount(0);
  await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event("scroll", { bubbles: true })); });
  await expect(popup.getByRole("heading", { name: "Thông báo 24", exact: true })).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(trigger).toBeFocused();
  notices[1].read = false;
  await trigger.click();
  await page.getByRole("button", { name: "Đổi giao diện sáng tối" }).click();
  await expect(popup).toHaveCount(0);
  await page.goto("/notif");
  await expect(page).toHaveURL(/\/$/);
});

test("guests see sign in inside notification popup", async ({ page }) => {
  await page.route("**/api/v1/**", route => route.fulfill({ json: { data: route.request().url().endsWith("/me") ? null : route.request().url().endsWith("/config") ? { brand: "Hoàn Xu" } : [] } }));
  await page.goto("/");
  await openSidebar(page);
  await page.getByRole("button", { name: "Thông báo", exact: true }).click();
  const popup = page.getByRole("dialog", { name: "Thông báo", exact: true });
  await expect(popup.getByText("Đăng nhập để xem thông báo.")).toBeVisible();
  await expect(popup.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveAttribute("href", "/login");
});
