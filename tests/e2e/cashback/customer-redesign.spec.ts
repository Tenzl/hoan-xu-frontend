import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

async function setup(page: Page, guest = false) {
  const calls: { path: string; body: unknown }[] = [];
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace("/api/v1", "");
    if (request.method() === "POST") calls.push({ path, body: request.postDataJSON() });
    let data: any = [];
    if (path === "/me") data = guest ? null : { id: "redesign-user", name: "Nguyễn Minh Anh", role: "customer", csrfToken: "csrf", bankDetails: {} };
    if (path === "/config") data = { brand: "Hoàn Xu", googleConfigured: true, faq: [], supportEmail: "support@example.com" };
    if (path === "/me/dashboard") data = { available: 30000, pending: 25000, held: 10000, debt: 0, goldTotal:60000, goldUsed:20000, totalOrders: 2, pendingOrders:1, approvedOrders: 1, membership:{tierCode:"member",nameVi:"Thân thiết",nameEn:"Member",minGoldTotal:0,minSharePercent:50,maxSharePercent:60,periodGoldTotal:60000,nextTier:null} };
    if (path === "/wallet") data = { available: 30000, greenAvailable: 1200, pending: 25000, held: 10000, debt: 0, goldTotal:60000,goldUsed:20000 };
    if (path === "/affiliate-channels") data = [{ id: "shopee", name: "Shopee", status: "available" }, { id: "lazada", name: "Lazada", status: "not_configured" }];
    if (path === "/product-checks") data = { schemaVerified: true, productName: "Túi đi chợ", price: 100000, commissionRate: 10, estimatedCommission: 10000 };
    if (path === "/leaderboard-prizes/current") data = null;
    if (path === "/checkins") data = { streak: 2, checkedIn: false, today: "2026-10-07", lastDay: "2026-10-06" };
    if (path === "/leaderboards") data = { period: url.searchParams.get("period") || "week", startsAt:null, endsAt:null, asOf: new Date().toISOString(), participants:0, items: [] };
    if (path === "/me/leaderboard") data = { period: url.searchParams.get("period") || "week", rank:null, xu:0, orders:0, target:null, xuToNext:null, lead:null };
    await route.fulfill({ json: { data, meta: { hasNext: false } } });
  });
  return calls;
}

test("customer navigation prioritizes purchase and wallet, while overview survives empty data", async ({ page, isMobile }) => {
  await setup(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dán link sản phẩm, nhận link hoàn tiền" })).toBeVisible();
  await expect(page.locator(".overview-balances")).toHaveCount(0);
  await expect(page.locator(".wallet-legend").getByText("Tổng Xu vàng", { exact: true })).toHaveCount(0);
  if (isMobile) {
    const nav = page.getByRole("navigation", { name: "Điều hướng nhanh" });
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.getByRole("link", { name: "Đơn hàng" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Ví của tôi" })).toBeVisible();
  }
  await expect(page.locator(".affiliate-channel.is-unavailable")).toContainText("Chưa mở");
  await page.screenshot({ path: test.info().outputPath("overview-redesign.png"), fullPage: true });
});

test("app share extracts one URL and ambiguity prevents network requests", async ({ page }) => {
  const calls = await setup(page);
  await page.goto("/link");
  const field = page.getByLabel("Link sản phẩm Shopee", { exact: true });
  await field.fill("Xem món này https://vn.shp.ee/C1Q8E6JS 😍");
  await expect(field).toHaveValue("https://vn.shp.ee/C1Q8E6JS");
  await expect(page.getByText("Túi đi chợ", { exact: true })).toBeVisible();
  expect(calls.filter(c => c.path === "/product-checks")[0].body).toEqual({ url: "https://vn.shp.ee/C1Q8E6JS" });
  await field.fill("https://vn.shp.ee/a https://vn.shp.ee/b");
  await expect(page.getByRole("alert").filter({ hasText: "nhiều link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true })).toBeDisabled();
});

test("customer login shows both password and Google options", async ({ page }) => {
  await setup(page, true);
  await page.goto("/login?error=google");
  await expect(page.getByRole("link", { name: "Tiếp tục với Google" })).toBeVisible();
  await expect(page.getByLabel("Tài khoản", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Google" })).toBeVisible();
  await page.goto("/internal/login");
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("orders default to pending approval without all, discovery and check-in explain rewards", async ({ page }) => {
  await setup(page);
  await page.goto("/orders");
  await expect(page.locator(".purchase-update-note")).toHaveText("Đơn hàng được cập nhật lúc 10:00 hằng ngày (giờ Việt Nam).");
  await expect(page.getByRole("button", { name: "Tất cả", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Chờ duyệt", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("complementary", { name: "Ví của tôi" })).toHaveCount(1);
  await page.goto("/discover");
  await expect(page.getByRole("link", { name: /Điểm danh nhận Xu xanh/ })).toBeVisible();
  await page.goto("/checkin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Điểm danh nhận Xu xanh");
  await expect(page.getByRole("button", { name: /Điểm danh.*Xu xanh/ })).toBeVisible();
});

test("wallet communicates separate currencies and pending never unlocks withdrawal", async ({ page }) => {
  await setup(page);
  await page.goto("/wallet");
  await expect(page.getByRole("heading", { name: "Có thể rút", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dùng đổi quà", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi yêu cầu rút tiền" })).toBeDisabled();
  const edges = await page.locator(".wallet-breakdown dd").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().right));
  expect(edges).toHaveLength(4);
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(1);
  await page.getByRole("button", { name: "Xu xanh", exact: true }).first().click();
  await expect(page.getByRole("tooltip")).toContainText("không thể rút tiền");
  const tooltip = await page.getByRole("tooltip").boundingBox();
  expect(tooltip!.x).toBeGreaterThanOrEqual(0);
  expect(tooltip!.x + tooltip!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: test.info().outputPath("wallet-redesign.png"), fullPage: true });
});

test("dashboard failure leaves link creation visible and unknown pages offer useful exits", async ({page}) => {
  await setup(page);
  await page.route("**/api/v1/me/dashboard",route=>route.fulfill({status:503,json:{error:{message:"Không tải được tổng quan"}}}));
  await page.goto("/");
  await expect(page.getByLabel("Link sản phẩm Shopee",{exact:true})).toBeVisible();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.goto("/unknown-customer-screen");
  await expect(page.locator("main").getByRole("link",{name:"Về tổng quan",exact:true})).toBeVisible();
  await expect(page.locator("main").getByRole("link",{name:"Lấy link hoàn tiền",exact:true})).toBeVisible();
  await expect(page.locator("main .xu-balances, main .login-wrap")).toHaveCount(0);
});

test("Google restores only the tab URL and does not automatically create a link", async ({page}) => {
  const calls=await setup(page,true);
  const source="https://vn.shp.ee/saved-draft";
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(source);
  await page.locator(".composer-login").getByRole("link").click();
  expect(await page.evaluate(()=>sessionStorage.getItem("hoanxu.login-product-draft"))).toBe(source);
  await page.route("**/api/v1/auth/google", async route=>{
    await page.route("**/api/v1/me",r=>r.fulfill({json:{data:{id:"signed-in",name:"An",role:"customer",csrfToken:"csrf"}}}));
    await route.fulfill({status:302,headers:{location:"/link"}});
  });
  await page.getByRole("link",{name:"Tiếp tục với Google",exact:true}).click();
  await expect(page.getByLabel("Link sản phẩm Shopee",{exact:true})).toHaveValue(source);
  await expect(page.locator(".composer-result")).toHaveCount(0);
  expect(calls.filter(c=>c.path==="/affiliate-links")).toHaveLength(0);
  expect(await page.evaluate(()=>sessionStorage.getItem("hoanxu.login-product-draft"))).toBeNull();
  await page.reload();
  await expect(page.getByLabel("Link sản phẩm Shopee",{exact:true})).toHaveValue("");
});

test("community uses one helpful toggle and remembers its state after reloading",async({page})=>{
  await setup(page);
  let liked=true;
  const methods:string[]=[];
  await page.route("**/api/v1/deals**",async route=>{
    const method=route.request().method();
    if(method!=="GET"){methods.push(method);liked=method==="PUT";return route.fulfill({json:{data:{liked}}});}
    await route.fulfill({json:{data:[{id:"offer",name:"An",channel:"Shopee",body:"Ưu đãi túi đi chợ",likes:liked?1:0,liked,createdAt:new Date().toISOString()}]}});
  });
  await page.goto("/deal");
  const helpful=page.getByRole("button",{name:/Hữu ích/});
  await expect(helpful).toHaveAttribute("aria-pressed","true");
  await expect(page.getByLabel("Nội dung",{exact:true})).not.toBeVisible();
  await helpful.click();await expect(helpful).toHaveAttribute("aria-pressed","false");
  await page.reload();await expect(helpful).toHaveAttribute("aria-pressed","false");
  await helpful.click();await expect(helpful).toHaveAttribute("aria-pressed","true");
  expect(methods).toEqual(["DELETE","PUT"]);
});

test("customer screen matrix fits mobile tablet and desktop in VI EN light dark",async({page,isMobile})=>{
  test.setTimeout(120000);
  await setup(page);
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:"reduce"});
  for(const variant of [{width:isMobile?320:1280,lang:"VI",theme:"light"},{width:isMobile?390:768,lang:"EN",theme:"dark"}]){
    await page.setViewportSize({width:variant.width,height:900});
    await page.goto("/");await switchLanguage(page,variant.lang as "VI"|"EN");
    await page.evaluate(theme=>localStorage.setItem("hoanxu.theme",theme),variant.theme);
    for(const path of ["/","/link","/orders","/wallet","/history","/checkin","/gift","/deal","/top","/discover","/help","/account"]){
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      const ready:Record<string,string>={"/":"#overview-product-url","/link":"#cashback-product-url","/orders":".purchases-tabs","/wallet":".xu-balances","/history":".history-card","/checkin":".dashboard-checkin .checkin-body","/gift":".gift-catalog","/deal":"main details","/top":".top-toolbar","/discover":".discover-grid","/help":".shopping-steps","/account":".account-screen"};
      await expect(page.locator(ready[path]).first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme",variant.theme);
      await expect(page.locator("main")).not.toContainText(/Đang tải dữ liệu…|Loading data…/);
      if(variant.lang==="EN") await expect.poll(async()=>(await page.locator("main").innerText()).replaceAll("Hoàn Xu","").replaceAll("Nguyễn Minh Anh","")).not.toMatch(/[À-ỹĐđ]/u);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBeTruthy();
      await page.screenshot({path:test.info().outputPath(`${path.replaceAll("/","")||"overview"}-${variant.width}-${variant.lang}-${variant.theme}.png`),fullPage:true});
    }
  }
  expect(errors).toEqual([]);
});

test("small screen protected ticket and controls fit with accessible dark theme", async ({ page }) => {
  await setup(page, true);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dán link sản phẩm, nhận link hoàn tiền" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const button = await page.getByRole("button", { name: "Lấy link hoàn tiền", exact: true }).boundingBox();
  expect(button!.width).toBeGreaterThan(200);
  await page.screenshot({ path: test.info().outputPath("overview-320.png"), fullPage: true });
});
