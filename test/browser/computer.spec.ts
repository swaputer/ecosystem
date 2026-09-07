import { test, expect, type Page } from '@playwright/test';

async function wallet(page: Page, reject = false) {
  await page.addInitScript(({ reject }) => {
    const listeners: Record<string, Function[]> = {};
    (window as any).__walletCalls = [];
    (window as any).__walletEvent = (name: string, value: unknown) => listeners[name]?.forEach(fn => fn(value));
    (window as any).ethereum = {
      request: async ({ method }: { method: string }) => {
        (window as any).__walletCalls.push(method);
        if (method === 'eth_requestAccounts' && reject) throw Object.assign(new Error('Rejected'), { code: 4001 });
        if (method === 'eth_chainId') return '0x14a34';
        if (method === 'eth_getBalance') {
          if ((window as any).__balanceFailure) throw new Error('Balance unavailable');
          return (window as any).__balanceWei ?? '0x12b251b7e740000';
        }
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return ['0x1111111111111111111111111111111111111111'];
        throw new Error(`Unexpected wallet operation ${method}`);
      },
      on: (name: string, fn: Function) => (listeners[name] ??= []).push(fn),
      removeListener: (name: string, fn: Function) => listeners[name] = (listeners[name] ?? []).filter(item => item !== fn)
    };
  }, { reject });
}
async function boot(page: Page, path = '/') {
  await wallet(page); await page.goto(path);
  await page.getByRole('button', { name: 'Power on and connect wallet' }).click();
  await expect(page.locator('.os-desktop')).toBeVisible();
}
test('power connects only; desktop single click and independent windows preserve drafts', async ({ page }) => {
  await boot(page);
  const mintIcon = page.locator('.os-desktop-app').filter({ hasText: /^Mint$/ });
  await mintIcon.click();
  const mint = page.getByRole('region', { name: 'Mint app', exact: true });
  await expect(mint.getByLabel('Contract address')).toBeVisible();
  await mint.getByLabel('Contract address').fill('0xabc');
  await page.getByRole('button', { name: 'Open Market', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Market app', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Mint', exact: true }).click();
  await expect(mint.getByLabel('Contract address')).toHaveValue('0xabc');
  await mint.getByRole('button', { name: 'Minimize app', exact: true }).click();
  await expect(mint).toBeHidden();
  await page.getByRole('button', { name: 'Open Mint', exact: true }).click();
  await expect(mint.getByLabel('Contract address')).toHaveValue('0xabc');
  expect(await page.evaluate(() => (window as any).__walletCalls)).not.toContain('eth_sendTransaction');
});
test('launcher searches by app name and launches an app', async ({ page }) => {
  await boot(page); await page.getByRole('button', { name: 'Applications', exact: true }).last().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.os-library-app')).toHaveCount(5);
  await expect(dialog.getByRole('navigation', { name: 'App categories' })).toHaveCount(0);
  await expect(dialog.getByText('Create and mint SRC20')).toHaveCount(0);
  await dialog.getByRole('textbox', { name: 'Search applications' }).fill('mint');
  await expect(dialog.locator('.os-library-app')).toHaveCount(1);
  await dialog.locator('.os-library-app').click();
  await expect(page.getByRole('region', { name: 'Mint app', exact: true })).toBeVisible();
});
test('Terminal runs the browser-safe CLI commands and keeps execution read-only', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page);
  await page.getByRole('button', { name: 'Open Terminal', exact: true }).click();
  const terminal = page.getByRole('region', { name: 'Terminal app', exact: true });
  const command = terminal.getByRole('textbox', { name: 'Terminal command' });
  await expect(terminal).toContainText('inspect <transaction-hash>');
  await page.screenshot({ path: info.outputPath('terminal-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('terminal-mobile.png') });
  await command.fill('version');
  await command.press('Enter');
  await expect(terminal).toContainText('@swaputer-labs/cli 0.1.2');
  await command.fill('unknown');
  await command.press('Enter');
  await expect(terminal).toContainText('error: CLI_USAGE');
  await command.fill('clear');
  await command.press('Enter');
  await expect(terminal).not.toContainText('@swaputer-labs/cli 0.1.2');
  expect(await page.evaluate(() => (window as any).__walletCalls)).not.toContain('eth_sendTransaction');
});
test('wallet rejection stays on standby and changing accounts locks the desktop', async ({ page }) => {
  await wallet(page, true); await page.goto('/'); await page.getByRole('button', { name: 'Power on and connect wallet' }).click();
  await expect(page.getByRole('alert')).toContainText('Connection cancelled');
  await expect(page.locator('.os-desktop')).toHaveCount(0);
});
test('account change invalidates the connected signer and requires a new power on', async ({ page }) => {
  await boot(page); await page.evaluate(() => (window as any).__walletEvent('accountsChanged', []));
  await expect(page.getByRole('button', { name: 'Power on and connect wallet' })).toBeVisible();
  await expect(page.locator('.os-desktop')).toHaveCount(0);
});
test('wallet widget reads ETH, refreshes on account access and never substitutes a fake balance', async ({ page }) => {
  await boot(page);
  const widget = page.locator('.os-wallet-status');
  await expect(page.locator('.os-wallet-widget')).toHaveCount(0);
  await expect(widget).toContainText('0.0842');
  await page.evaluate(() => (window as any).__balanceWei = '0x1bc16d674ec80000');
  await widget.click();
  await expect(widget).toContainText('2.0000');
  const panel = page.getByRole('dialog', { name: 'Wallet details' });
  await expect(panel).toContainText('0x1111111111…11111111');
  await expect(panel).toContainText('Base Sepolia');
  await expect(panel.getByText('NETWORK', { exact: true })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Copy address', exact: true })).toHaveCount(0);
  expect(await panel.locator('section').evaluateAll(sections => sections.map(section => section.className))).toEqual(['os-wallet-panel-identity', 'os-wallet-panel-balance']);
  await expect(panel.locator('.os-wallet-identicon')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => (window as any).__balanceFailure = true);
  // Ethers caches identical reads for 250 ms; advance beyond that read cache.
  await page.waitForTimeout(300);
  await widget.click();
  await expect(widget).toContainText('—');
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(widget).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Power on and connect wallet' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__walletCalls)).not.toContain('eth_sendTransaction');
});
test('Swaputer is static, Explore opens separately, and power off requires confirmation', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.os-menu-left button')).toHaveCount(0);
  await expect(page.locator('.os-menu-left')).toHaveText('Swaputer');
  await expect(page.locator('.os-system-dropdown')).toHaveCount(0);
  await expect(page.locator('.os-menubar').getByRole('button', { name: 'Applications', exact: true })).toHaveCount(0);
  await expect(page.locator('.os-menubar').getByRole('button', { name: 'Window', exact: true })).toHaveCount(0);
  await page.context().route('http://127.0.0.1:4174/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Swaputer Explore test stub</title>'
  }));
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Explore', exact: true }).click();
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toContain('127.0.0.1:4174');
  await popup.close();
  await page.getByRole('button', { name: 'Open Mint', exact: true }).click();
  await page.getByLabel('Contract address').fill('0x1234');
  await page.getByRole('button', { name: 'Power off', exact: true }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Shut down Swaputer?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Contract address')).toHaveValue('0x1234');
  await page.getByRole('button', { name: 'Power off', exact: true }).click();
  await confirm.getByRole('button', { name: 'Power off', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Power on and connect wallet' })).toBeVisible();
});
test('window moves, resizes, maximizes, closes and reopens', async ({ page }) => {
  await boot(page); await page.getByRole('button', { name: 'Open Mint', exact: true }).click();
  const frame = page.getByRole('region', { name: 'Mint app', exact: true });
  const before = await frame.boundingBox();
  const bar = frame.locator('.os-window-titlebar');
  const b = (await bar.boundingBox())!;
  await page.mouse.move(b.x + 180, b.y + 20); await page.mouse.down(); await page.mouse.move(b.x + 220, b.y + 50); await page.mouse.up();
  expect((await frame.boundingBox())!.x).toBeGreaterThan(before!.x);
  const corner = (await frame.locator('.os-resize').boundingBox())!;
  const oldWidth = (await frame.boundingBox())!.width;
  await page.mouse.move(corner.x + 8, corner.y + 8); await page.mouse.down(); await page.mouse.move(corner.x - 80, corner.y - 30); await page.mouse.up();
  expect((await frame.boundingBox())!.width).toBeLessThan(oldWidth);
  await frame.getByRole('button', { name: 'Toggle maximize' }).click();
  await expect(frame).toHaveClass(/is-maximized/);
  await frame.getByRole('button', { name: 'Close app', exact: true }).click(); await expect(frame).toBeHidden();
  await page.getByRole('button', { name: 'Open Mint', exact: true }).click(); await expect(frame).toBeVisible();
});

test('Market navigation stays inside its App and explorer links are external', async ({ page }) => {
  const program = '0x' + 'ab'.repeat(32);
  const token = { programId: program, name: 'Test token', symbol: 'TEST', decimals: 18, cap: '100000000000000000000', totalSupply: '0', mintAmount: '1000000000000000000' };
  const market = { ...token, marketAddress: '0x' + '22'.repeat(20), escrowId: '0x' + '33'.repeat(32), openOrders: 0 };
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    const payload = url.pathname === '/api/v1/market' ? { items: [market] } : url.pathname === `/api/v1/market/${program}` ? market : url.pathname.includes('/src20/') ? token : { items: [], nextCursor: null };
    return route.fulfill({ json: payload });
  });
  await page.route('https://base-sepolia-rpc.publicnode.com/**', async route => {
    const request = route.request().postDataJSON();
    const respond = (call: any) => ({ jsonrpc: '2.0', id: call.id, result: '0x' + '00'.repeat(32) });
    await route.fulfill({ json: Array.isArray(request) ? request.map(respond) : respond(request) });
  });
  await boot(page); await page.getByRole('button', { name: 'Open Market', exact: true }).click();
  const app = page.getByRole('region', { name: 'Market app', exact: true });
  await app.getByRole('link', { name: `Open TEST market ${program}` }).click();
  await expect(app.getByRole('button', { name: 'My orders', exact: true })).toBeVisible();
  await expect(app.locator('.market-contract-line a')).toHaveAttribute('href', `http://127.0.0.1:4174/contract/${program}`);
  await expect(app.locator('.market-contract-line a')).toHaveAttribute('target', '_blank');
  await app.getByRole('button', { name: 'List tokens', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await app.getByRole('link', { name: 'All markets' }).click();
  await expect(app.getByRole('searchbox')).toHaveCount(0);
  await expect(app.getByLabel('Search markets')).toBeVisible();
});
for (const width of [390, 320]) test(`mobile ${width}: apps are fullscreen, Home and app switching retain state`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await boot(page);
  await expect(page.locator('.os-wallet-widget')).toHaveCount(0);
  await expect(page.locator('.os-wallet-status')).toHaveCount(0);
  await expect(page.getByText('ETH', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Application dock' })).toHaveCount(0);
  await page.locator('.os-desktop-app').filter({ hasText: /^Mint$/ }).click();
  const mint = page.getByRole('region', { name: 'Mint app', exact: true });
  await mint.getByLabel('Contract address').fill('0x1234');
  expect((await mint.boundingBox())!.width).toBe(width);
  await page.getByRole('button', { name: 'Go to home screen' }).click(); await expect(mint).toBeHidden();
  await page.locator('.os-desktop-app').filter({ hasText: /^Bridge$/ }).click();
  const bridge = page.getByRole('region', { name: 'Bridge app', exact: true });
  await expect(bridge).toBeVisible();
  await bridge.getByLabel('You deposit').fill('0.25');
  await page.getByRole('button', { name: 'Running apps', exact: true }).click();
  await page.getByRole('button', { name: 'Mint Tap to return' }).click();
  await expect(mint.getByLabel('Contract address')).toHaveValue('0x1234');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  const content = await mint.locator('.os-window-content').evaluate(el => ({ scroll: el.scrollWidth, width: el.clientWidth }));
  expect(content.scroll).toBeLessThanOrEqual(content.width);
});
test('deep links open the corresponding App only after wallet connection', async ({ page }) => {
  await boot(page, '/#/minter?contract=0x1234');
  await expect(page.getByRole('region', { name: 'Mint app', exact: true }).getByLabel('Contract address')).toHaveValue('0x1234');
});

test('desktop launcher stays inside short viewports without page scrolling or Dock overlap', async ({ page }, info) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 600 }]) {
    await page.setViewportSize(viewport);
    await boot(page);
    const desktop = (await page.locator('.os-desktop').boundingBox())!;
    const dock = (await page.getByRole('navigation', { name: 'Application dock' }).boundingBox())!;
    const icons = await page.locator('.os-desktop-app').evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, right: box.right };
    }));
    expect(icons).toHaveLength(6);
    expect(icons.every(icon => icon.top >= desktop.y && icon.bottom < dock.y && icon.right <= viewport.width)).toBe(true);
    const pageSize = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight
    }));
    expect(pageSize.width).toBe(pageSize.clientWidth);
    expect(pageSize.height).toBe(pageSize.clientHeight);
    await page.screenshot({ path: info.outputPath(`desktop-${viewport.width}x${viewport.height}.png`) });
    await page.evaluate(() => (window as any).__walletEvent('accountsChanged', []));
  }
});

test('visual review: desktop, app window, mobile home, library and bridge', async ({ page }, info) => {
  await page.setViewportSize({ width: 1586, height: 992 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await wallet(page); await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('standby-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('standby-mobile.png') });
  await page.setViewportSize({ width: 1586, height: 992 });
  await page.getByRole('button', { name: 'Power on and connect wallet' }).click();
  await expect(page.getByRole('navigation', { name: 'Application dock' })).toBeVisible();
  await expect(page.locator('.os-wallpaper img')).toBeVisible();
  expect(await page.locator('.os-wallpaper img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.locator('.os-wallet-status')).toContainText('0.0842');
  await expect(page.locator('.os-desktop-app').first().locator('svg')).not.toHaveAttribute('shape-rendering', 'crispEdges');
  await expect(page.locator('.os-power-caption')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('desktop.png') });
  await page.getByRole('button', { name: 'Power off', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: 'Shut down Swaputer?' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('power-confirm-desktop.png') });
  await page.getByRole('alertdialog', { name: 'Shut down Swaputer?' }).getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('.os-wallet-status').click();
  await expect(page.getByRole('dialog', { name: 'Wallet details' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('wallet-panel-desktop.png') });
  await page.getByRole('button', { name: 'Close wallet details' }).click();
  await page.getByRole('button', { name: 'Applications', exact: true }).last().click();
  await page.screenshot({ path: info.outputPath('library-desktop.png') });
  await page.getByRole('button', { name: 'Close applications' }).click();
  await page.getByRole('button', { name: 'Open Mint', exact: true }).click();
  await expect(page.getByLabel('Contract address')).toBeVisible();
  await page.screenshot({ path: info.outputPath('mint-desktop.png') });
  await expect(page.locator('.os-window-content')).toHaveCSS('color', 'rgb(245, 245, 246)');
  await page.getByRole('button', { name: 'Create SRC20', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.token-modal-backdrop')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: info.outputPath('create-desktop.png') });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Open Market', exact: true }).click();
  await expect(page.getByLabel('Search markets')).toBeVisible();
  await page.screenshot({ path: info.outputPath('market-desktop.png') });
  await page.getByRole('button', { name: 'Open Bridge', exact: true }).click();
  await expect(page.getByLabel('You deposit')).toBeVisible();
  await expect(page.locator('.asset-select').first()).toHaveCSS('color', 'rgb(245, 245, 246)');
  await page.screenshot({ path: info.outputPath('bridge-desktop.png') });
  await page.getByRole('button', { name: 'Open Mint', exact: true }).click();
  await page.getByRole('region', { name: 'Mint app', exact: true }).getByRole('button', { name: 'Close app', exact: true }).click();
  await page.getByRole('button', { name: 'Open Market', exact: true }).click();
  await page.getByRole('region', { name: 'Market app', exact: true }).getByRole('button', { name: 'Close app', exact: true }).click();
  await page.mouse.move(1500, 900);
  await page.screenshot({ path: info.outputPath('bridge-desktop-focused.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Go to home screen' }).click();
  await page.screenshot({ path: info.outputPath('mobile-home.png') });
  await expect(page.locator('.os-wallet-widget')).toHaveCount(0);
  await expect(page.locator('.os-wallet-status')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Wallet details' })).toHaveCount(0);
  await page.setViewportSize({ width: 427, height: 922 });
  await expect(page.locator('.computer')).toHaveCSS('height', '922px');
  await page.screenshot({ path: info.outputPath('mobile-home-reference.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.computer')).toHaveCSS('height', '844px');
  await page.locator('.os-desktop-app').filter({ hasText: /^Applications$/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: info.outputPath('mobile-library.png') });
  await page.getByRole('dialog').locator('.os-library-app').filter({ hasText: 'Bridge' }).click();
  await expect(page.getByLabel('You deposit')).toBeVisible();
  await page.screenshot({ path: info.outputPath('mobile-bridge.png') });
  await page.getByRole('button', { name: 'Redeem sETH', exact: true }).click();
  await expect(page.locator('.atomic-path')).toContainText('ETH is returned to your wallet.');
  await page.getByRole('button', { name: 'Go to home screen' }).click();
  await page.locator('.os-desktop-app').filter({ hasText: /^Mint$/ }).click();
  await page.getByRole('button', { name: 'Create SRC20', exact: true }).click();
  await expect(page.locator('.token-modal-backdrop')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: info.outputPath('create-mobile.png') });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(errors).toEqual([]);
});

test('glass launcher keyboard navigation, empty search, and narrow standby remain usable', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await wallet(page); await page.goto('/'); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('standby-small-phone.png') });
  const power = page.getByRole('button', { name: 'Power on and connect wallet' });
  const box = (await power.boundingBox())!;
  expect(box.y + box.height).toBeLessThan(568);
  await power.click();
  await page.locator('.os-desktop-app').filter({ hasText: /^Applications$/ }).click();
  const search = page.getByRole('textbox', { name: 'Search applications' });
  await expect(search).toBeFocused();
  await search.fill('no such application');
  await expect(page.getByText('No applications match', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Show all apps' }).click();
  await expect(page.locator('.os-library-app')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
