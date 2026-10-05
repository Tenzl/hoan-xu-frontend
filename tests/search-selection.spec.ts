import { test, expect } from "@playwright/test";

test("bank selection waits 500ms, cancels old queries and saves chosen value", async ({ page }) => {
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "customer", name: "An", role: "customer", permissions: [], csrfToken: "csrf", bankDetails: { bank: "", account: "0012345678", holder: "NGUYEN VAN AN" } };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu", googleConfigured: true };
    await route.fulfill({ json: { data } });
  });
  await page.goto("/account");
  const bank = page.getByRole("combobox", { name: "Ngân hàng", exact: true });
  await expect(bank).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await bank.fill("viet");
  await page.clock.runFor(499);
  await expect(page.getByRole("option")).toHaveCount(0);
  await bank.fill("mb");
  await page.clock.runFor(499);
  await expect(page.getByRole("option")).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByRole("option", { name: "MBBANK", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "VietinBank", exact: true })).toHaveCount(0);
  await page.getByRole("option", { name: "MBBANK", exact: true }).click();
  await expect(bank).toHaveValue("MBBANK");
  const request = page.waitForRequest(r => r.url().endsWith("/me") && r.method() === "PATCH");
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  expect((await request).postDataJSON().bankDetails.bank).toBe("MBBANK");
});

test("bank dropdown has all supplied banks, empty results and keyboard selection", async ({ page }) => {
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "customer", name: "An", role: "customer", permissions: [], csrfToken: "csrf" };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/wallet")) data = { available: 50000, held: 0, debt: 0 };
    await route.fulfill({ json: { data } });
  });
  await page.goto("/wallet");
  const bank = page.getByRole("combobox", { name: "Ngân hàng", exact: true });
  await bank.click();
  await expect(page.getByRole("option")).toHaveCount(49);
  await bank.fill("no-bank-matches");
  await expect(page.getByText("Không tìm thấy kết quả.")).toBeVisible();
  await bank.fill("namabank");
  await expect(page.getByRole("option", { name: "Nam A Bank", exact: true })).toBeVisible();
  await page.screenshot({ path: `search-selection-test-results/banks-${test.info().project.name}.png` });
  await bank.press("ArrowDown");
  await bank.press("Enter");
  await expect(bank).toHaveValue("Nam A Bank");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await bank.fill("ACB");
  await bank.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
