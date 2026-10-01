import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1',
    channel: 'chrome',
    trace: 'retain-on-failure'
  },
  reporter: [['list']]
});
