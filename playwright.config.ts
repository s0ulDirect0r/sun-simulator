import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for sun-simulator e2e tests
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially for predictable results
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker since simulation is resource-intensive
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
