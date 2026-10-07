import { switchLanguage, openSidebar, closeSidebar } from "../../helpers/sidebar";
import { test, expect, type Page } from "@playwright/test";
const savedBank = {
  bank: "Vietcombank",
  account: "001234567890",
  holder: "NGUYEN VAN AN",
};
async function mockApp(page: Page, role = "customer") {
  let bankDetails: typeof savedBank | null = { ...savedBank };
  let name = "An Nguyễn";
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let data: any = [];
    if (path.endsWith("/me")) {
      if (req.method() === "PATCH") {
        const input = req.postDataJSON();
        name = input.name;
        if (input.bankDetails) bankDetails = input.bankDetails;
      }
      data = {
        id: "customer",
        name,
        role,
        email: "an@example.com",
        bankDetails: role === "customer" ? bankDetails : null,
        permissions: [],
        blocked: false,
        mustChangePassword: false,
        recentAuthentication: true,
        csrfToken: "csrf",
        sessionId: "session",
      };
    }
    if (path.endsWith("/config") || path.endsWith("/settings"))
      data = {
        brand: "Hoàn Xu",
        googleConfigured: true,
        coinExchangeEnabled: false,
        sharePercent: 50,
        supportEmail: "",
      };
    if (path.endsWith("/wallet")) data = { available: 50000, held: 0, debt: 0 };
    if (path.endsWith("/dashboard") || path.endsWith("/browser")) data = {};
    if (path.endsWith("/leaderboards")) data = {items:[],period:"week"};
    if (path.endsWith("/checkins"))
      data = {
        balance: 0,
        streak: 0,
        best: 0,
        lastDay: null,
        checkedIn: false,
      };
    await route.fulfill({ json: { data, meta: { requestId: "test" } } });
  });
}
test("bank profile keeps legal name and leading zeros, and prefills withdrawals", async ({
  page,
}) => {
  await mockApp(page);
  await page.goto("/account");
  await expect(page.getByLabel("Số tài khoản", { exact: true })).toHaveValue(
    savedBank.account,
  );
  await expect(
    page.getByLabel("Họ tên đầy đủ hiển thị trên ngân hàng"),
  ).toHaveValue(savedBank.holder);
  const holder = page.getByLabel("Họ tên đầy đủ hiển thị trên ngân hàng");
  await holder.fill("");
  await holder.pressSequentially("nguyen van an");
  await expect(holder).toHaveValue("NGUYEN VAN AN");
  await holder.fill("nguyễn an");
  await expect(holder).toHaveValue("NGUYỄN AN");
  await holder.evaluate((input: HTMLInputElement) => input.setSelectionRange(7, 7));
  await holder.pressSequentially("văn ");
  await expect(holder).toHaveValue("NGUYỄN VĂN AN");
  expect(await holder.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(11);
  await page.getByLabel("Ngân hàng", { exact: true }).fill("ACB");
  await page.getByRole("option", { name: "ACB", exact: true }).click();
  await page.getByLabel("Số tài khoản", { exact: true }).fill("000987654321");
  await switchLanguage(page, "EN");
  await expect(page.getByLabel("Bank", { exact: true })).toHaveValue("ACB");
  await expect(page.getByLabel("Account number", { exact: true })).toHaveValue(
    "000987654321",
  );
  const sent = page.waitForRequest(
    (r) => r.url().endsWith("/me") && r.method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save bank details", exact: true }).click();
  const request = await sent;
  expect(request.headers()["accept-language"]).toBe("en");
  expect(request.postDataJSON()).toEqual({
    name: "An Nguyễn",
    bankDetails: {
      bank: "ACB",
      account: "000987654321",
      holder: "NGUYỄN VĂN AN",
    },
  });
  await page.goto("/wallet");
  await expect(page.getByLabel("Bank", { exact: true })).toHaveValue("ACB");
  await expect(page.getByLabel("Account number", { exact: true })).toHaveValue(
    "000987654321",
  );
  await expect(
    page.getByLabel("Full account holder name as shown by your bank"),
  ).toHaveValue("NGUYỄN VĂN AN");
  const withdrawalHolder = page.getByLabel("Full account holder name as shown by your bank");
  await withdrawalHolder.fill("trần thị bình");
  await expect(withdrawalHolder).toHaveValue("TRẦN THỊ BÌNH");
});
test("language toggle persists and customer screens have English UI", async ({
  page,
}) => {
  await mockApp(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await switchLanguage(page, "EN");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await openSidebar(page);
  await expect(
    page.getByRole("button", { name: "EN", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await closeSidebar(page);
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
    "/account",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await openSidebar(page);
    await expect(
      page.getByRole("link", { name: "An Nguyễn", exact: true }),
    ).toBeVisible();
    await closeSidebar(page);
    await expect(page.getByText("Loading data…", { exact: true })).toHaveCount(
      0,
    );
    // Personal names and the brand retain their spelling; system UI uses English.
    await expect
      .poll(async () =>
        (await page.locator("main").innerText())
          .replaceAll("Hoàn Xu", "")
          .replaceAll("An Nguyễn", ""),
      )
      .not.toMatch(/[À-ỹĐđ]/u);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await switchLanguage(page, "VI");
  await expect(page.getByLabel("Tên hiển thị", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  expect(errors).toEqual([]);
});
test("admin and internal login screens support English", async ({ page }) => {
  await mockApp(page, "admin");
  await page.goto("/admin");
  await switchLanguage(page, "EN");
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
    await expect(
      page.getByText("Loading admin data…", { exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(async () =>
        (await page.locator("main").innerText())
          .replaceAll("Hoàn Xu", "")
          .replaceAll("An Nguyễn", ""),
      )
      .not.toMatch(/[À-ỹĐđ]/u);
  }
  await page.goto("/account");
  await expect(page.getByLabel("Bank", { exact: true })).toHaveCount(0);
  await page.goto("/internal/login");
  await expect(page.getByLabel("Account", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});
