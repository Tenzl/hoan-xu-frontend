import { test, expect } from "@playwright/test";

test("Shopee report previews source states, decimal money and Channel before commit", async ({ page }, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.setItem("hoanxu.theme", "dark"));
  }
  let uploads = 0, commits = 0;
  let batchStatus = "preview";
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const batch = { id: "report", filename: "shopee.csv", status: batchStatus, counts: { valid: 1, ignored: 2 }, createdAt: "2026-10-08" };
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "admin", name: "Admin", role: "admin", csrfToken: "fixture" };
    else if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    else if (path.endsWith("/commit")) { commits++; batchStatus = "completed"; data = { id: "report", status: "queued" }; }
    else if (path.endsWith("/order-imports")) { if (route.request().method() === "POST") { uploads++; data = batch; } else data = [batch]; }
    else if (path.endsWith("/rows")) data = [
      { number: 1, status: "valid", payload: { orderId: "2610071J9FCGJ1", productName: "Tai nghe Anker", shopeeOrderStatus: "Pending", affiliateItemStatus: "Pending", reportChannel: "Zalo", reportedValue: "463832", reportedCommission: "20872.44", status: "pending" } },
      ...[2, 3].map(number => ({ number, status: "ignored", error: "Không thuộc chiến dịch Hoàn Xu hoặc dùng mã link cũ", payload: { orderId: "260908EGG3Y5PS", productName: "Gạo TOMAX " + number, shopeeOrderStatus: "Cancelled", affiliateItemStatus: "Cancelled", reportChannel: "Code Sharing", reportedValue: "0", reportedCommission: "0", status: "rejected" } })),
    ];
    await route.fulfill({ json: { data, meta: { hasNext: false } } });
  });
  await page.goto("/admin/imports");
  await page.getByLabel("Chọn báo cáo CSV", { exact: true }).setInputFiles({ name: "shopee.csv", mimeType: "text/csv", buffer: Buffer.from("Order id,Channel\n2610071J9FCGJ1,Zalo\n") });
  const preview = page.getByRole("region", { name: "Xem trước dữ liệu", exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByText("20.872,44₫", { exact: true })).toBeVisible();
  await expect(preview.getByText("Zalo", { exact: true })).toBeVisible();
  await expect(preview.getByText("Code Sharing", { exact: true })).toHaveCount(2);
  await expect(preview.getByText("Chờ hoàn thành", { exact: true })).toHaveCount(2);
  await expect(preview.getByText("Đã hủy", { exact: true })).toHaveCount(4);
  expect(uploads).toBe(1); expect(commits).toBe(0);
  const viewport = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await page.screenshot({ path: testInfo.outputPath("shopee-preview.png"), fullPage: true });
  await preview.getByRole("button", { name: "Xác nhận nhập", exact: true }).click();
  await expect(preview.getByRole("button", { name: "Xác nhận nhập", exact: true })).toHaveCount(0);
  expect(commits).toBe(1);
});

test("failed CSV upload can retry and invalid rows block confirmation", async ({ page }) => {
  let uploads = 0;
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const batch = { id: "invalid", filename: "bad.csv", status: "preview", counts: { invalid: 1 }, createdAt: "2026-10-08" };
    if (path.endsWith("/order-imports") && route.request().method() === "POST" && ++uploads === 1) {
      await route.fulfill({ status: 422, json: { error: { code: "CSV_INVALID", message: "CSV cần encoding UTF-8" } } }); return;
    }
    const data = path.endsWith("/me") ? { id: "admin", name: "Admin", role: "admin", csrfToken: "fixture" } : path.endsWith("/config") ? { brand: "Hoàn Xu" } : path.endsWith("/order-imports") ? route.request().method() === "POST" ? batch : [batch] : path.endsWith("/rows") ? [{ number: 1, status: "invalid", error: "Trạng thái Shopee chưa được nhận diện", payload: { shopeeOrderStatus: "Mystery", affiliateItemStatus: "Pending", productName: "Dòng lỗi" } }] : [];
    await route.fulfill({ json: { data, meta: { hasNext: false } } });
  });
  await page.goto("/admin/imports");
  await page.getByLabel("Chọn báo cáo CSV", { exact: true }).setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from("bad") });
  await expect(page.getByRole("alert").filter({ hasText: "CSV cần encoding UTF-8" })).toBeVisible();
  await page.getByRole("button", { name: "Thử xem trước lại", exact: true }).click();
  const preview = page.getByRole("region", { name: "Xem trước dữ liệu", exact: true });
  await expect(preview.getByText("Mystery", { exact: true })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Xác nhận nhập", exact: true })).toBeDisabled();
  expect(uploads).toBe(2);
});
