import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";
const url = "https://shopee.vn/product/100/200";
async function fixture(page: Page, options: { loggedOut?: boolean; commission?: number; verified?: boolean; errorWallet?: boolean; failWithdrawal?: boolean } = {}) {
 const writes: string[] = []; let available=70000, held=1000;
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
     data={available,pending:20000,held,giftHeld:10500,debt:0,totalOrders:12,pendingOrders:4,approvedOrders:8,membership:{tierCode:"bronze",minSharePercent:22.22,maxSharePercent:33.33,nextTier:{tierCode:"platinum"},ordersToNext:22}};
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
 await expect(wallet.locator(".wallet-order-stats")).toContainText("12");
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);
 await expect(wallet.locator(".wallet-product-preview strong")).toHaveText("+12.222–18.333 Xu");
 await expect(wallet.locator(".wallet-preview-ring")).toHaveCount(1);await expect(wallet.locator("figcaption strong")).toHaveText("70.000");
 expect(writes).toEqual(["/api/v1/product-checks"]);
 await page.getByRole("button",{name:"Lấy link hoàn tiền",exact:true}).click();await expect(wallet.locator(".wallet-product-preview strong")).toHaveText("+27.502 Xu");
 await page.screenshot({path:test.info().outputPath("wallet-preview-vi.png"),fullPage:true});
 await wallet.getByRole("button",{name:"Rút tiền",exact:true}).click();const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();
 await expect(dialog.getByLabel("Số tài khoản",{exact:true})).toHaveValue("0123456789");
 await dialog.getByLabel("Họ tên đầy đủ hiển thị trên ngân hàng").fill("nguyen an");await expect(dialog.getByLabel("Họ tên đầy đủ hiển thị trên ngân hàng")).toHaveValue("NGUYEN AN");
 await dialog.getByLabel("Số Xu muốn rút").fill("50000");await dialog.getByRole("button",{name:"Gửi yêu cầu rút tiền"}).click();await expect(dialog).not.toBeVisible();
 await expect(wallet.locator("figcaption strong")).toHaveText("20.000");await expect(wallet.getByRole("button",{name:"Rút tiền",exact:true})).toBeDisabled();
 await page.getByRole("button",{name:"Xóa link sản phẩm"}).click();await expect(wallet.locator(".wallet-preview-ring")).toHaveCount(0);await expect(wallet.locator(".wallet-product-preview strong")).toHaveCount(0);
 await switchLanguage(page,"EN");await page.evaluate(()=>document.documentElement.dataset.theme="dark");await expect(page.getByRole("complementary",{name:"Xu wallet"})).toBeVisible();await expect(page.locator(".wallet-card")).toContainText("Pending approval");await expect(page.locator(".wallet-withdraw")).toHaveText("Withdraw");
 await page.emulateMedia({reducedMotion:"reduce"});await page.screenshot({path:test.info().outputPath("wallet-en-dark.png"),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 if(!isMobile){await page.setViewportSize({width:768,height:1024});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
});
test("zero commission is valid, missing schema gives no projected reward",async({page})=>{
 await fixture(page,{commission:0});await page.goto("/link");await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);await expect(page.locator(".wallet-product-preview strong")).toHaveText("+0 Xu");await expect(page.locator(".wallet-preview-ring")).toHaveCount(0);
});
test("unverified commission never appears as earned Xu",async({page})=>{
 await fixture(page,{verified:false});await page.goto("/link");await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);await expect(page.getByText("Thông tin hoa hồng tạm thời chưa sẵn sàng. Vui lòng thử lại sau.")).toBeVisible();await expect(page.locator(".wallet-product-preview strong")).toHaveCount(0);
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
 await input.fill("https://shopee.vn/product/100/201");await expect(page.locator(".wallet-product-preview strong")).toHaveText("+2.222–3.333 Xu");release();await expect(page.locator(".wallet-product-preview strong")).toHaveText("+2.222–3.333 Xu");await expect(page.locator("figcaption strong")).toHaveText("70.000");
});
