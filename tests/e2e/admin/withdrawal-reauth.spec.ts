import { test, expect } from "@playwright/test";

test("upload and payment resume after password verification with the original request and refreshed CSRF", async ({page}) => {
  let csrf = "first-csrf", uploads = 0, payments = 0, paid = false;
  const uploadKeys: string[] = [], paymentKeys: string[] = [];
  await page.route("**/api/v1/**", async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    const reply = (data: unknown) => route.fulfill({json:{data,meta:{hasNext:false}}});
    if(path.endsWith("/reauth")) {
      if(req.postDataJSON().password !== "staff-password-123") return route.fulfill({status:401,json:{error:{code:"INVALID_PASSWORD",message:"Mật khẩu không đúng."}}});
      csrf = "refreshed-csrf";
      return reply({verified:true});
    }
    if(path.endsWith("/private-files")) {
      uploads++; uploadKeys.push(req.headers()["idempotency-key"]);
      if(uploads === 1) return route.fulfill({status:403,json:{error:{code:"REAUTH_REQUIRED",message:"Vui lòng xác thực lại mật khẩu."}}});
      expect(req.headers()["x-csrf-token"]).toBe(csrf);
      expect(req.postData()).toContain("proof.pdf");
      return reply({id:"uploaded-proof"});
    }
    if(path.endsWith("/events")) {
      payments++; paymentKeys.push(req.headers()["idempotency-key"]);
      expect(req.postDataJSON()).toEqual({action:"paid",bankReference:"BANK-001",evidenceId:"uploaded-proof",reason:""});
      if(payments === 1) return route.fulfill({status:403,json:{error:{code:"REAUTH_REQUIRED",message:"Vui lòng xác thực lại mật khẩu."}}});
      expect(req.headers()["x-csrf-token"]).toBe(csrf);
      paid = true;
      return reply({updated:true});
    }
    if(path.endsWith("/me")) return reply({id:"staff",name:"Staff",role:"staff",permissions:["withdrawals"],csrfToken:csrf});
    if(path.endsWith("/config")) return reply({brand:"Hoàn Xu"});
    if(path.endsWith("/withdrawals")) return reply(!paid && url.searchParams.get("status")==="processing" ? [{id:"withdrawal",name:"Khách A",bank:"Bank",account:"0123456789",holder:"CUSTOMER A",amount:50000,status:"processing",processorId:"staff"}] : []);
    return reply([]);
  });
  await page.goto("/admin/withdrawals");
  await page.getByRole("button",{name:"Đang xử lý",exact:true}).click();
  await page.getByRole("button",{name:"Ghi nhận chuyển khoản",exact:true}).click();
  const panel = page.getByRole("dialog",{name:"Xác nhận chuyển khoản"});
  await panel.getByLabel("Bằng chứng chuyển khoản",{exact:true}).setInputFiles({name:"proof.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\nproof")});
  const verify = page.getByRole("dialog",{name:"Xác thực lại mật khẩu"});
  await verify.getByLabel("Mật khẩu",{exact:true}).fill("wrong-password");
  await verify.getByRole("button",{name:"Xác thực",exact:true}).click();
  await expect(verify).toBeVisible();
  expect(uploads).toBe(1);
  await verify.getByLabel("Mật khẩu",{exact:true}).fill("staff-password-123");
  await verify.getByRole("button",{name:"Xác thực",exact:true}).click();
  await expect(verify).not.toBeVisible();
  await expect(panel.getByText("proof.pdf",{exact:true})).toBeVisible();
  await panel.getByLabel("Mã giao dịch ngân hàng",{exact:true}).fill("BANK-001");
  await panel.getByRole("button",{name:"Xác nhận đã chuyển khoản",exact:true}).click({clickCount:2});
  await verify.getByLabel("Mật khẩu",{exact:true}).fill("staff-password-123");
  await verify.getByRole("button",{name:"Xác thực",exact:true}).click();
  await expect(panel).not.toBeVisible();
  expect(uploads).toBe(2); expect(payments).toBe(2);
  expect(uploadKeys[0]).toBeTruthy(); expect(uploadKeys[0]).toBe(uploadKeys[1]);
  expect(paymentKeys[0]).toBeTruthy(); expect(paymentKeys[0]).toBe(paymentKeys[1]);
});
