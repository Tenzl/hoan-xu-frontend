import { test, expect } from "@playwright/test";

test("deleting a newly saved link clears both its result and history row", async({page})=>{
 const link={id:"11111111-1111-4111-8111-111111111111",trackingCode:"token-new",affiliateUrl:"https://s.shopee.vn/NewSaved",status:"active",canDelete:true,legacy:false,tierCode:"bronze",payoutFactor:"0.63",effectiveSharePercent:63,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+6*86400000).toISOString()};
 let saved=false;
 await page.route("**/api/v1/**",async route=>{
  const r=route.request(),path=new URL(r.url()).pathname;let data:unknown=[];
  if(path.endsWith("/me"))data={id:"customer",name:"An",role:"customer",csrfToken:"csrf"};
  if(path.endsWith("/config"))data={brand:"Hoàn Xu"};
  if(path.endsWith("/me/dashboard"))data={membership:{tierCode:"bronze",minSharePercent:60,maxSharePercent:70}};
  if(path.endsWith("/product-checks"))data={schemaVerified:true,shopId:"1",itemId:"2",price:100000,commission:10000,productName:"Product"};
  if(path.endsWith("/affiliate-links")){if(r.method()==="POST"){saved=true;data=link}else data=saved?[link]:[]}
  if(path.endsWith("/affiliate-links/"+link.id)){
   if(r.method()==="DELETE"){saved=false;await route.fulfill({status:204});return}
   if(!saved){await route.fulfill({status:404,json:{error:{code:"NOT_FOUND",message:"Không có link."}}});return}
   data=link;
  }
  await route.fulfill({json:{data}});
 });
 await page.goto("/link");
 await expect(page.getByRole("region",{name:"Link của bạn",exact:true})).toBeVisible();
 await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill("https://shopee.vn/product/1/2");
 await page.getByRole("button",{name:"Lấy link hoàn tiền",exact:true}).click();
 const output=page.locator(".composer-result");await expect(output).toContainText(link.affiliateUrl);
 const list=page.getByRole("region",{name:"Link của bạn",exact:true});await expect(list).toContainText(link.affiliateUrl);
 await list.getByRole("button",{name:"Xóa link",exact:true}).click();
 await page.getByRole("dialog",{name:"Xóa link",exact:true}).getByRole("button",{name:"Xóa khỏi database",exact:true}).click();
 await expect(output).toHaveCount(0);await expect(list).not.toContainText(link.affiliateUrl);
});
test("saved links survive reload, countdown and deletion protect progress and completed", async ({ page }) => {
    const now = Date.now();
    let links = [
        { id: "active", trackingCode: "token-active", status: "active", canDelete: true, expiresAt: new Date(now + 6 * 86400000).toISOString() },
        { id: "short", trackingCode: "token-short", status: "active", canDelete: true, expiresAt: new Date(now + 2 * 3600000).toISOString() },
        { id: "progress", trackingCode: "token-progress", status: "progress", canDelete: false, expiresAt: new Date(now - 86400000).toISOString() },
        { id: "completed", trackingCode: "token-completed", status: "completed", canDelete: false, expiresAt: new Date(now - 86400000).toISOString() },
        { id: "cancelled", trackingCode: "token-cancelled", status: "cancelled", canDelete: true, expiresAt: new Date(now - 86400000).toISOString() },
    ].map(l => ({ ...l, createdAt: new Date(now).toISOString(), affiliateUrl: `https://s.shopee.vn/${l.id}`, originalUrl: "https://shopee.vn/product/1/2", channel: "shopee", payoutFactor: "0.63", tierCode: "bronze", legacy: false }));
    const deleted: string[] = [];
    await page.route("**/api/v1/**", async (route) => {
        const r = route.request(), path = new URL(r.url()).pathname;
        if (r.method() === "DELETE") {
            expect(r.headers()["x-csrf-token"]).toBe("csrf");
            const id = path.split("/").pop()!;
            deleted.push(id);
            links = links.filter(l => l.id !== id);
            await route.fulfill({ status: 204 });
            return;
        }
        let data: unknown = [];
        if (path.endsWith("/me"))
            data = { id: "customer", name: "An", role: "customer", csrfToken: "csrf" };
        if (path.endsWith("/config"))
            data = { brand: "Hoàn Xu" };
        if (path.endsWith("/me/dashboard"))
            data = { membership: { tierCode: "bronze", minSharePercent: 60, maxSharePercent: 70 } };
        if (path.endsWith("/affiliate-links"))
            data = links;
        await route.fulfill({ json: { data } });
    });
    await page.goto("/link");
    const list = page.getByRole("region", { name: "Link của bạn", exact: true });
    await expect(list).toContainText("Còn 6 ngày để được hoàn Xu");
    await expect(list.locator('[data-link-id="short"]')).toContainText(/Còn 1 giờ 59 phút|Còn 2 giờ/);
    await expect(list.locator('[data-link-id="progress"]')).toContainText("Đang xử lý");
    await expect(list.locator('[data-link-id="progress"]').getByRole("button", { name: "Xóa link", exact: true })).toBeDisabled();
    await expect(list.locator('[data-link-id="completed"]').getByRole("button", { name: "Xóa link", exact: true })).toBeDisabled();
    await expect(list.locator('[data-link-id="cancelled"]')).toContainText("Link đã bị cancel — hết thời hạn hoàn Xu");
    await expect(list.locator('[data-link-id="cancelled"]').getByRole("button", { name: "Sao chép", exact: true })).toBeDisabled();
    await expect(list.locator('[data-link-id="progress"] a[aria-disabled="true"]')).not.toHaveAttribute("href");
    await page.reload();
    await expect(list.locator('[data-link-id="active"]')).toBeVisible();
    await list.locator('[data-link-id="active"]').getByRole("button", { name: "Xóa link", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Xóa link", exact: true });
    await expect(dialog).toContainText("Đơn đặt đúng hạn vẫn được ghi nhận");
    await dialog.getByRole("button", { name: "Xóa khỏi database", exact: true }).click();
    await expect(list.locator('[data-link-id="active"]')).toHaveCount(0);
    expect(deleted).toEqual(["active"]);
    await page.screenshot({ path: test.info().outputPath("saved-links.png"), fullPage: true });
});
