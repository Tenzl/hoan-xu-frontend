import { test, expect } from "@playwright/test";
import { openSidebar } from "../../helpers/sidebar";
import { closeSidebar } from "../../helpers/sidebar";

test("staff overview shows only assigned work and no financial request", async ({page}) => {
 const reads: string[]=[];
 await page.route("**/api/v1/**", async route => {
  const path=new URL(route.request().url()).pathname; reads.push(path);
  const data=path.endsWith("/me")?{id:"staff",name:"Nhân viên",role:"staff",permissions:["orders"],csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:path.endsWith("/work-queues")?{pendingOrders:7}:[];
  await route.fulfill({json:{data}});
 });
 await page.goto("/admin");
 await expect(page.getByRole("heading",{name:"Tổng quan quản trị",exact:true})).toBeVisible();
 await expect(page.getByText("Đơn chờ đối soát",{exact:true})).toBeVisible();
 await openSidebar(page);
 await expect(page.locator(".side").getByRole("link",{name:"Đơn hàng & đối soát",exact:true})).toBeVisible();
 await expect(page.getByRole("link",{name:"Tài khoản & phân quyền",exact:true})).toHaveCount(0);
 expect(reads).not.toContain("/api/v1/admin/dashboard");
});

test("notification staff can select a recipient without users permission and review before sending",async({page})=>{
 let sent:unknown; const reads:string[]=[];
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;reads.push(path);
  if(route.request().method()==="POST")sent=route.request().postDataJSON();
  const data=path.endsWith("/me")?{id:"staff",name:"Staff",role:"staff",permissions:["notifications"],csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:path.endsWith("/notification-recipients")?[{id:"customer-id",name:"Nguyễn Thu Hà",email:"ha@example.com"}]:[];
  await route.fulfill({json:{data}});
 });
 await page.goto("/admin/notifications");
 await page.getByRole("button",{name:"Soạn thông báo",exact:true}).click();
 const panel=page.getByRole("dialog",{name:"Soạn thông báo"});
 await panel.getByLabel("Người nhận",{exact:true}).selectOption("one");
 await panel.getByRole("combobox",{name:"Tìm người nhận"}).fill("Thu Hà");
 await panel.getByRole("option",{name:/Nguyễn Thu Hà/}).click();
 await panel.getByLabel("Tiêu đề",{exact:true}).fill("Đơn đã cập nhật");
 await panel.getByLabel("Nội dung",{exact:true}).fill("Bạn có thể kiểm tra đơn hàng trong tài khoản.");
 await panel.getByRole("button",{name:"Xem lại thông báo",exact:true}).click();
 expect(sent).toBeUndefined();
 await expect(panel.getByText("ha@example.com",{exact:true})).toBeVisible();
 await panel.getByRole("button",{name:"Gửi thông báo",exact:true}).click();
 await expect(panel).not.toBeVisible();
 expect(sent).toEqual({recipientId:"customer-id",title:"Đơn đã cập nhật",body:"Bạn có thể kiểm tra đơn hàng trong tài khoản."});
 expect(reads.some(path=>path.includes("/admin/users"))).toBeFalsy();
});

test("CSV selection is not uploaded until preview and row pages are accessible",async({page})=>{
 let uploads=0;let secondPage=false;
 await page.route("**/api/v1/**",async route=>{
  const url=new URL(route.request().url());const path=url.pathname;
  let data:unknown=[];let meta={hasNext:false};
  if(path.endsWith("/me"))data={id:"admin",name:"Admin",role:"admin",csrfToken:"fixture"};
  else if(path.endsWith("/config"))data={brand:"Hoàn Xu"};
  else if(path.endsWith("/order-imports")&&route.request().method()==="POST"){uploads++;data={id:"batch"};}
  else if(path.endsWith("/order-imports"))data=[{id:"batch",filename:"report.csv",status:"preview",createdAt:"2026-10-07",counts:{valid:101}}];
  else if(path.endsWith("/rows")){secondPage=url.searchParams.get("page")==="2";data=[{number:secondPage?101:1,status:"valid",payload:{productName:secondPage?"Sản phẩm dòng 101":"Sản phẩm dòng 1"}}];meta={hasNext:!secondPage};}
  await route.fulfill({json:{data,meta}});
 });
 await page.goto("/admin/imports");
 await page.getByLabel("Chọn báo cáo CSV",{exact:true}).setInputFiles({name:"report.csv",mimeType:"text/csv",buffer:Buffer.from("channel,publisher,order_id,line_id,tracking_code,date,product_name,value,commission,status\n")});
 expect(uploads).toBe(0);
 await page.getByRole("button",{name:"Xem trước báo cáo",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Xem trước dữ liệu",exact:true})).toBeVisible();
 await page.getByRole("region",{name:"Xem trước dữ liệu"}).getByRole("button",{name:"Tiếp →",exact:true}).click();
 await expect(page.getByText("Sản phẩm dòng 101",{exact:true})).toBeVisible();
 expect(uploads).toBe(1);expect(secondPage).toBeTruthy();
});

test("withdrawal upload stays attached to the selected request and never asks for an evidence ID",async({page})=>{
 let payment:unknown;
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/events"))payment=route.request().postDataJSON();
  const data=path.endsWith("/me")?{id:"staff",name:"Staff",role:"staff",permissions:["withdrawals"],csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:path.endsWith("/private-files")?{id:"proof"}:path.endsWith("/withdrawals")?[{id:"withdrawal",name:"Nguyễn Thu Hà",bank:"Vietcombank",account:"0123456789",holder:"NGUYEN THU HA",amount:200000,status:"processing",processorId:"staff"}]:[];
  await route.fulfill({json:{data}});
 });
 await page.goto("/admin/withdrawals");
 await page.getByRole("button",{name:"Ghi nhận chuyển khoản",exact:true}).click();
 const panel=page.getByRole("dialog",{name:"Xác nhận chuyển khoản"});
 await panel.getByLabel("Mã giao dịch ngân hàng",{exact:true}).fill("BANK-123");
 await expect(panel.getByRole("button",{name:"Xác nhận đã chuyển khoản",exact:true})).toBeDisabled();
 await panel.getByLabel("Bằng chứng chuyển khoản",{exact:true}).setInputFiles({name:"proof.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\nproof")});
 await expect(panel.getByText("proof.pdf",{exact:true})).toBeVisible();
 await panel.getByRole("button",{name:"Xác nhận đã chuyển khoản",exact:true}).click();
 await expect(panel).not.toBeVisible();
 expect(payment).toEqual({action:"paid",bankReference:"BANK-123",evidenceId:"proof",reason:""});
});

test("customer groups share navigation and preserve search after visiting orders",async({page})=>{
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  const customer={id:"customer",name:"Khách cũ",email:"",kind:"legacy",role:"customer",available:3000,held:0,giftHeld:0};
  const data=path.endsWith("/me")?{id:"admin",name:"Admin",role:"admin",csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:path.endsWith("/leaderboards")?{items:[],total:0}:path.endsWith("/users")?[customer]:path.endsWith("/users/customer")?customer:[];
  await route.fulfill({json:{data}});
 });
 await page.goto("/admin/legacy-users");
 await expect(page.getByRole("link",{name:"Khách từ hệ thống cũ",exact:true})).toHaveAttribute("aria-current","page");
 await page.getByLabel("Tìm khách hàng",{exact:true}).fill("Khách cũ");
 await expect(page).toHaveURL(/q=/);
 await page.getByRole("link",{name:"Xem đơn hàng",exact:true}).click();
 await page.getByRole("link",{name:"← Danh sách khách hàng",exact:true}).click();
 await expect(page.getByLabel("Tìm khách hàng",{exact:true})).toHaveValue("Khách cũ");
 await openSidebar(page);
 await expect(page.locator(".side").getByRole("link",{name:"Khách hàng",exact:true})).toBeVisible();
 await expect(page.locator(".side").getByRole("link",{name:"Người dùng cũ",exact:true})).toHaveCount(0);
 await closeSidebar(page);
});

test("creates staff using checkboxes and submits a permission array",async ({page}) => {
 let body: Record<string,unknown>|undefined;
 await page.route("**/api/v1/**",async route => {
  const path=new URL(route.request().url()).pathname;
  if(route.request().method()==="POST" && path.endsWith("/internal-accounts")) body=route.request().postDataJSON();
  const data=path.endsWith("/me")?{id:"admin",name:"Admin",role:"admin",csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:[];
  await route.fulfill({json:{data}});
 });
 await page.goto("/admin/accounts");
 await page.getByRole("button",{name:"Tạo tài khoản",exact:true}).click();
 const panel=page.getByRole("dialog",{name:"Tạo tài khoản nhân viên"});
 await panel.getByLabel("Tên đăng nhập",{exact:true}).fill("staff.test");
 await panel.getByLabel("Tên hiển thị",{exact:true}).fill("Nguyễn An");
 await panel.getByLabel("Mật khẩu tạm",{exact:true}).fill("temporary-password-123");
 await panel.getByRole("checkbox",{name:"Đơn hàng & nhập báo cáo",exact:true}).check();
 await panel.getByRole("checkbox",{name:"Xử lý rút tiền",exact:true}).check();
 await panel.getByRole("button",{name:"Tạo tài khoản",exact:true}).click();
 await expect(panel).not.toBeVisible();
 expect(body).toEqual({username:"staff.test",name:"Nguyễn An",password:"temporary-password-123",role:"staff",permissions:["orders","withdrawals"]});
});

test("canceling discard keeps the account form values and keyboard access",async({page})=>{
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  await route.fulfill({json:{data:path.endsWith("/me")?{id:"admin",name:"Admin",role:"admin",csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:[]}});
 });
 await page.goto("/admin/accounts");
 await page.getByRole("button",{name:"Tạo tài khoản",exact:true}).click();
 const panel=page.getByRole("dialog",{name:"Tạo tài khoản nhân viên"});
 await panel.getByLabel("Tên đăng nhập",{exact:true}).fill("unsaved.staff");
 await panel.getByRole("checkbox",{name:"Quản lý khách hàng",exact:true}).check();
 await page.keyboard.press("Escape");
 await expect(panel.getByText("Bỏ thay đổi chưa lưu?",{exact:true})).toBeVisible();
 await panel.getByRole("button",{name:"Tiếp tục chỉnh sửa",exact:true}).click();
 await expect(panel.getByLabel("Tên đăng nhập",{exact:true})).toHaveValue("unsaved.staff");
 await expect(panel.getByRole("checkbox",{name:"Quản lý khách hàng",exact:true})).toBeChecked();
 await page.keyboard.press("Escape");
 await panel.getByRole("button",{name:"Bỏ thay đổi",exact:true}).click();
 await expect(panel).not.toBeVisible();
});

test("staff can be created with no permissions and administrators have no permission checkboxes",async({page})=>{
 const created:unknown[]=[];
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/internal-accounts")&&route.request().method()==="POST")created.push(route.request().postDataJSON());
  await route.fulfill({json:{data:path.endsWith("/me")?{id:"admin",name:"Admin",role:"admin",csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:[]}});
 });
 await page.goto("/admin/accounts");
 for(const role of ["staff","admin"]){
  await page.getByRole("button",{name:"Tạo tài khoản",exact:true}).click();
  const panel=page.getByRole("dialog",{name:"Tạo tài khoản nhân viên"});
  await panel.getByLabel("Tên đăng nhập",{exact:true}).fill(role+".empty");
  await panel.getByLabel("Tên hiển thị",{exact:true}).fill("New "+role);
  await panel.getByLabel("Mật khẩu tạm",{exact:true}).fill("new-password-12345");
  await panel.getByLabel("Vai trò",{exact:true}).selectOption(role);
  if(role==="staff"){await expect(panel.getByRole("checkbox",{checked:true})).toHaveCount(0);await expect(panel.getByText("Chưa chọn quyền. Tài khoản sẽ chưa được giao chức năng.",{exact:true})).toBeVisible();}
  else{await expect(panel.getByRole("checkbox")).toHaveCount(0);await expect(panel.getByText("Có toàn quyền",{exact:true})).toBeVisible();}
  await panel.getByRole("button",{name:"Tạo tài khoản",exact:true}).click();
  await expect(panel).not.toBeVisible();
 }
 expect(created).toEqual([
  {username:"staff.empty",name:"New staff",password:"new-password-12345",role:"staff",permissions:[]},
  {username:"admin.empty",name:"New admin",password:"new-password-12345",role:"admin",permissions:[]},
 ]);
});

test("permission, password and status panels send independent updates and refresh the account list",async({page})=>{
 const account={id:"staff-id",username:"staff.an",name:"Nguyễn An",role:"staff",permissions:["orders","users"],blocked:false};
 const writes:{path:string;method:string;body:unknown}[]=[];
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method();
  if(method!=="GET"){
   const body=route.request().postDataJSON();writes.push({path,method,body});
   if(path.endsWith("/permissions"))account.permissions=body.permissions;
   if(path.endsWith("/status"))account.blocked=body.blocked;
  }
  const data=path.endsWith("/me")?{id:"admin",name:"Admin",role:"admin",csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:path.endsWith("/internal-accounts")?[account]:{updated:true};
  await route.fulfill({json:{data}});
 });
 await page.goto("/admin/accounts");
 await page.getByRole("button",{name:"Quản lý",exact:true}).click();
 let panel=page.getByRole("dialog",{name:"Chỉnh quyền",exact:true});
 await expect(panel.getByRole("checkbox",{name:"Đơn hàng & nhập báo cáo",exact:true})).toBeChecked();
 await expect(panel.getByRole("checkbox",{name:"Quản lý khách hàng",exact:true})).toBeChecked();
 await expect(panel.getByLabel("Mật khẩu tạm",{exact:true})).toHaveCount(0);
 await panel.getByRole("checkbox",{name:"Đơn hàng & nhập báo cáo",exact:true}).uncheck();
 await panel.getByRole("button",{name:"Lưu quyền",exact:true}).click();
 await expect(panel).not.toBeVisible();
 await expect(page.locator("table").getByText("Đơn hàng & nhập báo cáo",{exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:"Quản lý",exact:true}).click();
 panel=page.getByRole("dialog");
 await panel.getByRole("button",{name:"Đặt lại mật khẩu",exact:true}).click();
 await expect(panel.getByRole("checkbox")).toHaveCount(0);
 await panel.getByLabel("Mật khẩu tạm",{exact:true}).fill("reset-password-12345");
 await panel.locator('button[type="submit"]').click();
 await expect(panel).not.toBeVisible();
 await page.getByRole("button",{name:"Quản lý",exact:true}).click();
 panel=page.getByRole("dialog");
 await panel.getByRole("button",{name:"Khóa tài khoản",exact:true}).click();
 await panel.locator('button[type="submit"]').click();
 await expect(panel).not.toBeVisible();
 await expect(page.locator("table")).toContainText("Đã khóa");
 expect(writes).toEqual([
  {path:"/api/v1/admin/internal-accounts/staff-id/permissions",method:"PUT",body:{permissions:["users"]}},
  {path:"/api/v1/admin/internal-accounts/staff-id/reset-password",method:"POST",body:{password:"reset-password-12345"}},
  {path:"/api/v1/admin/internal-accounts/staff-id/status",method:"PATCH",body:{blocked:true}},
 ]);
 expect(account.permissions).toEqual(["users"]);
});

test("no-permission staff can open overview while direct unauthorized URLs load no module data",async({page})=>{
 const reads:string[]=[];
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;reads.push(path);
  await route.fulfill({json:{data:path.endsWith("/me")?{id:"staff",name:"Staff",role:"staff",permissions:[],csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:{}}});
 });
 await page.goto("/admin");
 await expect(page.getByText("Tài khoản chưa được cấp quyền. Liên hệ quản trị viên để được giao chức năng.",{exact:true})).toBeVisible();
 await page.goto("/admin/orders");
 await expect(page.getByRole("alert").filter({hasText:"Bạn không có quyền."})).toBeVisible();
 expect(reads).not.toContain("/api/v1/admin/orders");
 expect(reads).not.toContain("/api/v1/admin/dashboard");
});

test("withdrawal upload errors and uncertain payment retries preserve the selected proof and operation key",async({page})=>{
 let uploads=0,payments=0;const keys:string[]=[];
 await page.route("**/api/v1/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/private-files")&&++uploads===1){await route.fulfill({status:503,json:{error:{code:"INTERNAL_ERROR",message:"Tải bằng chứng thất bại"}}});return;}
  if(path.endsWith("/events")){
   payments++;keys.push(route.request().headers()["idempotency-key"]);
   expect(route.request().postDataJSON()).toMatchObject({evidenceId:"proof",bankReference:"BANK-RETRY"});
   if(payments===1){await route.fulfill({status:503,json:{error:{code:"INTERNAL_ERROR",message:"Chưa xác nhận được chuyển khoản"}}});return;}
  }
  const data=path.endsWith("/me")?{id:"staff",name:"Staff",role:"staff",permissions:["withdrawals"],csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:path.endsWith("/private-files")?{id:"proof"}:path.endsWith("/withdrawals")?[{id:"withdrawal",name:"Khách A",bank:"Bank",account:"0123456789",holder:"CUSTOMER A",amount:50000,status:"processing",processorId:"staff"}]:[];
  await route.fulfill({json:{data}});
 });
 await page.goto("/admin/withdrawals");
 await page.getByRole("button",{name:"Ghi nhận chuyển khoản",exact:true}).click();
 const panel=page.getByRole("dialog",{name:"Xác nhận chuyển khoản"});
 const file={name:"retry.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\nproof")};
 await panel.getByLabel("Bằng chứng chuyển khoản",{exact:true}).setInputFiles(file);
 await expect(panel.getByRole("alert")).toContainText("Tải bằng chứng thất bại");
 await expect(panel.getByRole("button",{name:"Xác nhận đã chuyển khoản",exact:true})).toBeDisabled();
 await panel.getByLabel("Bằng chứng chuyển khoản",{exact:true}).setInputFiles(file);
 await expect(panel.getByText("retry.pdf",{exact:true})).toBeVisible();
 await panel.getByLabel("Mã giao dịch ngân hàng",{exact:true}).fill("BANK-RETRY");
 await panel.getByRole("button",{name:"Xác nhận đã chuyển khoản",exact:true}).click();
 await expect(panel.getByRole("alert")).toContainText("Chưa xác nhận được chuyển khoản");
 await expect(panel.getByText("retry.pdf",{exact:true})).toBeVisible();
 await panel.getByRole("button",{name:"Xác nhận đã chuyển khoản",exact:true}).click();
 await expect(panel).not.toBeVisible();
 expect(payments).toBe(2);expect(keys[0]).toBeTruthy();expect(keys[0]).toBe(keys[1]);
});
