import { test, expect, type Page } from '@playwright/test';

async function wallet(page: Page) {
  await page.addInitScript(() => {
    const listeners: Record<string, Function[]> = {};
    (window as any).__walletCalls = [];
    (window as any).__walletEvent = (name: string, value: unknown) => listeners[name]?.forEach(fn => fn(value));
    (window as any).ethereum = {
      request: async ({ method }: { method: string }) => {
        (window as any).__walletCalls.push(method);
        if (method === 'eth_chainId') return '0x14a34';
        if (method === 'eth_getBalance') return '0x12b251b7e740000';
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return ['0x1111111111111111111111111111111111111111'];
        throw new Error(`Unexpected wallet operation ${method}`);
      },
      on: (name: string, fn: Function) => (listeners[name] ??= []).push(fn),
      removeListener: (name: string, fn: Function) => listeners[name] = (listeners[name] ?? []).filter(item => item !== fn)
    };
  });
}

test('ecosystem directory filters, searches, and opens internal apps', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Swaputer Ecosystem' })).toBeVisible();
  await expect(page.locator('.ecosystem-app-row')).toHaveCount(5);

  await page.locator('.ecosystem-filters').getByRole('button', { name: 'Wallet', exact: true }).click();
  await expect(page.locator('.ecosystem-app-row')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Wallet wallet\.swaputer\.xyz/ })).toBeVisible();

  await page.locator('.ecosystem-filters').getByRole('button', { name: 'All', exact: true }).click();
  await page.getByPlaceholder('Search').fill('terminal');
  await expect(page.locator('.ecosystem-app-row')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Terminal terminal\.swaputer\.xyz/ })).toBeVisible();

  await page.getByPlaceholder('Search').fill('');
  await page.getByRole('button', { name: /Minter minter\.swaputer\.xyz/ }).click();
  const panel = page.locator('.ecosystem-app-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Minter');
  await expect(page.getByLabel('Contract address')).toBeVisible();
  await panel.getByLabel('Close app').click();
  await expect(panel).toHaveCount(0);
});

test('wallet connection stays non-transactional and displays account chrome', async ({ page }) => {
  await wallet(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Wallet' }).click();
  await expect(page.locator('.ecosystem-account')).toContainText('0.0842');
  await expect(page.locator('.ecosystem-account')).toContainText('ETH');
  expect(await page.evaluate(() => (window as any).__walletCalls)).not.toContain('eth_sendTransaction');
});

test('external apps open their standalone products', async ({ page }) => {
  await page.context().route('http://127.0.0.1:4174/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Explore stub</title>'
  }));
  await page.context().route('http://127.0.0.1:4176/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Studio stub</title>'
  }));
  await page.goto('/');

  const explorePopup = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Explore explore\.swaputer\.xyz/ }).click();
  await expect.poll(async () => (await explorePopup).url()).toContain('127.0.0.1:4174');
  await (await explorePopup).close();

  const studioPopup = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Studio studio\.swaputer\.xyz/ }).click();
  await expect.poll(async () => (await studioPopup).url()).toContain('127.0.0.1:4176');
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
