import { test, expect } from '@playwright/test';

test('ecosystem directory filters, searches, and opens internal apps', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Swaputer Ecosystem' })).toBeVisible();
  await expect(page.locator('.ecosystem-app-row')).toHaveCount(4);

  await page.locator('.ecosystem-filters').getByRole('button', { name: 'Wallet', exact: true }).click();
  await expect(page.locator('.ecosystem-app-row')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Wallet Manage and transfer Swaputer assets/ })).toBeVisible();

  await page.locator('.ecosystem-filters').getByRole('button', { name: 'All', exact: true }).click();
  await page.getByPlaceholder('Search').fill('factory');
  await expect(page.locator('.ecosystem-app-row')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Factory Create and mint tokens on Swaputer/ })).toBeVisible();

  await page.getByPlaceholder('Search').fill('');
  await page.getByRole('button', { name: /Factory Create and mint tokens on Swaputer/ }).click();
  const panel = page.locator('.ecosystem-app-page');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Factory');
  await expect(page.getByLabel('Address')).toBeVisible();
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Ecosystem' }).click();
  await expect(panel).toHaveCount(0);
});

test('global header keeps wallet actions inside apps and exposes app submission', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.ecosystem-header').getByRole('button', { name: 'Connect Wallet' })).toHaveCount(0);
  await page.locator('.ecosystem-header').getByRole('button', { name: 'Submit app' }).click();
  await expect(page.getByRole('heading', { name: 'Submit an application' })).toBeVisible();
});

test('external apps open their standalone products', async ({ page }) => {
  await page.context().route('https://scan.swaputer.com/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Explore stub</title>'
  }));
  await page.context().route('https://studio.swaputer.com/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Studio stub</title>'
  }));
  await page.goto('/');

  const explorePopup = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Explore scan\.swaputer\.com/ }).click();
  await expect.poll(async () => (await explorePopup).url()).toContain('scan.swaputer.com');
  await (await explorePopup).close();

  const studioPopup = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Studio studio\.swaputer\.com/ }).click();
  await expect.poll(async () => (await studioPopup).url()).toContain('studio.swaputer.com');
  await (await studioPopup).close();
});

for (const width of [390, 320]) test(`mobile ${width}: directory fits without horizontal overflow`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Swaputer Ecosystem' })).toBeVisible();
  const pageSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(pageSize.width).toBe(pageSize.client);
  await expect(page.locator('.ecosystem-app-row').first()).toBeVisible();
});

for (const route of ['wallet', 'factory']) test(`mobile: ${route} workflow fits without horizontal overflow`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`/#/${route}`);
  await expect(page.getByRole('heading', { name: route === 'wallet' ? 'Wallet' : 'Factory', level: 1 })).toBeVisible();
  const pageSize = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(pageSize.width).toBe(pageSize.client);
  if (route === 'factory') {
    await page.getByRole('button', { name: /Create token/ }).click();
    await expect(page.getByRole('dialog', { name: 'Create token' })).toBeVisible();
  }
});
