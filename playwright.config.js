// @ts-check
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  reporter: "list",
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    stderr: "ignore",
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    // Os convidados estão em Portugal
    timezoneId: "Europe/Lisbon",
    locale: "pt-PT",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "telemovel", use: { ...devices["Pixel 7"] } },
  ],
});
