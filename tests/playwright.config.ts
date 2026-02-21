import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for CRM system tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL for frontend tests */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox needs more time for loading
        actionTimeout: 15000,
        navigationTimeout: 30000,
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* API Tests */
    {
      name: 'api',
      testDir: './api',
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
  ],

  /* Run local dev servers before starting the tests */
  webServer: [
    {
      command: 'cd ../CRM_backend && npm run dev',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd ../CRM_frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
