import { chromium } from "playwright";

async function testLoginFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("1. Navigating to http://localhost:3000/login...");
  const loginRes = await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  console.log("Login Page HTTP Status:", loginRes.status());

  console.log("2. Filling Supabase credentials...");
  await page.fill("#citizen-email", "user@gmail.com");
  await page.fill("#citizen-password", "password123");
  
  console.log("3. Submitting login form...");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 15000 }),
    page.click("button[type='submit']"),
  ]);

  console.log("4. Successfully redirected to:", page.url());
  console.log("5. Waiting for dashboard content to load...");
  await page.waitForTimeout(3000);

  const screenshotPath = "C:/Users/V. Sai Sankeerth/.gemini/antigravity/brain/9d40b4eb-f3ad-4d85-8676-4d0e98854ddb/citizen_dashboard_loaded.png";
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log("Dashboard screenshot successfully saved to:", screenshotPath);

  await browser.close();
}

testLoginFlow().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
