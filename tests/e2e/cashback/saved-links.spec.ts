import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

async function fixture(page:Page){
 const now=Date.now();
 let links=[
  {id:"active",productName:"Tai nghe Bluetooth",autoDeleteAt:new Date(now+5*86400000).toISOString()},
  {id:"short",productName:"Bàn phím cơ",autoDeleteAt:new Date(now+2*3600000).toISOString()},
  {id:"reported",productName:"Sản phẩm đã có đơn",autoDeleteAt:new Date(now+86400000).toISOString()},
  {id:"legacy",productName:null,autoDeleteAt:null},
 ].map(l=>({...l,status:l.id==="legacy"?"legacy":"active",canDelete:l.id!=="legacy",legacy:l.id==="legacy",createdAt:new Date(now).toISOString(),expiresAt:l.autoDeleteAt,affiliateUrl:`https://s.shopee.vn/${l.id}`,trackingCode:l.id}));
 const deleted:string[]=[];
 await page.route("**/api/v1/**",async route=>{
  const r=route.request(),url=new URL(r.url()),path=url.pathname;let data:unknown=[];
  if(path.endsWith("/me"))data={id:"customer",name:"An",role:"customer",csrfToken:"csrf"};
  if(path.endsWith("/config"))data={brand:"Hoàn Xu"};
  if(path.endsWith("/product-checks"))data={schemaVerified:true,shopId:"1",itemId:"2",productName:"Tai nghe Bluetooth",commission:10000,price:100000};
  if(path.endsWith("/affiliate-links"))data=r.method()==="POST"?links.find(l=>l.id==="active"):links;
  if(path.endsWith("/affiliate-links/active"))data=links.find(l=>l.id==="active");
  if(path.endsWith("/orders")){const status=url.searchParams.get("status");data=[{id:status,externalId:`ORDER-${status}`,status,productName:"Sản phẩm đã có đơn",value:100000,cashback:6000,orderedAt:new Date(now).toISOString()}];}
  if(r.method()==="DELETE"){expect(r.headers()["x-csrf-token"]).toBe("csrf");const id=path.split("/").pop()!;deleted.push(id);links=links.filter(l=>l.id!==id);await route.fulfill({status:204});return;}
  await route.fulfill({json:{data,meta:{hasNext:false}}});
 });
 return deleted;
}

test("saved links include products with reports and use the body font",async({page})=>{
 await fixture(page);await page.goto("/saved-links");
 const row=page.locator('[data-link-id="active"]');
 await expect(row).toContainText("Tai nghe Bluetooth");await expect(row).toContainText("5 ngày");
 await expect(page.locator('[data-link-id="reported"]')).toBeVisible();
 await expect(page.locator('[data-link-id="short"]')).toContainText(/1 giờ 59 phút|2 giờ/);
 await expect(row.getByRole("button",{name:"Xóa link",exact:true})).toBeVisible();
 const font=await row.locator("code").evaluate(el=>({link:getComputedStyle(el).fontFamily,body:getComputedStyle(document.body).fontFamily}));
 expect(font.link).toBe(font.body);
 await page.reload();await expect(row).toContainText(`${new URL(page.url()).origin}/shopee/active`);
});

test("physical deletion clears the saved list and composer result",async({page})=>{
 const deleted=await fixture(page);await page.goto("/link");
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill("https://shopee.vn/product/1/2");
 await page.getByRole("button",{name:"Lấy link hoàn tiền",exact:true}).click();
 await expect(page.locator(".composer-result")).toContainText(`${new URL(page.url()).origin}/shopee/active`);
 await page.getByRole("link",{name:"Xem đơn hàng",exact:true}).click();
 await page.getByRole("link",{name:"Link đã tạo",exact:true}).click();
 const row=page.locator('[data-link-id="active"]');
 await row.getByRole("button",{name:"Xóa link",exact:true}).click();
 const confirm=page.getByRole("dialog");
 await expect(confirm).toContainText("tracking hợp lệ");
 await confirm.getByRole("button",{name:"Giữ lại link",exact:true}).click();expect(deleted).toEqual([]);
 await row.getByRole("button",{name:"Xóa link",exact:true}).click();
 await confirm.getByRole("button",{name:"Xóa link",exact:true}).click();
 await expect(row).toHaveCount(0);expect(deleted).toEqual(["active"]);
 await page.getByRole("link",{name:"Lấy link hoàn tiền",exact:true}).click();
 await expect(page.locator(".composer-result")).toHaveCount(0);
});

test("order pages have no saved-link controls or retention countdown",async({page})=>{
 await fixture(page);
 for(const status of ["pending","approved","rejected"]){
  await page.goto(`/orders/${status}`);
  await expect(page.locator(`[data-order-id="${status}"]`)).toContainText("Mã đơn");
  await expect(page.locator("[data-link-id],.link-deadline")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Xóa link",exact:true})).toHaveCount(0);
 }
});

test("exact retention boundary removes the link without moving it to rejected orders",async({page})=>{
 await fixture(page);let autoDeleteAt="";
 await page.route("**/api/v1/affiliate-links?**",async route=>{
  autoDeleteAt||=new Date(Date.now()+2500).toISOString();
  await route.fulfill({json:{data:[{id:"boundary",status:"active",legacy:false,canDelete:true,autoDeleteAt,createdAt:new Date().toISOString(),affiliateUrl:"https://s.shopee.vn/Boundary",productName:"Boundary"}],meta:{hasNext:false}}});
 });
 await page.goto("/saved-links");await expect(page.locator('[data-link-id="boundary"]')).toBeVisible();
 await expect(page.locator('[data-link-id="boundary"]')).toHaveCount(0,{timeout:6000});
 await page.getByRole("link",{name:"Hủy / không được hoàn",exact:true}).click();
 await expect(page.locator('[data-link-id="boundary"]')).toHaveCount(0);
});

test("historical links remain read-only in the saved list",async({page})=>{
 await fixture(page);await page.goto("/saved-links");const row=page.locator('[data-link-id="legacy"]');
 await expect(row).toContainText("Link lịch sử — chỉ đọc");
 await expect(row.getByRole("button",{name:"Xóa link",exact:true})).toHaveCount(0);
 await expect(row.getByRole("button",{name:"Sao chép link",exact:true})).toBeDisabled();
 await expect(row.getByRole("button",{name:"Chia sẻ QR",exact:true})).toBeDisabled();
});

test("compact saved links support keyboard, English and reduced motion at 320px",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.setViewportSize({width:320,height:740});
 await page.addInitScript(()=>Object.defineProperty(navigator,"clipboard",{value:{writeText:async(value:string)=>{(window as any).copiedLink=value;}}}));
 await fixture(page);await page.goto("/saved-links");await switchLanguage(page,"EN");
 const row=page.locator('[data-link-id="short"]');const copy=row.getByRole("button",{name:"Copy link",exact:true});
 await copy.focus();await page.keyboard.press("Enter");expect(await page.evaluate(()=>(window as any).copiedLink)).toBe(`${new URL(page.url()).origin}/shopee/short`);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await row.getByRole("button",{name:"Delete link",exact:true}).click();
 const modal=page.getByRole("dialog");await expect(modal).toContainText("valid tracking");
 expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
});

test("long order names and amounts fit narrow layouts in both languages",async({page})=>{
 await fixture(page);
 await page.route("**/api/v1/orders?**",route=>route.fulfill({json:{data:[{id:"long-order",status:"pending",externalId:"261008ABCDEFGH12345678901234567890",productName:"Bộ sản phẩm chăm sóc da và dưỡng ẩm chuyên sâu dùng hằng ngày — phiên bản dung tích lớn dành cho cả gia đình",orderedAt:new Date().toISOString(),value:9876543210,cashback:1234567890}],meta:{hasNext:false}}}));
 await page.goto("/orders/pending");const row=page.locator('[data-order-id="long-order"]');await expect(row).toBeVisible();
 for(const language of ["VI","EN"] as const){
  if(language==="EN")await switchLanguage(page,"EN");
  for(const width of [1260,768,320]){
   await page.setViewportSize({width,height:900});
   const problems=await row.evaluate(element=>Array.from(element.querySelectorAll<HTMLElement>("h3,.purchase-status,.purchase-facts dd")).filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.className));
   expect(problems).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  }
 }
});
