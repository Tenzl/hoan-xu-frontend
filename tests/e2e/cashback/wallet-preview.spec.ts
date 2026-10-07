import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";
const url = "https://shopee.vn/product/100/200";
async function fixture(page: Page, options: { effective?: boolean; loggedOut?: boolean; commission?: number; verified?: boolean; errorWallet?: boolean; failWithdrawal?: boolean; available?: number; pending?: number; debt?: number } = {}) {
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
     data={available,pending:options.pending??20000,held,giftHeld:10500,debt:options.debt??0,totalOrders:12,pendingOrders:4,approvedOrders:8,membership:{tierCode:"bronze",minSharePercent:22.22,maxSharePercent:33.33,...(options.effective?{effectiveMinSharePercent:63,effectiveMaxSharePercent:71,previewAvailable:true}:{}),approvedOrders:8,nextTier:{tierCode:"platinum",minApprovedOrders:30,minSharePercent:60,maxSharePercent:70},ordersToNext:22}};
   }
   if(path.endsWith("/wallet")) {
     if(options.errorWallet)return route.fulfill({status:503,json:{error:{message:"Unavailable"}}});
     data={available,greenAvailable:100000,held,debt:options.debt??0,goldTotal:100000,goldUsed:10000};
   }
   if(path.endsWith("/affiliate-channels"))data=[{id:"shopee",name:"Shopee",status:"available"}];
   if(path.endsWith("/product-checks")) data={itemId:"200",shopId:"100",schemaVerified:options.verified!==false,commission:options.commission??55005,productName:"Tai nghe",price:100000};
   if(path.endsWith("/affiliate-links")&&req.method()==="POST")data={id:"link",createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+7*24*60*60*1000).toISOString(), affiliateUrl:"https://s.shopee.vn/example",trackingCode:"tracking",tierCode:"bronze",minSharePercent:50,maxSharePercent:50,...(options.effective?{minSharePercent:63,maxSharePercent:71,effectiveSharePercent:66,payoutFactor:"0.66"}:{})};
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

test("product estimates do not change wallet balances; a withdrawal reserves real gold",async({page})=>{
 const writes=await fixture(page);
 await page.goto("/link");await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);
 await expect(page.locator(".reward-amount strong")).toHaveText("12.223–18.334đ");
 await expect(page.locator(".link-wallet")).toHaveCount(1);
 await page.getByRole("button",{name:"Lấy link hoàn tiền",exact:true}).click();
 await expect(page.locator(".reward-amount strong")).toHaveText("27.503đ");
 await page.goto("/wallet");
 await expect(page.locator(".xu-gold>b .num")).toHaveText("70.000");
 await page.getByLabel("Số Xu vàng muốn rút",{exact:true}).fill("50000");
 await page.getByRole("button",{name:"Gửi yêu cầu rút tiền",exact:true}).click();
 await expect(page.locator(".xu-gold>b .num")).toHaveText("20.000");
 await expect(page.getByRole("button",{name:"Gửi yêu cầu rút tiền",exact:true})).toBeDisabled();
 await expect(page.locator(".wallet-breakdown>div").nth(2)).toContainText("51.000");
 expect(writes.filter(path=>path.endsWith("/withdrawals"))).toHaveLength(1);
 await switchLanguage(page,"EN");
 await expect(page.getByRole("heading",{name:"My wallet",exact:true})).toBeVisible();
});
for(const scenario of [
 {available:0,pending:0,debt:0,ready:false},
 {available:25000,pending:20000,debt:0,ready:false},
 {available:49999,pending:20000,debt:0,ready:false},
 {available:50000,pending:20000,debt:0,ready:true},
 {available:90000,pending:20000,debt:0,ready:true},
 {available:50000,pending:20000,debt:1000,ready:false},
 {available:0,pending:900000,debt:0,ready:false},
]) test(`available-only withdrawal eligibility ${scenario.available}/${scenario.pending}/${scenario.debt}`,async({page})=>{
 await fixture(page,scenario);await page.goto("/wallet");
 const progress=page.locator(".withdrawal-progress").getByRole("progressbar",{name:"Tiến độ đạt ngưỡng rút tiền",exact:true});
 await expect(progress).toHaveAttribute("aria-valuenow",String(Math.min(50000,scenario.available)));
 const button=page.getByRole("button",{name:"Gửi yêu cầu rút tiền",exact:true});
 if(scenario.ready)await expect(button).toBeEnabled();else await expect(button).toBeDisabled();
 await expect(page.locator(".xu-gold>b .num")).toHaveText(scenario.available.toLocaleString("vi-VN"));
 await expect(page.locator("main")).toContainText(scenario.pending.toLocaleString("vi-VN"));
});
test("wallet loading and failure cannot expose a usable withdrawal form",async({page})=>{
 await fixture(page,{errorWallet:true});await page.goto("/wallet");
 await expect(page.locator("main p.err[role=alert]").first()).toBeVisible();
 await expect(page.getByRole("button",{name:"Gửi yêu cầu rút tiền"})).toHaveCount(0);
 await expect(page.locator("main").getByRole("button",{name:"Thử lại"}).first()).toBeVisible();
});
test("withdrawal failure preserves input and never invents a successful request",async({page})=>{
 await fixture(page,{failWithdrawal:true});await page.goto("/wallet");
 const field=page.getByLabel("Số Xu vàng muốn rút",{exact:true});await field.fill("50000");
 await page.getByRole("button",{name:"Gửi yêu cầu rút tiền"}).click();
 await expect(page.locator("main p.err[role=alert]")).toContainText("Số dư không đủ.");
 await expect(field).toHaveValue("50000");await expect(page.locator(".history-success")).toHaveCount(0);
});
test("zero and unverified commission remain estimates, not earned gold",async({page})=>{
 await fixture(page,{commission:0});await page.goto("/link");
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);await expect(page.locator(".reward-amount strong")).toHaveText("0đ");
 await fixture(page,{verified:false});await page.reload();
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill(url);await expect(page.locator(".reward-amount strong")).toHaveCount(0);
 await expect(page.locator(".reward-product")).toContainText("Chưa xác nhận được thông tin món này. Bạn thử lại nhé.");
});
