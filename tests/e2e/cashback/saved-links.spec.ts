import { test, expect, type Page } from "@playwright/test";
import { switchLanguage } from "../../helpers/sidebar";

async function fixture(page: Page) {
 const now=Date.now();
 let links = [
  {id:"active",status:"active",canDelete:true,expiresAt:new Date(now+6*86400000).toISOString(),productName:"Tai nghe Bluetooth"},
  {id:"short",status:"active",canDelete:false,expiresAt:new Date(now+2*3600000).toISOString(),productName:"Bàn phím cơ"},
  {id:"progress",status:"progress",canDelete:false,expiresAt:new Date(now-86400000).toISOString(),productName:"Đơn đang xử lý"},
  {id:"completed",status:"completed",canDelete:false,expiresAt:new Date(now-86400000).toISOString(),productName:"Đơn hoàn thành"},
  {id:"cancelled",status:"cancelled",canDelete:false,expiresAt:new Date(now-86400000).toISOString(),productName:"Sản phẩm hết hạn"},
  {id:"cancelled-early",status:"cancelled",canDelete:false,expiresAt:new Date(now+6*86400000).toISOString(),productName:"Đơn bị hủy trước hạn"},
  {id:"legacy",status:"legacy",canDelete:false,expiresAt:null,productName:null},
 ].map(l=>({...l,createdAt:new Date(now).toISOString(),affiliateUrl:`https://s.shopee.vn/${l.id}`,legacy:l.id==="legacy",trackingCode:l.id}));
 const deleted:string[]=[];
 await page.route("**/api/v1/**",async route=>{
  const r=route.request(),url=new URL(r.url()),path=url.pathname;let data:unknown=[];
  if(path.endsWith("/me"))data={id:"customer",name:"An",role:"customer",csrfToken:"csrf"};
  if(path.endsWith("/config"))data={brand:"Hoàn Xu"};
  if(path.endsWith("/product-checks"))data={schemaVerified:true,shopId:"1",itemId:"2",productName:"Tai nghe Bluetooth",commission:10000,price:100000};
  if(path.endsWith("/affiliate-links")&&r.method()==="POST")data=links.find(link=>link.id==="active");
  if(path.endsWith("/me/purchases")) {
   const status=url.searchParams.get("status");
   const records=links.map(link=>link.status==="progress"||link.status==="completed" ? {id:link.id,kind:"order",status:link.status,link,order:{id:link.id,productName:link.productName,value:100000,cashback:6000,externalId:link.id,orderedAt:new Date(now).toISOString()}} : {id:link.id,kind:"link",status:link.status==="active"?"selecting":link.status==="cancelled"?"rejected":"legacy",link,order:null});
   data=records.filter(row=>status==="all"||row.status===status);
  }
  if(r.method()==="DELETE") {expect(r.headers()["x-csrf-token"]).toBe("csrf");const id=path.split("/").pop()!;deleted.push(id);links=links.filter(l=>l.id!==id);await route.fulfill({status:204});return;}
  await route.fulfill({json:{data,meta:{hasNext:false}}});
 });
 return deleted;
}

test("choosing shows product names and uses the body font and has no deletion controls",async({page})=>{
 const deleted=await fixture(page);await page.goto("/link");
 await expect(page.getByRole("region",{name:"Link của bạn",exact:true})).toHaveCount(0);
 await expect(page.getByRole("region",{name:"Lịch sử mua hàng",exact:true})).toHaveCount(0);
 await page.goto("/orders");
 await expect(page.getByRole("button",{name:"Đang lựa",exact:true})).toHaveAttribute("aria-pressed","true");
 const row=page.locator('[data-purchase-id="active"]');
 await expect(row).toContainText("Tai nghe Bluetooth");await expect(row).toContainText("Còn 6 ngày");
 await expect(page.locator('[data-link-id="short"]')).toContainText(/Còn 1 giờ 59 phút|Còn 2 giờ/);
 await expect(page.locator('[data-link-id="cancelled"]')).toHaveCount(0);
 await page.reload();await expect(row).toContainText("https://s.shopee.vn/active");
 await expect(page.getByRole("button",{name:"Xóa link",exact:true})).toHaveCount(0);
 expect(deleted).toEqual([]);
 const font=await row.locator("code").evaluate(el=>({link:getComputedStyle(el).fontFamily,body:getComputedStyle(document.body).fontFamily}));
 expect(font.link).toBe(font.body);
 await page.screenshot({path:test.info().outputPath("orders-choosing.png"),fullPage:true});
});

test("the just-created link remains saved and cannot be deleted",async({page})=>{
 const deleted=await fixture(page);await page.goto("/link");
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill("https://shopee.vn/product/1/2");
 await page.getByRole("button",{name:"Lấy link hoàn tiền",exact:true}).click();
 await expect(page.getByRole("region",{name:"Link của bạn đã sẵn sàng",exact:true})).toContainText("https://s.shopee.vn/active");
 await page.getByRole("link",{name:"Xem đơn hàng",exact:true}).click();
 await expect(page.locator('[data-purchase-id="active"]')).toContainText("Tai nghe Bluetooth");
 await expect(page.getByRole("button",{name:"Xóa link",exact:true})).toHaveCount(0);
 await page.getByRole("link",{name:"Lấy link hoàn tiền",exact:true}).click();
 await expect(page.getByRole("region",{name:"Link của bạn đã sẵn sàng",exact:true})).toContainText("https://s.shopee.vn/active");
 expect(deleted).toEqual([]);
});

test("orders statuses retain locks and expired links appear under rejection",async({page})=>{
 await fixture(page);await page.goto("/orders");
 for(const [tab,id] of [["Đang xử lý","progress"],["Hoàn thành","completed"]]) {
  await page.getByRole("button",{name:tab,exact:true}).click();const row=page.locator(`[data-link-id="${id}"]`);
  await expect(row.getByRole("button",{name:"Xóa link",exact:true})).toHaveCount(0);
  await expect(page.locator(`[data-purchase-id="${id}"]`)).toContainText("6.000 Xu");
  await expect(page.locator(`[data-purchase-id="${id}"]`)).toContainText("Mã đơn");
  await expect(row.getByRole("button",{name:"Sao chép",exact:true})).toBeDisabled();
  await expect(row).toContainText("đơn đặt đúng hạn tiếp tục được đối soát");
 }
 await page.getByRole("button",{name:"Từ chối",exact:true}).click();
 await expect(page.locator('[data-link-id="cancelled"]')).toContainText("Link đã bị cancel — hết thời hạn hoàn Xu");
 await expect(page.locator('[data-link-id="active"]')).toHaveCount(0);
 await page.getByRole("button",{name:"Tất cả",exact:true}).click();
 await expect(page.locator('[data-purchase-id="legacy"]')).toContainText("Tên sản phẩm chưa có");
 await expect(page.locator('[data-link-id="legacy"]').getByRole("button",{name:"Xóa link",exact:true})).toHaveCount(0);
 await switchLanguage(page,"EN");await expect(page.getByRole("button",{name:"Choosing",exact:true})).toBeVisible();
 await page.evaluate(()=>{document.documentElement.dataset.theme="dark"});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:test.info().outputPath("orders-all-en-dark.png"),fullPage:true});
});

test("deadline stays on one row and moves an expired selection to rejection",async({page})=>{
 await fixture(page);
 let expiry="";
 await page.route("**/api/v1/me/purchases?**",async route=>{
  expiry ||= new Date(Date.now()+3000).toISOString();
  const expired=Date.now()>=Date.parse(expiry),status=new URL(route.request().url()).searchParams.get("status");
  const row={id:"boundary",kind:"link",status:expired?"rejected":"selecting",link:{id:"boundary",affiliateUrl:"https://s.shopee.vn/Boundary",productName:"Boundary product",expiresAt:expiry,status:expired?"cancelled":"active",canDelete:false,legacy:false}};
  await route.fulfill({json:{data:(status===row.status||status==="all")?[row]:[],meta:{hasNext:false}}});
 });
 await page.goto("/orders");await expect(page.locator('[data-link-id="boundary"]')).toBeVisible();
 await expect(page.locator('[data-link-id="boundary"]')).toHaveCount(0,{timeout:6000});
 await page.getByRole("button",{name:"Từ chối",exact:true}).click();
 await expect(page.locator('[data-link-id="boundary"]')).toContainText("Link đã bị cancel");
});

test("cancelled links cannot be copied or opened even before their deadline",async({page})=>{
 const deleted=await fixture(page);await page.goto("/orders");
 await page.getByRole("button",{name:"Từ chối",exact:true}).click();
 const row=page.locator('[data-link-id="cancelled-early"]');
 await expect(row).toContainText("Link đã bị cancel — đơn đã bị hủy hoặc từ chối");
 await expect(row.locator('.link-countdown')).toHaveText("Đã cancel");
 await expect(row.getByRole("button",{name:"Sao chép",exact:true})).toBeDisabled();
 const open=row.getByLabel("Mở để mua",{exact:true});
 await expect(open).toHaveAttribute("aria-disabled","true");
 await expect(open).not.toHaveAttribute("href");
 await expect(page.getByRole("button",{name:"Xóa link",exact:true})).toHaveCount(0);
 expect(deleted).toEqual([]);
});

test("compact links remain usable by keyboard with reduced motion at 320px",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.setViewportSize({width:320,height:740});
 await page.addInitScript(()=>Object.defineProperty(navigator,"clipboard",{value:{writeText:async(value:string)=>{(window as any).copiedLink=value;}}}));
 await fixture(page);await page.goto("/orders");await switchLanguage(page,"EN");
 const row=page.locator('[data-link-id="short"]');
 await expect(row.locator(".link-countdown")).toHaveText(/Available: [12]h \d+m/);
 const copy=row.getByRole("button",{name:"Copy",exact:true});
 await copy.focus();await page.keyboard.press("Enter");
 expect(await page.evaluate(()=>(window as any).copiedLink)).toBe("https://s.shopee.vn/short");
 const bounds=await row.locator('.saved-link-row').evaluate(element=>{
  const rect=element.getBoundingClientRect();
  return Array.from(element.querySelectorAll('code,button,a')).map(child=>{const b=child.getBoundingClientRect();return {center:b.y+b.height/2,left:b.left,right:b.right,rowLeft:rect.left,rowRight:rect.right};});
 });
 for(const bound of bounds){expect(Math.abs(bound.center-bounds[0].center)).toBeLessThan(2);expect(bound.left).toBeGreaterThanOrEqual(bound.rowLeft);expect(bound.right).toBeLessThanOrEqual(bound.rowRight+1);}
 expect(await row.locator('.link-deadline').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
