import { test, expect, type Page } from '@playwright/test';

const userId = '11111111-1111-4111-8111-111111111111';
const orderId = '22222222-2222-4222-8222-222222222222';
async function fixture(page: Page, options: { state?: string; missing?: boolean; error?: boolean; permissions?: string[] } = {}) {
  let detailFailed = false;
  const status = options.state || 'approved';
  const unavailable = !!options.missing;
  const row = { id: orderId, userId, name: 'Nguyễn Thu Hà', channel: 'shopee', publisher: unavailable ? 'legacy-server' : 'Publisher', externalId: 'HX-20261007', lineId: 'LINE-2', productName: 'Tai nghe không dây', value: 1000000, commission: 100000, cashback: 60000, status, sourceStatus: 'approved', orderedAt: '2026-10-07T10:00:00+07:00', sharePercent: 60, tierCode: 'bronze', taxAmount: unavailable ? null : status === 'rejected' ? 0 : 5000, projectedProfit: unavailable ? null : status === 'rejected' ? 0 : 35000, profitStatus: unavailable ? 'unavailable' : status === 'pending' ? 'estimated' : status === 'rejected' ? 'excluded' : 'projected' };
  const calls: { path: string; method: string }[] = [];
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    calls.push({ path, method: request.method() });
    const reply = (data: unknown) => route.fulfill({ json: { data, meta: {} } });
    if (path === '/me') return reply({ id: 'admin', name: 'Admin', role: options.permissions ? 'staff' : 'admin', permissions: options.permissions, csrfToken: 'fixture-csrf' });
    if (path === '/config') return reply({ brand: 'Hoàn Xu' });
    if (path === '/notifications') return reply([]);
    if (path === '/admin/work-queues') return reply({pendingOrders:0,pendingWithdrawals:0,processingWithdrawals:0,pendingGifts:0});
    if (path === '/admin/dashboard') return reply({ commission: 100000, cashback: 60000, retained: 40000, taxAmount: unavailable ? null : 5000, projectedProfit: unavailable ? null : 35000, cashProfit: unavailable ? null : -55000, paid: 150000, profitUnavailableOrders: unavailable ? 1 : 0, pendingCommission: 0, pendingOrders: 0, users: 1, links: 1, pendingWithdrawals: 0, pendingGifts: 0 });
    if (path === '/admin/orders' || path === `/admin/users/${userId}/orders`) return reply([row]);
    if (path === `/admin/users/${userId}`) return reply({ id: userId, name: row.name, email: 'ha@example.com', role: 'customer', kind: 'new', available: 60000, held: 0, giftHeld: 0 });
    if (path === `/admin/orders/${orderId}` || path === `/admin/users/${userId}/orders/${orderId}`) {
      if (options.error && !detailFailed) { detailFailed = true; return route.fulfill({ status: 503, json: { error: { message: 'Không thể tải chi tiết đơn.' } } }); }
      return reply(row);
    }
    throw new Error(`Unexpected API ${path}`);
  });
  return calls;
}

test('order financial details use a popup with tax, projected profit and keyboard focus', async ({ page }) => {
  const calls = await fixture(page);
  await page.goto('/admin/orders');
  await expect(page.getByRole('columnheader', { name: 'Thuế 5%', exact: true })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Lợi nhuận dự kiến', exact: true })).toHaveCount(0);
  const open = page.getByRole('button', { name: 'Chi tiết', exact: true });
  await open.click();
  const popup = page.getByRole('dialog', { name: 'Chi tiết đơn hàng' });
  await expect(popup.getByText('HX-20261007', { exact: true })).toBeVisible();
  await expect(popup.getByText('Nguyễn Thu Hà', { exact: true })).toBeVisible();
  await expect(popup.getByText('35.000đ', { exact: true })).toBeVisible();
  await expect(popup.getByText('5.000đ', { exact: true })).toBeVisible();
  await expect(popup.getByText('60.000 Xu', { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('order-profit-popup.png') });
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(open).toBeFocused();
  expect(calls.every(call => call.method === 'GET')).toBeTruthy();
});

test('customer order detail retries errors and displays the same profit calculation', async ({ page }) => {
  await fixture(page, { error: true });
  await page.goto(`/admin/users/${userId}/orders`);
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  const popup = page.getByRole('dialog');
  await expect(popup.getByRole('alert')).toContainText('Không thể tải chi tiết đơn.');
  await popup.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(popup.getByText('35.000đ', { exact: true })).toBeVisible();
});

test('dashboard separates projected profit from actual cash paid and displays negative profit', async ({ page }) => {
  await fixture(page);
  await page.goto('/admin');
  const projected = page.locator('.stat').filter({ hasText: 'Lợi nhuận dự kiến' });
  const actual = page.locator('.stat').filter({ hasText: 'Lợi nhuận theo thực chi' });
  await expect(projected).toContainText('35.000đ');
  await expect(actual).toContainText('-55.000đ');
  await expect(page.getByText('Lợi nhuận theo thực chi chưa trừ Xu khách chưa rút.', { exact: true })).toBeVisible();
});

test('unknown historical commission never displays invented profit totals', async ({ page }) => {
  await fixture(page, { missing: true });
  await page.goto('/admin');
  await expect(page.locator('.stat').filter({ hasText: 'Lợi nhuận theo thực chi' })).toContainText('Chưa đủ dữ liệu');
  await page.goto('/admin/orders');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Chưa đủ dữ liệu');
});

for (const state of ['pending', 'rejected']) test(`${state} profit is clearly marked`, async ({ page }) => {
  await fixture(page, { state });
  await page.goto('/admin/orders');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(state === 'pending' ? 'Đơn chờ duyệt; lợi nhuận chỉ là dự kiến.' : 'Đơn bị từ chối không được tính vào lợi nhuận.');
});

test('popup fits 320px, supports dark mode and remains scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('hoanxu.theme', 'dark'));
  await fixture(page);
  await page.goto('/admin/orders');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  const popup = page.getByRole('dialog');
  await expect(popup).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(popup).toHaveCSS('background-color', 'rgb(25, 34, 29)');
  const size = await popup.boundingBox();
  expect(size!.x).toBeGreaterThanOrEqual(0);
  expect(size!.width).toBeLessThanOrEqual(320);
  expect(size!.height).toBeLessThanOrEqual(640);
  await popup.getByText('Lợi nhuận dự kiến', { exact: true }).scrollIntoViewIfNeeded();
  await expect(popup.getByText('35.000đ', { exact: true })).toBeVisible();
});

test('detail popup shows loading until the response arrives', async ({ page }) => {
  await fixture(page);
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/v1/admin/orders/${orderId}`, async route => { await ready; await route.fallback(); });
  await page.goto('/admin/orders');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  const popup = page.getByRole('dialog');
  try { await expect(popup.getByRole('status')).toContainText('Đang tải…'); }
  finally { release(); }
  await expect(popup.getByText('35.000đ', { exact: true })).toBeVisible();
});
