import { test, expect } from "@playwright/test";
import { openSidebar } from "../../helpers/sidebar";

test("admin menu keeps its scroll position after selecting a screen and reopening the mobile drawer", async ({page,isMobile}) => {
  await page.setViewportSize({width:isMobile?375:1440,height:667});
  await page.route("**/api/v1/**", async route => {
    const path=new URL(route.request().url()).pathname;
    const data=path.endsWith("/me")?{id:"admin",name:"Admin",role:"admin",csrfToken:"fixture"}:path.endsWith("/config")?{brand:"Hoàn Xu"}:[];
    await route.fulfill({json:{data,meta:{hasNext:false}}});
  });
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading",{name:"Đơn hàng & đối soát",exact:true})).toBeVisible();
  await openSidebar(page);
  const menu=page.locator(".side > .nav");
  const target=menu.getByRole("link",{name:"Thông báo",exact:true});
  await target.scrollIntoViewIfNeeded();
  const before=await menu.evaluate(node=>node.scrollTop);
  expect(before).toBeGreaterThan(0);
  await target.click();
  await expect(page).toHaveURL(/\/admin\/notifications$/);
  await expect(page.getByRole("heading",{name:"Thông báo",exact:true})).toBeVisible();
  await openSidebar(page);
  await expect.poll(()=>menu.evaluate(node=>node.scrollTop)).toBe(before);
  await expect(target).toHaveAttribute("aria-current","page");
});
