import { switchLanguage } from "../../helpers/sidebar";
import { test, expect, type Page } from "@playwright/test";

const defaultTiers=[
 {tierCode:"member",nameVi:"Thân thiết",nameEn:"Member",minGoldTotal:0,exchangeBonusPercent:3,minSharePercent:50,maxSharePercent:55},
 {tierCode:"silver",nameVi:"Bạc",nameEn:"Silver",minGoldTotal:500000,exchangeBonusPercent:6,minSharePercent:50,maxSharePercent:55},
 {tierCode:"gold",nameVi:"Vàng",nameEn:"Gold",minGoldTotal:1500000,exchangeBonusPercent:10,minSharePercent:60,maxSharePercent:70},
 {tierCode:"diamond",nameVi:"Kim cương",nameEn:"Diamond",minGoldTotal:3000000,exchangeBonusPercent:15,minSharePercent:80,maxSharePercent:90},
];
async function fixture(page: Page, role = "admin") {
  let policy = {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-10-05T00:00:00Z",
    taxPercent: 5,
    periodMonths:6,anchorDate:"2026-01-01",dateBasis:"approved",
    tiers:defaultTiers.map(t=>({...t})),
  };
  const writes: any[] = [];
  let conflict = false;
  const membership = {
    ...policy.tiers[2],policyId:policy.id,approvedOrders:31,nextTier:policy.tiers[3],periodGoldTotal:1500000,previousPeriodGoldTotal:0,goldToNext:1500000,goldToMaintain:0,periodStartsAt:"2026-07-01T00:00:00+07:00",periodEndsAt:"2027-01-01T00:00:00+07:00",startingTierCode:"member",nextPeriodTierCode:"gold",nextPeriodNameVi:"Vàng",nextPeriodNameEn:"Gold",
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
  await page.getByRole("button", {name:"Chính sách hoàn Xu",exact:true}).click();
  await expect(page.getByLabel("Phần trăm thuế (%)", { exact: true })).toHaveValue("5");
  await expect(
    page.getByRole("heading", { name: "Chính sách hạng theo kỳ" }),
  ).toBeVisible();
  const bronze = page
    .locator("fieldset")
    .filter({ has: page.locator("legend", { hasText: "Thân thiết" }) });
  await expect(page.getByRole("region", { name: "Xem trước chính sách" })).toBeVisible();
  await expect(bronze.getByLabel("Hoàn vàng tối thiểu trong kỳ")).toHaveAttribute(
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
  expect(f.writes[0]).toEqual({currentVersionId:"11111111-1111-4111-8111-111111111111",taxPercent:5,periodMonths:6,anchorDate:"2026-01-01",dateBasis:"approved",tiers:defaultTiers.map((t,i)=>i===0?{...t,minSharePercent:22,maxSharePercent:34}:t)});

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
  await page.getByRole("button", {name:"Chính sách hoàn Xu",exact:true}).click();
  await switchLanguage(page, "EN");
  await expect(
    page.getByRole("heading", { name: "Membership policy by period" }),
  ).toBeVisible();
  const platinum = page
    .locator("fieldset")
    .filter({ has: page.locator("legend", { hasText: "Gold" }) });
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
    page.locator(".overview-membership .benefits-current").filter({hasText:"Vàng"}),
  ).toBeVisible();
  await expect(page.locator(".overview-membership").getByRole("progressbar",{name:"Tiến độ lên hạng",exact:true})).toHaveAttribute("value","1500000");
  await switchLanguage(page, "EN");
  await expect(
    page.locator(".overview-membership .benefits-current").filter({hasText:"Gold"}),
  ).toBeVisible();
  await page.goto("/link");
  await expect(page.getByRole("region", { name: "Purchase history" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(Save|Unsave)$/ })).toHaveCount(0);
  await page.goto("/orders");
  await page.getByRole("link",{name:"Pending approval",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Snapshot product"})).toBeVisible();
  const order = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Snapshot product", exact: true }) });
  await expect(order.locator(".purchase-cashback dd")).toHaveText("2,222");
  await expect(page.getByRole("button",{name:"Delete link",exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:test.info().outputPath("tiers-orders.png"),fullPage:true});
  await page.goto("/link");
  await page
    .getByLabel("Shopee product link", { exact: true })
    .fill("https://shopee.vn/product/1/2");
  await page
    .getByRole("button", { name: "Get cashback link", exact: true })
    .click();
  await expect(page.locator(".composer-result")).toContainText(`${new URL(page.url()).origin}/shopee/test`);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("tax configuration rejects narrow ranges and is absent from customer UI",async({page})=>{
 const f=await fixture(page);await page.goto('/admin/settings');await page.getByRole('button',{name:'Chính sách hoàn Xu',exact:true}).click();
 const bronze=page.locator('fieldset').filter({has:page.locator('legend',{hasText:'Thân thiết'})});
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


test("admin edits tier names, gold thresholds, bonuses and calendar in one version", async ({page})=>{
 const f=await fixture(page);await page.goto('/admin/settings');await page.getByRole('button',{name:'Chính sách hoàn Xu',exact:true}).click();
 const silver=page.locator('fieldset').filter({has:page.locator('legend',{hasText:'Bạc'})});
 await silver.getByLabel('Tên hạng (Việt)').fill('Bạc mới');
 await silver.getByLabel('Tên hạng (Anh)').fill('New silver');
 await silver.getByLabel('Hoàn vàng tối thiểu trong kỳ').fill('700000');
 await silver.getByLabel('Thưởng đổi Xu (%)').fill('21');
 await page.getByLabel('Độ dài chu kỳ (tháng)').fill('1');
 await page.getByLabel('Ngày mốc bắt đầu').fill('2026-01-31');
 await page.getByLabel('Ngày dùng để tính kỳ').selectOption('ordered');
 await expect(page.getByRole('region',{name:'Xem trước chính sách'})).toContainText('Bạc mới: 700.000 Xu');
 await page.getByRole('button',{name:'Lưu chính sách mới',exact:true}).click();
 await expect.poll(()=>f.writes.length).toBe(1);
 expect(f.writes[0]).toMatchObject({periodMonths:1,anchorDate:'2026-01-31',dateBasis:'ordered'});
 expect(f.writes[0].tiers[1]).toMatchObject({nameVi:'Bạc mới',nameEn:'New silver',minGoldTotal:700000,exchangeBonusPercent:21});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test("highest tier still displays retention and next period downgrade",async({page})=>{
 await fixture(page,'customer');
 await page.route('**/api/v1/me/dashboard',route=>route.fulfill({json:{data:{available:123,membership:{...defaultTiers[3],periodGoldTotal:600000,previousPeriodGoldTotal:3000000,startingTierCode:'diamond',nextTier:null,goldToMaintain:2400000,nextPeriodTierCode:'silver',nextPeriodNameVi:'Bạc',nextPeriodNameEn:'Silver'}}}}));
 await page.goto('/');
 await expect(page.getByText('Bạn đang ở hạng cao nhất').first()).toBeVisible();
 await expect(page.getByText(/2\.400\.000.*Xu vàng để giữ hạng kỳ sau/).first()).toBeVisible();
 await expect(page.getByText(/Hạng dự kiến kỳ sau.*Bạc/).first()).toBeVisible();
 await expect(page.getByRole('progressbar',{name:'Tiến độ giữ hạng'}).first()).toHaveAttribute('max','3000000');
});

test("period boundary refetches membership without a page reload",async({page})=>{
 await page.clock.install({time:new Date('2026-12-31T16:59:00Z')});
 await fixture(page,'customer');let reads=0;let nextPeriod=false;
 await page.route('**/api/v1/me/dashboard',async route=>{
  reads++;const next=nextPeriod;
  return route.fulfill({json:{data:{available:123,membership:{...defaultTiers[next?1:3],periodGoldTotal:0,previousPeriodGoldTotal:next?600000:3000000,goldToMaintain:next?500000:3000000,nextTier:next?defaultTiers[2]:null,nextPeriodTierCode:'member',nextPeriodNameVi:'Thân thiết',nextPeriodNameEn:'Member',periodStartsAt:next?'2027-01-01T00:00:00+07:00':'2026-07-01T00:00:00+07:00',periodEndsAt:next?'2027-07-01T00:00:00+07:00':'2027-01-01T00:00:00+07:00'}}}});
 });
 await page.goto('/');await expect(page.getByText('Bạn đang ở hạng cao nhất').first()).toBeVisible();
 const before=reads;nextPeriod=true;await page.clock.fastForward(61000);
 await expect.poll(()=>reads).toBeGreaterThan(before);
 await expect(page.locator('.overview-membership .benefits-current')).toContainText('Bạc');
});


test("approved orders expose details without adjustment or approval controls",async({page})=>{
 await fixture(page);
 await page.route('**/api/v1/admin/orders?*',route=>route.fulfill({json:{data:[{id:'locked',productName:'Approved order',name:'Customer',channel:'shopee',publisher:'shopee',externalId:'old',lineId:'1',value:100000,commission:1000,cashback:500,status:'approved',sourceStatus:'approved',tierCode:'bronze'}],meta:{pagination:{page:1,perPage:20,total:1,totalPages:1}}}}));
 await page.goto('/admin/orders');
 await expect(page.getByRole('row').filter({hasText:'Approved order'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Chi tiết',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/Điều chỉnh|^Duyệt$|^Hủy$/})).toHaveCount(0);
});
