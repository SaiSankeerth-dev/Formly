import { chromium } from "playwright";
import assert from "assert";

async function testAllCitizenAndGovRoutes() {
  console.log("================================================================================");
  console.log("   TESTING ALL CITIZEN & GOVERNMENT ROUTES COMPREHENSIVELY");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Error on ${page.url()}]: ${msg.text()}`);
    }
  });

  // 1. Citizen Login
  console.log("1. Logging in as citizen...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill("#citizen-email", "user@gmail.com");
  await page.fill("#citizen-password", "password123");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.click("button[type='submit']"),
  ]);
  console.log("✓ Landed on dashboard:", page.url());

  // 2. Test each citizen route
  const citizenRoutes = [
    "/dashboard",
    "/discover",
    "/services",
    "/applications",
    "/documents",
    "/profile",
    "/settings",
    "/notifications",
    "/help",
  ];

  console.log("\n2. Testing all Citizen Routes:");
  for (const route of citizenRoutes) {
    const target = `http://localhost:3000${route}`;
    await page.goto(target, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const finalUrl = page.url();
    console.log(`   Route ${route.padEnd(16)} -> ${finalUrl}`);
    assert.strictEqual(finalUrl, target, `Route ${route} should open without unexpected redirect`);
  }

  // 3. Test Government Officer Flow on Government Platform (Port 3001)
  console.log("\n3. Testing Government Officer Routes (Port 3001):");
  const govContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const govPage = await govContext.newPage();

  await govPage.goto("http://localhost:3001/gov/login", { waitUntil: "networkidle" });
  await govPage.fill("#employeeId", "officer@gmail.com");
  await govPage.fill("#password", "1234567890");
  await Promise.all([
    govPage.waitForURL("**/gov/dashboard"),
    govPage.click("button[type='submit']"),
  ]);
  console.log("✓ Landed on Gov dashboard:", govPage.url());

  const govRoutes = [
    "/gov/dashboard",
    "/gov/queue",
    "/gov/applications",
    "/gov/audit",
    "/gov/settings",
  ];

  for (const route of govRoutes) {
    const target = `http://localhost:3001${route}`;
    await govPage.goto(target, { waitUntil: "networkidle" });
    await govPage.waitForTimeout(500);
    const finalUrl = govPage.url();
    console.log(`   Route ${route.padEnd(18)} -> ${finalUrl}`);
    assert.strictEqual(finalUrl, target, `Gov route ${route} should open without unexpected redirect`);
  }

  console.log("\nConsole errors collected across all pages:", consoleErrors);
  assert.strictEqual(consoleErrors.length, 0, "There should be 0 console errors");

  console.log("\n================================================================================");
  console.log("   ✓ ALL CITIZEN AND GOVERNMENT ROUTES VERIFIED WITH ZERO ERRORS!");
  console.log("================================================================================");

  await browser.close();
  await govContext.close();
}

testAllCitizenAndGovRoutes().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
