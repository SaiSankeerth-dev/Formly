import { chromium } from "playwright";
import assert from "assert";

async function testProductionServer() {
  console.log("================================================================================");
  console.log("   TESTING COMPILED NEXT.JS PRODUCTION BUILD (NODE_ENV=production)");
  console.log("   URL: http://localhost:3005");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Error]: ${msg.text()}`);
    }
  });

  // 1. Login on Production Build
  console.log("1. Logging in on Production Server...");
  await page.goto("http://localhost:3005/login", { waitUntil: "networkidle" });
  await page.fill("#citizen-email", "sankeerths615@gmail.com");
  await page.fill("#citizen-password", "password123");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.click("button[type='submit']"),
  ]);
  console.log("✓ Landed on Production Dashboard:", page.url());
  assert.strictEqual(page.url(), "http://localhost:3005/dashboard");

  // 2. Click Profile Link
  console.log("\n2. Clicking Profile link in navigation...");
  const profileLink = page.locator("aside nav a[href='/profile']").first();
  await profileLink.click();
  await page.waitForTimeout(2000);
  console.log("URL after clicking Profile:", page.url());
  assert.strictEqual(page.url(), "http://localhost:3005/profile", "Must open /profile and NEVER redirect to /dashboard");

  // 3. Check /api/profile endpoint
  console.log("\n3. Testing /api/profile endpoint in production mode...");
  const apiRes = await page.evaluate(async () => {
    const res = await fetch("/api/profile");
    const data = await res.json();
    return { status: res.status, success: data.success, user: data.user, dataLength: data.data?.length };
  });
  console.log("Production /api/profile response:", apiRes);
  assert.strictEqual(apiRes.status, 200, "/api/profile MUST return HTTP 200 in production");
  assert.strictEqual(apiRes.success, true, "/api/profile success MUST be true");

  // 4. Test Direct Navigation to /profile
  console.log("\n4. Testing direct URL navigation to /profile in production...");
  await page.goto("http://localhost:3005/profile", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  console.log("Final URL after direct visit:", page.url());
  assert.strictEqual(page.url(), "http://localhost:3005/profile", "Direct visit to /profile must stay on /profile");

  // 5. Test Profile Refresh
  console.log("\n5. Testing refresh on /profile in production...");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  console.log("Final URL after refresh:", page.url());
  assert.strictEqual(page.url(), "http://localhost:3005/profile", "Refresh must stay on /profile");

  // 6. Test Mobile Viewport (Pixel 6: 412x915)
  console.log("\n6. Testing mobile viewport (Pixel 6: 412x915) on production build...");
  const mobileContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto("http://localhost:3005/login", { waitUntil: "networkidle" });
  await mobilePage.fill("#citizen-email", "sankeerths615@gmail.com");
  await mobilePage.fill("#citizen-password", "password123");
  await Promise.all([
    mobilePage.waitForURL("**/dashboard"),
    mobilePage.click("button[type='submit']"),
  ]);
  console.log("✓ Mobile landed on dashboard:", mobilePage.url());

  // Open mobile drawer and click Profile
  const hamburger = mobilePage.locator("header button[aria-label='Open navigation menu']");
  await hamburger.click();
  await mobilePage.waitForTimeout(500);

  const mobileProfileLink = mobilePage.locator("aside[role='dialog'] nav a[href='/profile']");
  await mobileProfileLink.click();
  await mobilePage.waitForTimeout(2000);
  console.log("Mobile URL after clicking Profile in drawer:", mobilePage.url());
  assert.strictEqual(mobilePage.url(), "http://localhost:3005/profile", "Mobile drawer must open /profile");

  console.log("\nConsole errors collected:", consoleErrors);
  assert.strictEqual(consoleErrors.length, 0, "Console errors must be 0");

  console.log("\n================================================================================");
  console.log("   ✓ ALL PRODUCTION BUILD VERIFICATIONS PASSED 100%!");
  console.log("================================================================================");

  await browser.close();
}

testProductionServer().catch((err) => {
  console.error("Production test failed:", err);
  process.exit(1);
});
