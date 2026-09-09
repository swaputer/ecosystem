import { defineConfig } from '@playwright/test';

const testPort = 4275;

export default defineConfig({
  testDir: './test/browser', fullyParallel: true, retries: 0,
  use: { baseURL: `http://127.0.0.1:${testPort}`, viewport: { width: 1440, height: 960 }, launchOptions: process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}, screenshot: 'only-on-failure' },
  webServer: { command: `npm run dev -- --port ${testPort}`, url: `http://127.0.0.1:${testPort}`, reuseExistingServer: false }
});
