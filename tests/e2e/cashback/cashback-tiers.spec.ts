import { switchLanguage } from "../../helpers/sidebar";
import { test, expect, type Page } from "@playwright/test";

async function fixture(page: Page, role = "admin") {
  let policy = {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-10-05T00:00:00Z",
    taxPercent: 5,
    tiers: [
      {
        tierCode: "bronze",
        minApprovedOrders: 0,
        minSharePercent: 50,
        maxSharePercent: 55,
      },
      {
        tierCode: "platinum",
        minApprovedOrders: 30,
        minSharePercent: 60,
        maxSharePercent: 70,
      },
      {
        tierCode: "diamond",
        minApprovedOrders: 100,
        minSharePercent: 80,
        maxSharePercent: 90,
      },
    ],
  };
  const writes: any[] = [];
  let conflict = false;
  const membership = {
    policyId: policy.id,
    tierCode: "platinum",
    minApprovedOrders: 30,
    minSharePercent: 60,
    maxSharePercent: 70,
    approvedOrders: 31,
    nextTier: policy.tiers[2],
    ordersToNext: 69,
  };
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    let data: any = [];
    if (path.endsWith("/me"))
      data = {
        id: "user",
        name: "Tester",
        role,
        permissions: [],
        csrfToken: "csrf-tier",
        mustChangePassword: false,
        recentAuthentication: true,
      };
    if (path.endsWith("/config") || path.endsWith("/settings"))
      data = {
        brand: "Hoàn Xu",
        supportEmail: "",
        coinExchangeEnabled: false,
        faq: [],
      };
    if (path.endsWith("/cashback-policies/current")) data = policy;
    if (path.endsWith("/cashback-policies") && req.method() === "POST") {
      expect(req.headers()["x-csrf-token"]).toBe("csrf-tier");
      expect(req.headers()["idempotency-key"]).toBeTruthy();
      writes.push(req.postDataJSON());
      if (conflict) {
        policy={...policy,id:"22222222-2222-4222-8222-222222222222"};
        await route.fulfill({
          status: 409,
          json: {
            error: {
              code: "POLICY_VERSION_CONFLICT",
              message:
                "Chính sách đã thay đổi. Tải lại cấu hình trước khi lưu.",
            },
          },
        });
        return;
      }
      policy = {
        ...policy,
        id: "22222222-2222-4222-8222-222222222222",
        tiers: req.postDataJSON().tiers,
        taxPercent: req.postDataJSON().taxPercent,
      };
      data = policy;
    }
    if (path.endsWith("/me/dashboard"))
      data = {
        pending: 2222,
        approved: 0,
        approvedOrders: 31,
        available: 0,
        held: 0,
        debt: 0,
        coins: 0,
        membership,
      };
    if (path.endsWith("/affiliate-channels"))
      data = [{ id: "shopee", name: "Shopee", status: "available" }];
    if (path.endsWith("/affiliate-links"))
      data =
        req.method() === "POST"
          ? {
              id: "link",
              channel: "shopee",
              createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+7*24*60*60*1000).toISOString(), affiliateUrl: "https://s.shopee.vn/test",
              trackingCode: "fixture",
              tierCode: "bronze",
              minSharePercent: 22.22,
              maxSharePercent: 22.24,
            }
          : [
              {
                id: "link",
                channel: "shopee",
                originalUrl: "https://shopee.vn/product/1/2",
                createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+7*24*60*60*1000).toISOString(), affiliateUrl: "https://s.shopee.vn/test",
                trackingCode: "fixture",
                tierCode: "bronze",
                minSharePercent: 22.22,
                maxSharePercent: 22.24,
              },
            ];
    if (path.endsWith("/orders"))
      data = [
        {
          id: "order",
          productName: "Snapshot product",
          channel: "shopee",
          value: 100000,
          commission: 10001,
          cashback: 2222,
          status: "pending",
          sourceStatus: "approved",
          orderedAt: "2026-10-05T00:00:00Z",
          tierCode: "bronze",
          sharePercent: 22.22,
        },
      ];
    if (path.endsWith("/browser"))
      data = {
        browser: { browser: false, state: "not_started", savedCookies: false },
        enabled: false,
      };
    if(path.endsWith("/me/purchases")) data=[{
      id:"purchase",kind:"order",status:"progress",sortAt:"2026-10-05T00:00:00Z",
      link:{id:"link",channel:"shopee",affiliateUrl:"https://s.shopee.vn/test",trackingCode:"fixture",tierCode:"bronze",payoutFactor:"0.23",minSharePercent:22.22,maxSharePercent:22.24,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+6*86400000).toISOString(),status:"progress",canDelete:false,legacy:false},
      order:{id:"order",productName:"Snapshot product",value:100000,commission:10001,cashback:2222,status:"pending",sourceStatus:"approved",orderedAt:"2026-10-05T00:00:00Z",sharePercent:22.22,tierCode:"bronze"}
    }].filter(()=>new URL(req.url()).searchParams.get("status")==="progress");
    await route.fulfill({ json: { data, meta: { requestId: "fixture" } } });
  });
  return {
    writes,
    setConflict: () => {
      conflict = true;
    },
  };
}
test("admin always sees live tier ranges and saves a new version without a global share", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/admin/settings");
  await expect(page.getByLabel("Phần trăm thuế (%)", { exact: true })).toHaveValue("5");
  await expect(
    page.getByRole("heading", { name: "Chính sách chia hoa hồng theo hạng" }),
  ).toBeVisible();
  const bronze = page
    .locator("fieldset")
    .filter({ has: page.locator("legend", { hasText: "Đồng" }) });
  await expect(page.getByRole("region", { name: "Xem trước chính sách" })).toBeVisible();
  await expect(bronze.getByLabel("Số đơn đã duyệt tối thiểu")).toHaveAttribute(
    "readonly",
    "",
  );
  await bronze.getByLabel("Tỷ lệ tối thiểu (%)").fill("22");
  await bronze.getByLabel("Tỷ lệ tối đa (%)").fill("34");
  await expect(
    page.getByLabel("Chia hoa hồng cho khách (%)", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Xem trước chính sách", exact: true })).toHaveCount(0);
  expect(f.writes).toHaveLength(0);
  await expect(
    page.getByRole("region", { name: "Xem trước chính sách" }),
  ).toContainText("22–34%");
  await page
    .getByRole("button", { name: "Lưu chính sách mới", exact: true })
    .click();
  await expect.poll(() => f.writes.length).toBe(1);
  expect(f.writes[0]).toEqual({
    currentVersionId: "11111111-1111-4111-8111-111111111111",
    taxPercent: 5,
    tiers: [
      {
        tierCode: "bronze",
        minApprovedOrders: 0,
        minSharePercent: 22,
        maxSharePercent: 34,
      },
      {
        tierCode: "platinum",
        minApprovedOrders: 30,
        minSharePercent: 60,
        maxSharePercent: 70,
      },
      {
        tierCode: "diamond",
        minApprovedOrders: 100,
        minSharePercent: 80,
        maxSharePercent: 90,
      },
    ],
  });
  await expect(
    page.getByText(/22222222-2222-4222-8222-222222222222/),
  ).toBeVisible();
  await page.screenshot({path:test.info().outputPath("tiers-admin.png"),fullPage:true});
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("English policy conflict keeps the edit until explicitly reloaded", async ({
  page,
}) => {
  const f = await fixture(page);
  f.setConflict();
  await page.goto("/admin/settings");
  await switchLanguage(page, "EN");
  await expect(
    page.getByRole("heading", { name: "Cashback policy by tier" }),
  ).toBeVisible();
  const platinum = page
    .locator("fieldset")
    .filter({ has: page.locator("legend", { hasText: "Platinum" }) });
  await platinum.getByLabel("Minimum share (%)").fill("61");
  await expect(page.getByRole("button", { name: "Preview policy", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Preview policy" })).toBeVisible();
  await page
    .getByRole("button", { name: "Save new policy", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "The policy has changed." })
      .first(),
  ).toBeVisible();
  await expect(platinum.getByLabel("Minimum share (%)")).toHaveValue("61");
  await expect(
    page.getByRole("button", { name: "Reload policy", exact: true }),
  ).toBeVisible();
  await page.getByRole("button",{name:"Reload policy",exact:true}).click();
  await expect(platinum.getByLabel("Minimum share (%)")).toHaveValue("60");
});
test("customer tier comes from backend while old link and order keep their snapshot", async ({
  page,
}) => {
  await fixture(page, "customer");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Hạng.*Bạch kim/ }),
  ).toBeVisible();
  await expect(page.getByText(/69.*đơn để lên hạng.*Kim cương/)).toBeVisible();
  await switchLanguage(page, "EN");
  await expect(
    page.getByRole("heading", { name: /Tier.*Platinum/ }),
  ).toBeVisible();
  await page.goto("/link");
  await expect(page.getByRole("region", { name: "Purchase history" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(Save|Unsave)$/ })).toHaveCount(0);
  await page.goto("/orders");
  await page.getByRole("button",{name:"Processing",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Snapshot product"})).toBeVisible();
  await expect(page.locator(".purchase-order")).toContainText("2,222");
  await expect(page.getByRole("button",{name:"Delete link",exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:test.info().outputPath("tiers-orders.png"),fullPage:true});
  await page.goto("/link");
  await page
    .getByLabel("Shopee product link", { exact: true })
    .fill("https://shopee.vn/product/1/2");
  await page
    .getByRole("button", { name: "Get cashback link", exact: true })
    .click();
  await expect(page.locator(".composer-result")).toContainText("https://s.shopee.vn/test");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("tax configuration rejects narrow ranges and is absent from customer UI",async({page})=>{
 const f=await fixture(page);await page.goto('/admin/settings');
 const bronze=page.locator('fieldset').filter({has:page.locator('legend',{hasText:'Đồng'})});
 await bronze.getByLabel('Tỷ lệ tối đa (%)').fill('54');
 await page.getByRole('button',{name:'Lưu chính sách mới',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'ít nhất 5'})).toBeVisible();expect(f.writes).toHaveLength(0);
 await bronze.getByLabel('Tỷ lệ tối đa (%)').fill('55');
 await page.getByLabel('Phần trăm thuế (%)',{exact:true}).fill('5.55');
 await page.getByRole('button',{name:'Lưu chính sách mới',exact:true}).click();
 await expect.poll(()=>f.writes.length).toBe(1);expect(f.writes[0].taxPercent).toBe(5.55);
 await fixture(page,'customer');await page.goto('/link');
 await expect(page.getByLabel('Phần trăm thuế (%)',{exact:true})).toHaveCount(0);
 await expect(page.locator('main')).not.toContainText(/thuế|tax/i);
});
