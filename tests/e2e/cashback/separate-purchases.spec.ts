import {test,expect} from "@playwright/test";

test("saved links and three order states have independent URLs and data",async({page})=>{
 const requests:string[]=[];
 const now=Date.now();
 const saved={id:"saved",productName:"Tai nghe Bluetooth",affiliateUrl:"https://s.shopee.vn/saved",trackingCode:"saved",status:"active",legacy:false,canDelete:true,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+5*86400000).toISOString(),autoDeleteAt:new Date(now+5*86400000).toISOString()};
 let removed=false;
 await page.route("**/api/v1/**",async route=>{
  const r=route.request(),url=new URL(r.url()),path=url.pathname;
  requests.push(path);
  let data:unknown=[];
  if(path.endsWith("/me"))data={id:"customer",name:"An",role:"customer",csrfToken:"csrf"};
  if(path.endsWith("/config"))data={brand:"Hoàn Xu"};
  if(path.endsWith("/affiliate-links"))data=removed?[]:[saved];
  if(path.endsWith("/affiliate-links/saved")&&r.method()==="DELETE"){removed=true;await route.fulfill({status:204});return;}
  if(path.endsWith("/orders")){
   const status=url.searchParams.get("status");
   data=[{id:`order-${status}`,status,externalId:`ORDER-${status}`,productName:`Đơn ${status}`,value:100000,cashback:6301,orderedAt:new Date(now).toISOString()}];
  }
  await route.fulfill({json:{data,meta:{hasNext:false}}});
 });
 await page.goto("/saved-links");
 const nav=page.getByRole("navigation",{name:"Link và đơn hàng",exact:true});
 await expect(nav.getByRole("link",{name:"Link đã tạo",exact:true})).toHaveAttribute("aria-current","page");
 await expect(page.locator('[data-link-id="saved"]')).toContainText("Tự xóa sau");
 await expect(page.locator('[data-link-id="saved"]')).toContainText("5 ngày");
 for(const [label,path,status] of [["Chờ duyệt","/orders/pending","pending"],["Đã duyệt","/orders/approved","approved"],["Hủy / không được hoàn","/orders/rejected","rejected"]]){
  await nav.getByRole("link",{name:label,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.locator(`[data-order-id="order-${status}"]`)).toBeVisible();
  await expect(page.locator("[data-link-id],.link-deadline")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Xóa link",exact:true})).toHaveCount(0);
  await page.reload();
  await expect(nav.getByRole("link",{name:label,exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.locator(".link-wallet")).toBeVisible();
 }
 await page.goBack();await expect(page).toHaveURL(/\/orders\/approved$/);
 await nav.getByRole("link",{name:"Link đã tạo",exact:true}).click();
 await page.getByRole("button",{name:"Xóa link",exact:true}).click();
 const confirm=page.getByRole("dialog");
 await expect(confirm).toContainText("tracking hợp lệ");
 await confirm.getByRole("button",{name:"Xóa link",exact:true}).click();
 await expect(page.locator('[data-link-id="saved"]')).toHaveCount(0);
 await nav.getByRole("link",{name:"Chờ duyệt",exact:true}).click();
 await expect(page.locator('[data-order-id="order-pending"]')).toBeVisible();
 expect(requests.some(p=>p.endsWith("/me/purchases"))).toBeFalsy();
 await page.goto("/orders");await expect(page).toHaveURL(/\/orders\/pending$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:test.info().outputPath("separate-orders.png"),fullPage:true});
});
