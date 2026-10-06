import {test,expect} from "@playwright/test";
test("check-in and gifts use the spendable wallet, with no conversion form",async({page})=>{
 let available=30000;let checked=false;
 await page.route("**/api/v1/**",async route=>{
  const p=new URL(route.request().url()).pathname;let data:any=[];
  if(p.endsWith("/me"))data={id:"customer",name:"An",role:"customer",csrfToken:"csrf",permissions:[]};
  if(p.endsWith("/config"))data={brand:"Hoàn Xu"};
  if(p.endsWith("/checkins")){
   if(route.request().method()==="POST"){available+=300;checked=true;data={awardXu:300,available,streak:1,day:"2026-10-05"};}
   else data={available,unit:"xu",streak:checked?1:0,best:1,checkedIn:checked,days:[]};
  }
  if(p.endsWith("/gifts"))data=[{id:"g1",name:"Voucher Shopee 50K",channel:"shopee",costXu:10500,stock:1,active:true}];
  if(p.endsWith("/gift-redemptions")&&route.request().method()==="POST"){expect(route.request().postDataJSON()).toEqual({giftId:"g1"});available-=10500;data={id:"gift",costXu:10500,status:"pending"};}
  await route.fulfill({json:{data}});
 });
 await page.goto("/");await page.getByRole("button",{name:"Điểm danh +300 Xu"}).click();await expect.poll(()=>available).toBe(30300);await expect(page.getByRole("button",{name:"Đã điểm danh",exact:true})).toBeDisabled();await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow","1");await expect(page.locator(".checkin-milestones")).toContainText("9.000 Xu");
 await page.goto("/gift");await expect(page.getByRole("heading",{name:"Đổi xu thành tiền"})).toHaveCount(0);await expect(page.locator(".list")).toContainText("10500");await page.getByRole("button",{name:"Đổi voucher"}).click();await expect.poll(()=>available).toBe(19800);await expect(page.getByRole("link",{name:"Xem yêu cầu trong Lịch sử"})).toHaveAttribute("href","/history?tab=gifts");
});
