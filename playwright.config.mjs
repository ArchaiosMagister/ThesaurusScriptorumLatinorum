import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  timeout: 60_000,
  use: {
    browserName: 'webkit',
    baseURL: 'http://127.0.0.1:8123',
  },
  projects: [
    { name: 'iPad', use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'escritorio', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'iPhone', testMatch: '**/latin-context.spec.mjs', use: { ...devices['iPhone 13'] } }
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:8123/ThesaurusScriptorumLatinorum/',
    reuseExistingServer: !process.env.CI
  }
});
