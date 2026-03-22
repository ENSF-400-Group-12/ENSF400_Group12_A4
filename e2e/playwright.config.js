// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend');
const frontendDir = path.join(__dirname, '..', 'frontend');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:13000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm start',
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: '18080',
        FRONTEND_ORIGIN: 'http://localhost:13000,http://localhost:3000,http://localhost:3001',
      },
      url: 'http://localhost:18080/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm start',
      cwd: frontendDir,
      env: {
        ...process.env,
        PORT: '13000',
        BROWSER: 'none',
        REACT_APP_PROXY_TARGET: 'http://localhost:18080',
      },
      url: 'http://localhost:13000/',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
