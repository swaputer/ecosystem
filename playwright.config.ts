import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/browser', fullyParallel: true, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4175', viewport: { width: 1440, height: 960 }, launchOptions: process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:4175', reuseExistingServer: !process.env.CI }
});
