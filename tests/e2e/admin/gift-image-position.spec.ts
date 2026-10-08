import { test, expect } from "@playwright/test";

test("gift image crop can be dragged, adjusted by keyboard, saved and reopened", async ({ page, isMobile }) => {
  let position = 50;
  let role = "admin";
  const writes: any[] = [];
  const imageUrl = "https://example.com/portrait.svg";
  const gift = () => ({ id: "crop", name: "Voucher có ảnh", costXu: 12000, stock: 3, active: true, imageUrl, imagePositionY: position, description: "Điều kiện sử dụng quà." });
  await page.route(imageUrl, route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="800"><rect width="400" height="400" fill="#e1bc81"/><rect y="400" width="400" height="400" fill="#287a55"/></svg>' }));
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: role, role, name: "An", csrfToken: "csrf", permissions: ["gifts"] };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu" };
    if (path.endsWith("/wallet")) data = { available: 0, greenAvailable: 30000 };
    if (path.endsWith("/gifts")) data = [gift()];
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      writes.push(body); position = body.imagePositionY ?? position; data = gift();
    }
    await route.fulfill({ json: { data, meta: { hasNext: false } } });
  });
  if (isMobile) await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/admin/gifts");
  await page.getByRole("tab", { name: "Danh mục & tồn kho" }).click();
  await page.getByRole("button", { name: "Sửa", exact: true }).click();
  const slider = page.getByRole("slider", { name: /Vị trí ảnh theo chiều dọc/ });
  await expect(slider).toHaveValue("50");
  const frame = page.locator(".gift-image-editor .gift-picture-frame");
  await expect.poll(() => frame.locator("img").evaluate((el: HTMLImageElement) => el.complete && el.naturalHeight > 0)).toBe(true);
  await frame.scrollIntoViewIfNeeded();
  const rect = (await frame.boundingBox())!;
  if (isMobile) {
    const touch = await page.context().newCDPSession(page);
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, y: point.y - 40 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touch.detach();
  } else {
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 - 40, { steps: 5 });
    await page.mouse.up();
  }
  expect(Number(await slider.inputValue())).toBeGreaterThan(50);
  await page.getByRole("button", { name: "Về giữa", exact: true }).click();
  await expect(slider).toHaveValue("50");
  await slider.focus(); await page.keyboard.press("End");
  await expect(slider).toHaveValue("100");
  await expect(frame.locator("img")).toHaveCSS("object-position", "50% 100%");
  await page.locator(".gift-modal").screenshot({ path: test.info().outputPath("gift-image-editor.png") });
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.locator(".gift-modal")).toHaveCount(0);
  expect(writes).toEqual([{ imagePositionY: 100 }]);
  await page.getByRole("button", { name: "Sửa", exact: true }).click();
  await expect(slider).toHaveValue("100");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  role = "customer";
  await page.goto("/gift");
  const img = page.locator(".gift-shop .gift-picture-frame img");
  await expect(img).toHaveCSS("object-position", "50% 100%");
  const image = (await img.boundingBox())!;
  const area = (await page.locator(".gift-item-visual").boundingBox())!;
  expect(image).toEqual(area);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
