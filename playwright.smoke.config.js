// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const baseURL = process.env.CHRONOHAZE_SMOKE_BASE_URL || "http://127.0.0.1:4173/chronohaze/";
const ignoreHTTPSErrors =
  process.env.CHRONOHAZE_SMOKE_IGNORE_HTTPS_ERRORS === "1" ||
  /^https:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(baseURL);

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: /(?:runtime-smoke|structured-data)\.spec\.js$/,
  timeout: 45000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    ignoreHTTPSErrors,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "iphone13",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
