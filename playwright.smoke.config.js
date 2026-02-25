// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const baseURL = process.env.CHRONOHAZE_SMOKE_BASE_URL || "http://127.0.0.1:4173/chronohaze/";

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: /runtime-smoke\.spec\.js$/,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
