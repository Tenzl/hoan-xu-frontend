import { test, expect, type Page } from "@playwright/test";
import {
  openSidebar,
  closeSidebar,
  switchLanguage,
} from "../../helpers/sidebar";

async function fixture(page: Page, streak = 2, lastDay = "2026-10-05") {
  let checked = false;
  let checkins = 0;
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    let data: unknown = [];
    if (p.endsWith("/me"))
      data = {
        id: "customer",
        name: "An",
        role: "customer",
        csrfToken: "csrf",
        permissions: [],
      };
    if (p.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (p.endsWith("/dashboard"))
      data = { available: 50000,greenAvailable:checked?900:0, membership: null };
    if (p.endsWith("/wallet"))
      data = { available: 50000, held: 0, giftHeld: 0, debt: 0 };
    if (p.endsWith("/checkins")) {
      if (route.request().method() === "POST") {
        checkins++;
        await new Promise((resolve) => setTimeout(resolve, 150));
        checked = true;
        data = { awardXu: 900, available: 50000,greenAvailable:900, streak: 3, day: "2026-10-06" };
      } else
        data = {
          available: 50000,greenAvailable:checked?900:0,
          unit: "xu",
          streak: checked ? 3 : streak,
          best: 31,
          checkedIn: checked,
          today: "2026-10-06",
          lastDay: checked ? "2026-10-06" : lastDay,
          days: [],
        };
    }
    if (p.endsWith("/wallet/transactions"))
      data =
        Number(url.searchParams.get("page") || 1) === 1
          ? [
              {
                id: "repay",
                description: "Điểm danh",
                amount: 200,
                heldAmount: 0,
                giftHeldAmount: 0,
                debtAmount: -100,
                createdAt: "2026-10-06T02:00:00Z",
                unit: "xu",
              },
              {
                id: "paid",
                description: "Đã chuyển khoản",
                amount: 0,
                heldAmount: -50000,
                giftHeldAmount: 0,
                debtAmount: 0,
                createdAt: "2026-10-05T02:00:00Z",
                unit: "xu",
              },
            ]
          : [];
    if (p.endsWith("/coins/transactions"))
      data = [
        {
          id: "old",
          description: "Điểm danh",
          amount: 1,
          equivalentXu: 300,
          unit: "legacy_coin",
          createdAt: "2026-09-01T02:00:00Z",
        },
      ];
    if (p.endsWith("/withdrawals"))
      data = [
        {
          id: "withdrawal",
          bank: "ACB",
          account: "123456789",
          amount: 50000,
          status: "rejected",
          reason: "Sai tài khoản",
          createdAt: "2026-10-05T02:00:00Z",
        },
      ];
    if (p.endsWith("/gift-redemptions"))
      data = [
        {
          id: "gift",
          giftName: "Voucher Shopee",
          costXu: 10500,
          costUnit: "xu",
          status: "completed",
          code: "SHOPEE-123",
          createdAt: "2026-10-05T02:00:00Z",
        },
      ];
    await route.fulfill({ json: { data } });
  });
  return () => checkins;
}

for (const path of ["/", "/checkin"]) test(`full check-in at ${path} awards its milestone once with green Xu`, async ({
  page,
}) => {
  const count = await fixture(page);
  await page.goto(path);
  const checkin = page.getByRole("region", { name: "Điểm danh nhận Xu xanh" });
  await expect(checkin.locator(".checkin-details")).toBeVisible();
  await expect(checkin.locator(".checkin-milestones li")).toHaveCount(4);
  await expect(checkin.locator(".checkin-rule")).toBeVisible();
  await expect(checkin.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  const button = checkin.getByRole("button", { name: "Điểm danh +900 Xu" });
  await button.dblclick();
  await expect(
    checkin.getByRole("button", { name: "Đã điểm danh", exact: true }),
  ).toBeDisabled();
  await expect(checkin.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
  expect(count()).toBe(1);
  await openSidebar(page);
  await expect(
    page.locator(".nav").getByRole("link", { name: "Điểm danh", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".nav").getByRole("link",{name:"Ví của tôi",exact:true})).toHaveAttribute("href","/wallet");
  await closeSidebar(page);
});

test("history retains wallet movements, withdrawal reasons, vouchers and archived coins", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "Lịch sử ví", exact: true }),
  ).toBeVisible();
  const records = page.getByRole("tabpanel").locator(".history-records");
  await expect(records).toContainText("Khoản thiếu");
  await expect(records).toContainText("Đã chuyển khoản");
  await expect(records).toContainText("Đang chờ rút tiền");
  await page.getByText("Trước khi gộp ví", { exact: true }).click();
  await expect(page.locator(".history-legacy")).toContainText("300 Xu");
  await page.getByRole("tab", { name: "Rút tiền", exact: true }).click();
  await expect(page).toHaveURL(/tab=withdrawals/);
  await expect(records).toContainText("Sai tài khoản");
  await page.getByRole("tab", { name: "Quà đã đổi", exact: true }).click();
  await expect(records).toContainText("SHOPEE-123");
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Quà đã đổi", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("each milestone upgrades its flame, and progress caps at thirty days", async ({
  page,
}) => {
  for (const [streak, flame, award] of [
    [0, "orange", 300],
    [2, "orange", 900],
    [3, "orange", 300],
    [6, "orange", 1800],
    [7, "red", 300],
    [13, "red", 3300],
    [14, "violet", 300],
    [29, "violet", 9300],
    [30, "gold", 300],
    [31, "gold", 300],
  ] as const) {
    await page.unroute("**/api/v1/**");
    await fixture(page, streak);
    await page.goto("/checkin");
    const checkin = page.getByRole("region", { name: "Điểm danh nhận Xu xanh" });
    await expect(checkin).toHaveAttribute("data-flame", flame);
    await expect(checkin.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      String(Math.min(streak, 30)),
    );
    await expect(
      checkin.getByRole("button", {
        name: `Điểm danh +${award.toLocaleString("vi-VN")} Xu`,
      }),
    ).toBeEnabled();
    await expect(
      checkin.locator(".checkin-milestones .is-reached"),
    ).toHaveCount([3, 7, 14, 30].filter((day) => streak >= day).length);
  }
});

test("check-in refreshes at Vietnam midnight and recovers from a failed command", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-06T16:59:30Z") });
  await fixture(page);
  let day = "2026-10-06";
  let posts = 0;
  await page.route("**/api/v1/checkins", async (route) => {
    if (route.request().method() === "POST") {
      posts++;
      if (posts === 1)
        await route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Thử lại" } },
        });
      else
        await route.fulfill({
          json: { data: { awardXu: 300, available: 50300, streak: 1, day } },
        });
    } else
      await route.fulfill({
        json: {
          data: {
            streak: day === "2026-10-06" ? 2 : 1,
            best: 2,
            today: day,
            lastDay:
              day === "2026-10-06"
                ? "2026-10-06"
                : posts === 2
                  ? day
                  : "2026-10-06",
            checkedIn: day === "2026-10-06" || posts === 2,
            days: [],
            available: 50000,
            unit: "xu",
          },
        },
      });
  });
  await page.goto("/checkin");
  const checkin = page.getByRole("region", { name: "Điểm danh nhận Xu xanh" });
  await expect(
    checkin.getByRole("button", { name: "Đã điểm danh", exact: true }),
  ).toBeDisabled();
  day = "2026-10-07";
  await page.clock.fastForward(31000);
  await expect(
    checkin.getByRole("button", { name: "Điểm danh +300 Xu" }),
  ).toBeEnabled();
  await checkin.getByRole("button", { name: "Điểm danh +300 Xu" }).click();
  await expect(checkin.getByRole("alert")).toContainText("Thử lại");
  await checkin.getByRole("button", { name: "Điểm danh +300 Xu" }).click();
  await expect(
    checkin.getByRole("button", { name: "Đã điểm danh", exact: true }),
  ).toBeDisabled();
  expect(posts).toBe(2);
});

test("history remembers each tab's page and handles keyboard, empty and error states", async ({
  page,
}) => {
  await fixture(page);
  let fail = true;
  await page.route("**/api/v1/wallet/transactions?**", async (route) => {
    if (fail)
      return route.fulfill({
        status: 503,
        json: { error: { code: "UNAVAILABLE", message: "Thử lại" } },
      });
    const index = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    const data =
      index === 1
        ? Array.from({ length: 20 }, (_, i) => ({
            id: `entry-${i}`,
            amount: 300,
            description: "Điểm danh",
            createdAt: "2026-10-06T02:00:00Z",
          }))
        : [
            {
              id: "last",
              amount: 600,
              description: "Thưởng mốc",
              createdAt: "2026-10-05T02:00:00Z",
            },
          ];
    await route.fulfill({ json: { data, meta: {hasNext:index===1,nextCursor:index===1?"history-page-2":null} } });
  });
  await page.goto("/history");
  await expect(page.getByRole("tabpanel").getByRole("alert")).toBeVisible();
  fail = false;
  await page
    .getByRole("tabpanel")
    .getByRole("button", { name: "Thử lại" })
    .click();
  await expect(
    page.getByRole("tabpanel").locator(".history-record"),
  ).toHaveCount(20);
  await page
    .getByRole("tabpanel")
    .getByRole("button", { name: "Tiếp →" })
    .click();
  await expect(page.getByRole("tabpanel")).toContainText("Thưởng mốc");
  await page.getByRole("tab", { name: "Giao dịch" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Rút tiền", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tabpanel")).toContainText("Trang 2");
  await expect(
    page.getByRole("tabpanel").getByRole("button", { name: "Tiếp →" }),
  ).toBeDisabled();
  await page.route("**/api/v1/gift-redemptions?**", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.getByRole("tab", { name: "Quà đã đổi", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Chưa có lịch sử");
});

test("dashboard and history fit light/dark layouts in Vietnamese and English", async ({
  page,
}) => {
  await fixture(page, 30);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/checkin");
  for (const width of [375, 610, 640, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole("progressbar",{name:"Tiến độ chuỗi điểm danh"})).toHaveAttribute(
      "aria-valuenow",
      "30",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.locator(".dashboard-checkin").screenshot({
      path: test.info().outputPath(`checkin-${width}-light.png`),
    });
  }
  await openSidebar(page);
  await page.getByRole("button", { name: "Đổi giao diện sáng tối" }).click();
  await closeSidebar(page);
  await switchLanguage(page, "EN");
  await expect(
    page.getByRole("region", { name: "Check in for green Xu" }),
  ).toBeVisible();
  await page
    .locator(".dashboard-checkin")
    .screenshot({ path: test.info().outputPath("checkin-dark-en.png") });
  await page.goto("/history");
  await expect(page.getByRole("tab", { name: "Transactions" })).toBeVisible();
  for (const width of [375, 610, 640, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    expect(
      await page.locator(".history-card").evaluate((card) => {
        const bounds = card.getBoundingClientRect();
        return [...card.querySelectorAll('[role="cell"]')].every((cell) => {
          const rect = cell.getBoundingClientRect();
          return rect.left >= bounds.left && rect.right <= bounds.right;
        });
      }),
    ).toBeTruthy();
    await page.locator(".history-screen").screenshot({
      path: test.info().outputPath(`history-${width}-dark.png`),
    });
  }
});

test("a broken streak resets progress but preserves the best streak", async ({
  page,
}) => {
  await fixture(page, 14, "2026-10-04");
  await page.goto("/checkin");
  const checkin = page.getByRole("region", { name: "Điểm danh nhận Xu xanh" });
  await expect(checkin.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await expect(checkin).toContainText("31");
  await expect(
    checkin.getByRole("button", { name: "Điểm danh +300 Xu" }),
  ).toBeEnabled();
});

test("withdrawal success links to the request in the central history", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      json: {
        data: {
          id: "customer",
          name: "An",
          role: "customer",
          csrfToken: "csrf",
          permissions: [],
          bankDetails: {
            bank: "ACB",
            account: "0012345678",
            holder: "NGUYEN VAN AN",
          },
        },
      },
    }),
  );
  await page.route("**/api/v1/withdrawals", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      bank: "ACB",
      account: "0012345678",
      holder: "NGUYEN VAN AN",
      amount: 50000,
    });
    await route.fulfill({
      json: { data: { id: "withdrawal", status: "pending" } },
    });
  });
  await page.goto("/wallet");
  await page.getByLabel("Số Xu vàng muốn rút", { exact: true }).fill("50000");
  await page.getByRole("button", { name: "Gửi yêu cầu rút tiền" }).click();
  await expect(
    page
      .locator(".history-success")
      .getByRole("link", { name: "Xem yêu cầu trong Lịch sử" }),
  ).toHaveAttribute("href", "/history?tab=withdrawals");
  await expect(
    page.getByRole("heading", { name: "Lịch sử rút tiền", exact: true }),
  ).toHaveCount(0);
});
