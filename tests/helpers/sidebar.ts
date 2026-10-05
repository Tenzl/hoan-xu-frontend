import type { Page } from "@playwright/test";

export async function openSidebar(page: Page) {
  if (!await page.locator(".side").isVisible())
    await page.getByRole("button", { name: /^(Thêm|More)$/ }).click();
}

export async function closeSidebar(page: Page) {
  const close = page.getByRole("button", { name: /^(Đóng điều hướng|Close navigation)$/ });
  if (await close.isVisible()) await close.click();
}

export async function switchLanguage(page: Page, language: "VI" | "EN") {
  await openSidebar(page);
  await page.getByRole("button", { name: language, exact: true }).click();
  await closeSidebar(page);
}
