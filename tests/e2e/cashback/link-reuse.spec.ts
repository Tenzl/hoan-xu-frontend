import { test, expect } from "@playwright/test";

test("reused link can be copied, deleted, then replaced with a new five-day link", async ({page}) => {
  const createdAt=new Date().toISOString(),expiresAt=new Date(Date.now()+5*86400000).toISOString();
  const old={id:"existing",channel:"shopee",affiliateUrl:"https://s.shopee.vn/existing",trackingCode:"old",productName:"Tai nghe Bluetooth",status:"active",canDelete:true,legacy:false,createdAt,expiresAt};
  const fresh={...old,id:"new",affiliateUrl:"https://s.shopee.vn/new",trackingCode:"new"};
  let removed=false,requests=0;
  await page.addInitScript(()=>Object.defineProperty(navigator,"clipboard",{value:{writeText:async (value:string)=>{(window as any).copiedLink=value;}}}));
  await page.route("**/api/v1/**",async route=>{
    const r=route.request(),path=new URL(r.url()).pathname;
    let data:unknown=[];
    if(path.endsWith("/me"))data={id:"customer",name:"An",role:"customer",csrfToken:"csrf"};
    if(path.endsWith("/config"))data={brand:"Hoàn Xu"};
    if(path.endsWith("/product-checks"))data={schemaVerified:true,shopId:"1",itemId:"2",productName:old.productName,price:100000,commission:10000};
    if(path.endsWith("/affiliate-links")&&r.method()==="POST"){
      requests++;
      data=removed?{...fresh,reused:false}:{...old,reused:true};
    }
    if(path.endsWith("/affiliate-links/existing")){
      if(r.method()==="DELETE"){
        expect(r.headers()["x-csrf-token"]).toBe("csrf");
        removed=true;
        await route.fulfill({status:204});return;
      }
      if(removed){await route.fulfill({status:404,json:{error:{code:"NOT_FOUND",message:"Không có link."}}});return;}
      data=old;
    }
    if(path.endsWith("/affiliate-links/new"))data=fresh;
    await route.fulfill({json:{data}});
  });
  await page.goto("/link");
  await page.getByLabel("Link sản phẩm Shopee",{exact:true}).fill("https://shopee.vn/product/1/2");
  await page.getByRole("button",{name:"Lấy link hoàn tiền",exact:true}).click();
  const output=page.getByRole("region",{name:"Link của bạn đã sẵn sàng",exact:true});
  await expect(output).toContainText("Bạn đã có link còn hiệu lực cho sản phẩm này");
  await expect(output).toContainText("hãy xóa link hiện tại trước");
  await expect(output).toContainText("5 ngày");
  await output.getByRole("button",{name:"Sao chép link",exact:true}).click();
  expect(await page.evaluate(()=>(window as any).copiedLink)).toBe(`${new URL(page.url()).origin}/shopee/existing`);
  await output.getByRole("button",{name:"Xóa link",exact:true}).click();
  const modal=page.getByRole("dialog",{name:"Xóa link để tạo link mới?",exact:true});
  await expect(modal).toContainText("Xóa link không ảnh hưởng đến đơn hoặc tiền hoàn");
  await page.screenshot({path:test.info().outputPath("delete-link-confirmation.png"),fullPage:true});
  await modal.getByRole("button",{name:"Xóa link",exact:true}).click();
  await expect(output).toHaveCount(0);
  await page.getByRole("button",{name:"Lấy link hoàn tiền",exact:true}).click();
  await expect(output).toContainText(`${new URL(page.url()).origin}/shopee/new`);
  await expect(output).not.toContainText("Bạn đã có link còn hiệu lực");
  expect(requests).toBe(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
