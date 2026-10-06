import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";
const url = "https://shopee.vn/product/100/200";
async function fixture(page: Page, options: { loggedOut?: boolean; commission?: number; verified?: boolean; errorWallet?: boolean; failWithdrawal?: boolean; available?: number; pending?: number; debt?: number } = {}) {
 const writes: string[] = []; let available=options.available??70000, held=1000;
 await page.route("**/api/v1/**",async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   if(req.method()!=="GET") writes.push(path);
   let data:any=[];
   if(path.endsWith("/me")) {
     if(options.loggedOut) return route.fulfill({status:401,json:{error:{message:"Login required"}}});
     data={id:"customer",role:"customer",name:"An",csrfToken:"csrf",permissions:[],bankDetails:{bank:"Vietcombank",account:"0123456789",holder:"NGUYEN AN"}};
   }
   if(path.endsWith("/config")) data={brand:"Hoàn Xu"};
   if(path.endsWith("/me/dashboard")) {
     if(options.errorWallet)return route.fulfill({status:503,json:{error:{message:"Unavailable"}}});
     data={available,pending:options.pending??20000,held,giftHeld:10500,debt:options.debt??0,totalOrders:12,pendingOrders:4,approvedOrders:8,membership:{tierCode:"bronze",minSharePercent:22.22,maxSharePercent:33.33,approvedOrders:8,nextTier:{tierCode:"platinum",minApprovedOrders:30,minSharePercent:60,maxSharePercent:70},ordersToNext:22}};
   }
   if(path.endsWith("/affiliate-channels"))data=[{id:"shopee",name:"Shopee",status:"available"}];
   if(path.endsWith("/product-checks")) data={itemId:"200",shopId:"100",schemaVerified:options.verified!==false,commission:options.commission??55005,productName:"Tai nghe",price:100000};
   if(path.endsWith("/affiliate-links")&&req.method()==="POST")data={id:"link",affiliateUrl:"https://s.shopee.vn/example",trackingCode:"tracking",tierCode:"bronze",minSharePercent:50,maxSharePercent:50};
   if(path.endsWith("/withdrawals")&&req.method()==="POST"){
     expect(req.headers()["idempotency-key"]).toBeTruthy();expect(req.headers()["x-csrf-token"]).toBe("csrf");
     expect(req.postDataJSON()).toEqual({bank:"Vietcombank",account:"0123456789",holder:"NGUYEN AN",amount:50000});
     if(options.failWithdrawal)return route.fulfill({status:409,json:{error:{code:"INSUFFICIENT_BALANCE",message:"Số dư không đủ."}}});
     available-=50000;held+=50000;data={id:"withdrawal",status:"pending"};
   }
   await route.fulfill({json:{data}});
 });
 return writes;
}
test("wallet and product preview stay separate; withdrawal updates real balances",async({page,isMobile})=>{
 const writes=await fixture(page);await page.setViewportSize(isMobile?{width:375,height:812}:{width:1440,height:960});await page.goto("/link");
 const wallet=page.getByRole("complementary",{name:"Ví Xu",exact:true});await expect(wallet.locator("figcaption strong")).toHaveText("70.000");
 await expect(wallet.getByRole("progressbar",{name:"Tiến độ đạt ngưỡng rút tiền"})).toHaveAttribute("aria-valuenow","50000");
 await expect(wallet.locator(".wallet-withdraw-progress")).toHaveClass(/wallet-available/);
 await expect(wallet.locator(".wallet-order-stats")).toContainText("12");
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);
 await expect(page.locator(".reward-product")).toContainText("Tai nghe");
 await expect(wallet.locator(".wallet-product-preview strong")).toHaveText("12.222–18.333đ");
 await expect(wallet.locator(".wallet-preview-ring")).toHaveCount(0);await expect(wallet.locator("figcaption strong")).toHaveText("70.000");
 expect(writes).toEqual(["/api/v1/product-checks"]);
 await page.getByRole("button",{name:"Lấy link hoàn tiền",exact:true}).click();await expect(wallet.locator(".wallet-product-preview strong")).toHaveText("27.502đ");
 await page.screenshot({path:test.info().outputPath("wallet-preview-vi.png"),fullPage:true});
 await wallet.getByRole("button",{name:"Rút tiền",exact:true}).click();const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();
 await expect(dialog.getByLabel("Số tài khoản",{exact:true})).toHaveValue("0123456789");
 await dialog.getByLabel("Họ tên đầy đủ hiển thị trên ngân hàng").fill("nguyen an");await expect(dialog.getByLabel("Họ tên đầy đủ hiển thị trên ngân hàng")).toHaveValue("NGUYEN AN");
 await dialog.getByLabel("Số Xu muốn rút").fill("50000");await dialog.getByRole("button",{name:"Gửi yêu cầu rút tiền"}).click();await expect(dialog).not.toBeVisible();
 await expect(wallet.locator("figcaption strong")).toHaveText("20.000");await expect(wallet.getByRole("button",{name:"Rút tiền",exact:true})).toBeDisabled();
 await expect(wallet.getByRole("progressbar",{name:"Tiến độ đạt ngưỡng rút tiền"})).toHaveAttribute("aria-valuenow","20000");
 await expect(wallet.locator(".wallet-withdraw-progress")).toHaveAttribute("stroke-dasharray","40 60");
 await expect(wallet.locator(".wallet-withdraw-progress")).toHaveClass(/wallet-pending/);
 await page.getByRole("button",{name:"Xóa link sản phẩm"}).click();await expect(wallet.locator(".wallet-preview-ring")).toHaveCount(0);await expect(wallet.locator(".wallet-product-preview strong")).toHaveCount(0);
 await switchLanguage(page,"EN");await page.evaluate(()=>document.documentElement.dataset.theme="dark");await expect(page.getByRole("complementary",{name:"Xu wallet"})).toBeVisible();await expect(page.locator(".wallet-card")).toContainText("Pending approval");await expect(page.locator(".wallet-withdraw")).toHaveText("Withdraw");
 await expect(page.getByRole("progressbar",{name:"Progress toward the withdrawal minimum"})).toBeVisible();
 await page.emulateMedia({reducedMotion:"reduce"});await page.screenshot({path:test.info().outputPath("wallet-en-dark.png"),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 if(!isMobile){await page.setViewportSize({width:768,height:1024});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
});

for (const scenario of [
 { available: 0, pending: 0, debt: 0, progress: 0, ready: false },
 { available: 25000, pending: 20000, debt: 0, progress: 50, ready: false },
 { available: 49999, pending: 20000, debt: 0, progress: 99.998, ready: false },
 { available: 50000, pending: 20000, debt: 0, progress: 100, ready: true },
 { available: 90000, pending: 20000, debt: 0, progress: 100, ready: true },
 { available: 50000, pending: 20000, debt: 1000, progress: 100, ready: false },
 { available: 0, pending: 900000, debt: 0, progress: 0, ready: false },
]) {
 test(`withdrawal progress: ${scenario.available} available, ${scenario.pending} pending, ${scenario.debt} debt`,async({page})=>{
  await fixture(page,scenario);await page.goto("/link");
  const progress=page.getByRole("progressbar",{name:"Tiến độ đạt ngưỡng rút tiền"});
  await expect(progress).toHaveAttribute("aria-valuemin","0");
  await expect(progress).toHaveAttribute("aria-valuemax","50000");
  await expect(progress).toHaveAttribute("aria-valuenow",String(Math.min(scenario.available,50000)));
  await expect(page.locator(".wallet-chart figcaption strong")).toHaveText(scenario.available.toLocaleString("vi-VN"));
  const arc=progress.locator(".wallet-withdraw-progress");
  if(scenario.progress===0) {
   await expect(arc).toHaveCount(0);
   await expect(progress.locator("circle")).toHaveCount(scenario.pending>0?2:1);
  } else {
   const segments=(await arc.getAttribute("stroke-dasharray"))!.split(" ").map(Number);
   expect(segments[0]).toBeCloseTo(scenario.progress,3);
   expect(segments[1]).toBeCloseTo(100-scenario.progress,3);
   const color=scenario.ready?"--jade-deep":"--xu";
   expect(await arc.evaluate((element,color)=>{
    const probe=document.createElement("span");probe.style.color=`var(${color})`;element.parentElement!.appendChild(probe);
    const expected=getComputedStyle(probe).color;probe.remove();return getComputedStyle(element).stroke===expected;
   },color)).toBeTruthy();
  }
  if(scenario.ready)await expect(page.locator(".wallet-withdraw")).toBeEnabled();
  else await expect(page.locator(".wallet-withdraw")).toBeDisabled();
  if(scenario.available===25000)await page.locator(".wallet-card").screenshot({path:test.info().outputPath("withdrawal-halfway.png")});
  if(scenario.available===0&&scenario.pending>0){
   await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);
   await expect(page.locator(".wallet-preview-ring")).toHaveCount(0);
   await expect(page.locator(".wallet-awaiting-progress")).toHaveAttribute("stroke-dasharray","100 0");
   await expect(arc).toHaveCount(0);
   await expect(progress).toHaveAttribute("aria-valuenow","0");
  }
 });
}

test("wallet loading does not show a withdrawal ring before balances arrive",async({page})=>{
 await fixture(page);
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route("**/api/v1/me/dashboard",async route=>{
  await gate;await route.fallback();
 });
 try {
  await page.goto("/link");await expect(page.getByRole("status",{name:"Đang tải ví…"})).toBeVisible();
  await expect(page.locator(".wallet-chart")).toHaveCount(0);
 } finally { release(); }
 await expect(page.getByRole("progressbar",{name:"Tiến độ đạt ngưỡng rút tiền"})).toBeVisible();
});
test("zero commission shows zero cashback",async({page})=>{
 await fixture(page,{commission:0});await page.goto("/link");await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);await expect(page.locator(".wallet-product-preview strong")).toHaveText("0đ");await expect(page.locator(".wallet-preview-ring")).toHaveCount(0);
});

test("product estimate extends available progress without increasing withdrawable funds",async({page})=>{
 await fixture(page,{available:25000,pending:5000});await page.goto("/link");
 const wallet=page.locator(".wallet-card");
 await expect(wallet.locator(".wallet-preview-ring")).toHaveCount(0);
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);
 const projection=wallet.locator(".wallet-preview-ring");
 await expect(projection).toHaveCount(1);
 await expect(wallet.locator(".wallet-awaiting-progress")).toHaveAttribute("stroke-dashoffset","-50");
 await expect(wallet.locator(".wallet-awaiting-progress")).toHaveAttribute("stroke-dasharray","10 90");
 await expect(projection.locator(".wallet-preview-min")).toHaveAttribute("stroke-dashoffset","-60");
 const segments=(await projection.locator(".wallet-preview-min").getAttribute("stroke-dasharray"))!.split(" ").map(Number);
 expect(segments[0]).toBeCloseTo(24.444,3);
 const maximum=(await projection.locator(".wallet-preview-max").getAttribute("stroke-dasharray"))!.split(" ").map(Number);
 expect(maximum[0]).toBeCloseTo(12.222,3);
 await expect(wallet.locator("figcaption strong")).toHaveText("25.000");
 await expect(wallet.getByRole("progressbar",{name:"Tiến độ đạt ngưỡng rút tiền"})).toHaveAttribute("aria-valuenow","25000");
 await expect(wallet.locator(".wallet-withdraw")).toBeDisabled();
 await wallet.screenshot({path:test.info().outputPath("wallet-projected-progress.png")});
 await page.getByRole("button",{name:"Xóa link sản phẩm"}).click();
 await expect(projection).toHaveCount(0);
});

test("projected progress stops at the withdrawal threshold and never enables withdrawal",async({page})=>{
 await fixture(page,{available:49000,pending:0});await page.goto("/link");
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);
 const projection=page.locator(".wallet-preview-ring");
 await expect(projection.locator(".wallet-preview-min")).toHaveAttribute("stroke-dashoffset","-98");
 const segments=(await projection.locator(".wallet-preview-min").getAttribute("stroke-dasharray"))!.split(" ").map(Number);
 expect(segments[0]).toBeCloseTo(2,3);
 await expect(projection.locator(".wallet-preview-max")).toHaveCount(0);
 await expect(page.locator(".wallet-withdraw")).toBeDisabled();
 await expect(page.locator(".wallet-withdraw-progress")).toHaveClass(/wallet-pending/);
});

test("wallet ring shows projected details on hover, touch and keyboard",async({page,isMobile})=>{
 await fixture(page,{available:25000,pending:5000});await page.goto("/link");
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);
 await expect(page.locator(".wallet-product-preview strong")).toHaveText("12.222–18.333đ");
 const button=page.getByRole("button",{name:"Xem chi tiết tiến độ rút tiền"});
 const panel=page.locator(".wallet-progress-detail");
 await expect(panel).not.toBeVisible();
 if(isMobile)await button.tap();else await button.hover();
 await expect(panel).toBeVisible();
 await expect(panel).toContainText("5.000 Xu");
 await expect(panel).toContainText("42.222–48.333đ");
 await expect(panel).toContainText("Phần dự kiến chưa thể rút.");
 await panel.screenshot({path:test.info().outputPath("wallet-progress-details.png")});
 await page.keyboard.press("Escape");await expect(panel).not.toBeVisible();
 await button.evaluate(element=>(element as HTMLButtonElement).blur());
 await button.focus();await expect(panel).toBeVisible();
 await page.keyboard.press("Escape");await expect(panel).not.toBeVisible();
 if(isMobile){await button.tap();await expect(panel).toBeVisible();await page.locator(".wallet-card h2").tap();await expect(panel).not.toBeVisible();}
 await page.emulateMedia({reducedMotion:"reduce"});
 await expect(page.locator(".wallet-preview-min")).toHaveCSS("animation-name","none");
 await expect(page.locator(".wallet-withdraw")).toBeDisabled();
});
test("unverified commission never appears as earned Xu",async({page})=>{
 await fixture(page,{verified:false});await page.goto("/link");await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);await expect(page.getByText("Chưa xác nhận được thông tin món này. Bạn thử lại nhé.")).toBeVisible();await expect(page.locator(".wallet-product-preview strong")).toHaveCount(0);await expect(page.locator(".wallet-preview-ring")).toHaveCount(0);
});
test("withdrawal error preserves input; Escape restores trigger focus",async({page})=>{
 await fixture(page,{failWithdrawal:true});await page.goto("/link");const trigger=page.locator(".wallet-withdraw");await trigger.click();const dialog=page.getByRole("dialog");await dialog.getByLabel("Số Xu muốn rút").fill("50000");await dialog.getByRole("button",{name:"Gửi yêu cầu rút tiền"}).click();await expect(dialog.getByRole("alert")).toContainText("Số dư không đủ.");await expect(dialog.getByLabel("Số Xu muốn rút")).toHaveValue("50000");await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
});
test("logged out and API failure do not invent wallet balances",async({page})=>{
 await fixture(page,{loggedOut:true});await page.goto("/link");await expect(page.locator(".wallet-login")).toContainText("Đăng nhập Google");await expect(page.locator(".wallet-chart")).toHaveCount(0);
});
test("wallet failure has retry and no chart",async({page})=>{
 await fixture(page,{errorWallet:true});await page.goto("/link");await expect(page.locator(".wallet-card")).toContainText("Chưa tải được ví của bạn.");await expect(page.locator(".wallet-card").getByRole("button",{name:"Thử lại"})).toBeVisible();await expect(page.locator(".wallet-chart")).toHaveCount(0);
});

test("a delayed product cannot leave a stale wallet projection",async({page})=>{
 await fixture(page);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route("**/api/v1/product-checks",async route=>{
  const old=route.request().postDataJSON().url.endsWith("/200");
  if(old)await gate;
  await route.fulfill({json:{data:{schemaVerified:true,itemId:old?"200":"201",shopId:"100",commission:old?90000:10000}}}).catch(()=>{});
 });
 await page.goto("/link");const input=page.getByLabel("Link sản phẩm Shopee",{exact:true});await input.fill(url);await page.waitForRequest(r=>r.url().endsWith("/product-checks"));
 await input.fill("https://shopee.vn/product/100/201");await expect(page.locator(".wallet-product-preview strong")).toHaveText("2.222–3.333đ");release();await expect(page.locator(".wallet-product-preview strong")).toHaveText("2.222–3.333đ");await expect(page.locator("figcaption strong")).toHaveText("70.000");
});
