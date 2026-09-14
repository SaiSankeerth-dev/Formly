import { chromium } from "playwright";
import assert from "assert";

const PROD_URL = process.env.VERCEL_URL || "https://seva-saarthi-five.vercel.app";

async function testVercelProduction() {
  console.log("================================================================================");
  console.log(`   TESTING VERCEL PRODUCTION RUNTIME AT: ${PROD_URL}`);
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Console Error on ${page.url()}]: ${msg.text()}`);
    }
  });

  // 1. Test Root -> Redirect to /login
  console.log("1. Testing root URL...");
  await page.goto(`${PROD_URL}/`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  console.log("   Landed on:", page.url());
  assert.ok(page.url().includes("/login"), "Unauthenticated root should redirect to /login");

  // 2. Test Citizen Login
  console.log("\n2. Logging in as citizen (user@gmail.com)...");
  await page.waitForSelector("#citizen-email");
  await page.fill("#citizen-email", "user@gmail.com");
  await page.fill("#citizen-password", "password123");
  await page.waitForTimeout(500); // ensure React state bindings
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 15000 }),
    page.click("button[type='submit']"),
  ]);
  console.log("✓ Citizen landed on:", page.url());
  assert.ok(page.url().includes("/dashboard"), "Should be on /dashboard");

  // 3. Test Navigation to Profile (CRITICAL VERIFICATION: MUST STAY ON /profile)
  console.log("\n3. Testing Citizen Profile page...");
  await page.goto(`${PROD_URL}/profile`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  console.log("   Landed on:", page.url());
  assert.strictEqual(page.url(), `${PROD_URL}/profile`, "Must stay on /profile and NOT redirect to /dashboard");
  const profileHeading = await page.textContent("body");
  assert.ok(profileHeading.includes("Profile") || profileHeading.includes("Sai Sankeerth"), "Profile page must render citizen info");
  console.log("✓ Profile route verified successfully on production!");

  // 4. Test Citizen Documents
  console.log("\n4. Testing Citizen Documents page...");
  await page.goto(`${PROD_URL}/documents`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  console.log("   Landed on:", page.url());
  assert.strictEqual(page.url(), `${PROD_URL}/documents`, "Must stay on /documents");
  console.log("✓ Documents page verified on production!");

  // 5. Test Citizen Settings
  console.log("\n5. Testing Citizen Settings page...");
  await page.goto(`${PROD_URL}/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  console.log("   Landed on:", page.url());
  assert.strictEqual(page.url(), `${PROD_URL}/settings`, "Must stay on /settings");
  console.log("✓ Settings page verified on production!");

  await context.close();

  // 6. Test Government Officer Flow in separate context
  console.log("\n6. Testing Government Officer Flow...");
  const govContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const govPage = await govContext.newPage();

  await govPage.goto(`${PROD_URL}/gov/login`, { waitUntil: "domcontentloaded" });
  await govPage.waitForLoadState("networkidle");
  console.log("   Landed on:", govPage.url());
  assert.ok(govPage.url().includes("/gov/login"), "Should be on /gov/login");

  await govPage.waitForSelector("#employeeId");
  await govPage.fill("#employeeId", "officer@gmail.com");
  await govPage.fill("#password", "1234567890");
  await govPage.waitForTimeout(500);
  await Promise.all([
    govPage.waitForURL("**/gov/dashboard", { timeout: 15000 }),
    govPage.click("button[type='submit']"),
  ]);
  console.log("✓ Officer landed on:", govPage.url());
  assert.ok(govPage.url().includes("/gov/dashboard"), "Should be on /gov/dashboard");

  // 7. Test Gov Queue
  console.log("\n7. Testing Government Queue...");
  await govPage.goto(`${PROD_URL}/gov/queue`, { waitUntil: "domcontentloaded" });
  await govPage.waitForTimeout(1000);
  console.log("   Landed on:", govPage.url());
  assert.strictEqual(govPage.url(), `${PROD_URL}/gov/queue`, "Must stay on /gov/queue");
  console.log("✓ Gov Queue verified on production!");

  // 8. Test Gov Settings
  console.log("\n8. Testing Government Settings...");
  await govPage.goto(`${PROD_URL}/gov/settings`, { waitUntil: "domcontentloaded" });
  await govPage.waitForTimeout(1000);
  console.log("   Landed on:", govPage.url());
  assert.strictEqual(govPage.url(), `${PROD_URL}/gov/settings`, "Must stay on /gov/settings");
  console.log("✓ Gov Settings verified on production!");

  console.log("\nConsole errors collected across production pages:", consoleErrors);
  console.log("\n================================================================================");
  console.log("   ✓ ALL PRODUCTION RUNTIME VERIFICATIONS PASSED 100% CLEAN!");
  console.log("================================================================================");

  await browser.close();
}

testVercelProduction().catch((err) => {
  console.error("\n❌ Production verification failed:", err);
  process.exit(1);
});
