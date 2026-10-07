import {test,expect} from "@playwright/test";
for(const width of [375,768,1440])for(const theme of ["light","dark"])test("admin layout "+width+" "+theme,async({page,isMobile})=>{
 test.skip(isMobile,"The matrix sets its own viewport sizes.");
 await page.setViewportSize({width,height:1000});
 await page.addInitScript(theme=>localStorage.setItem("hoanxu.theme",theme),theme);
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  const data=path.endsWith("/me")?{id:"admin",name:"Quản trị viên",role:"admin",csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:path.endsWith("/internal-accounts")?[
   {id:"admin",username:"admin",name:"Quản trị viên",role:"admin",blocked:false,permissions:[]},
   {id:"staff",username:"staff.an",name:"Nguyễn An",role:"staff",blocked:false,permissions:["orders","withdrawals"]},
   {id:"staff2",username:"staff.ha",name:"Trần Hà",role:"staff",blocked:false,permissions:["users","notifications"],mustChangePassword:true},
  ]:path.endsWith("/orders")?[
   {id:"order1",name:"Nguyễn Thu Hà",productName:"Tai nghe Bluetooth",externalId:"HX-20261007-001",lineId:"1",channel:"Shopee",cashback:35000,status:"pending",sourceStatus:"approved",orderedAt:"2026-10-07T10:00:00+07:00"},
   {id:"order2",name:"Trần Minh An",productName:"Bình giữ nhiệt 500 ml",externalId:"HX-20261007-002",lineId:"1",channel:"Shopee",cashback:12000,status:"pending",sourceStatus:"pending",orderedAt:"2026-10-07T09:30:00+07:00"},
  ]:[];
  await route.fulfill({json:{data,meta:{hasNext:false}}});
 });
 await page.goto("/admin/orders");
 await expect(page.getByRole("heading",{name:"Đơn hàng & đối soát",exact:true})).toBeVisible();
 await expect(page.getByText("Tai nghe Bluetooth",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:test.info().outputPath("orders-"+width+"-"+theme+".png"),fullPage:true});
 await page.goto("/admin/accounts");
 await page.getByRole("button",{name:"Tạo tài khoản",exact:true}).click();
 const panel=page.getByRole("dialog",{name:"Tạo tài khoản nhân viên"});
 await panel.getByLabel("Tên đăng nhập",{exact:true}).fill("staff.minh");
 await panel.getByLabel("Tên hiển thị",{exact:true}).fill("Lê Minh");
 await panel.getByRole("checkbox",{name:"Đơn hàng & nhập báo cáo",exact:true}).check();
 await panel.getByRole("checkbox",{name:"Xử lý rút tiền",exact:true}).check();
 const size=await panel.boundingBox();expect(size!.x).toBeGreaterThanOrEqual(0);expect(size!.width).toBeLessThanOrEqual(width);
 await panel.getByRole("checkbox",{name:"Quản lý khách hàng",exact:true}).focus();
 await expect(panel.getByRole("checkbox",{name:"Quản lý khách hàng",exact:true})).toBeFocused();
 await page.screenshot({path:test.info().outputPath("permissions-"+width+"-"+theme+".png"),fullPage:true});
 if(width===1440)await panel.locator(".admin-permission-list").screenshot({path:test.info().outputPath("permission-options-"+theme+".png")});
});
