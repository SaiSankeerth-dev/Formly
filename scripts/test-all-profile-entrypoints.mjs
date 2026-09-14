import { chromium } from "playwright";

async function testAllEntrypoints() {
  console.log("================================================================================");
  console.log("   TESTING ALL CITIZEN PROFILE NAVIGATION ENTRY POINTS");
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

  // Login
  console.log("1. Logging in as citizen...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill("#citizen-email", "user@gmail.com");
  await page.fill("#citizen-password", "password123");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.click("button[type='submit']"),
  ]);
  console.log("✓ Landed on dashboard:", page.url());
  await page.waitForTimeout(1000);

  // ENTRYPOINT 1: Sidebar Profile link
  console.log("\n--- ENTRYPOINT 1: Sidebar Profile Link ---");
  const sidebarProfile = page.locator("aside nav a[href='/profile']").first();
  console.log("Sidebar link exists:", await sidebarProfile.count() > 0);
  console.log("Sidebar link href:", await sidebarProfile.getAttribute("href"));
  
  await sidebarProfile.click();
  await page.waitForTimeout(2000);
  console.log("URL after sidebar click:", page.url());
  if (page.url() !== "http://localhost:3000/profile") {
    console.error("❌ BUG DETECTED on Sidebar Profile: expected http://localhost:3000/profile, got:", page.url());
  } else {
    console.log("✓ SUCCESS: Opened /profile from sidebar");
  }

  // Go back to dashboard
  console.log("\nReturning to dashboard...");
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // ENTRYPOINT 2: Header User Menu -> My Profile
  console.log("\n--- ENTRYPOINT 2: Header User Menu -> My Profile ---");
  const avatarBtn = page.locator("header button:has(div:has-text('CU')), header button:has(div:has-text('SS')), header button:has(div:has-text('CZ')), header button:has(span:has-text('Sai'))").first();
  console.log("Header user pill found:", await avatarBtn.count() > 0);
  await avatarBtn.click();
  await page.waitForTimeout(500);

  const headerProfileLink = page.locator("a[href='/profile']:has-text('My Profile')").first();
  console.log("Header My Profile link visible:", await headerProfileLink.isVisible());
  await headerProfileLink.click();
  await page.waitForTimeout(2000);
  console.log("URL after header click:", page.url());
  if (page.url() !== "http://localhost:3000/profile") {
    console.error("❌ BUG DETECTED on Header User Menu: expected http://localhost:3000/profile, got:", page.url());
  } else {
    console.log("✓ SUCCESS: Opened /profile from header menu");
  }

  // Go back to dashboard
  console.log("\nReturning to dashboard...");
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // ENTRYPOINT 3: Direct URL navigation
  console.log("\n--- ENTRYPOINT 3: Direct URL Navigation to /profile ---");
  await page.goto("http://localhost:3000/profile", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  console.log("Direct URL final location:", page.url());
  if (page.url() !== "http://localhost:3000/profile") {
    console.error("❌ BUG DETECTED on Direct URL: expected http://localhost:3000/profile, got:", page.url());
  } else {
    console.log("✓ SUCCESS: Direct URL opened /profile");
  }

  // ENTRYPOINT 4: Mobile View
  console.log("\n--- ENTRYPOINT 4: Mobile Viewport (Pixel 6: 412x915) ---");
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const hamburger = page.locator("header button[aria-label='Open navigation menu']");
  console.log("Hamburger button visible:", await hamburger.isVisible());
  await hamburger.click();
  await page.waitForTimeout(500);

  const mobileProfile = page.locator("aside[role='dialog'] nav a[href='/profile']");
  console.log("Mobile drawer profile visible:", await mobileProfile.isVisible());
  await mobileProfile.click();
  await page.waitForTimeout(2000);
  console.log("URL after mobile click:", page.url());
  if (page.url() !== "http://localhost:3000/profile") {
    console.error("❌ BUG DETECTED on Mobile Drawer: expected http://localhost:3000/profile, got:", page.url());
  } else {
    console.log("✓ SUCCESS: Mobile drawer opened /profile");
  }

  console.log("\nAny console errors encountered:");
  console.log(consoleErrors);

  await browser.close();
}

testAllEntrypoints().catch(console.error);
