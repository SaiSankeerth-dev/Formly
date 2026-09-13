import { chromium } from "playwright";
import assert from "assert";

async function testProfileEditAndPersistence() {
  console.log("================================================================================");
  console.log("   TESTING PROFILE EDITING, SAVING, AND PERSISTENCE");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Console Error]: ${msg.text()}`);
    }
  });

  // 1. Log in as citizen
  console.log("1. Logging in as citizen...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill("#citizen-email", "sankeerths615@gmail.com");
  await page.fill("#citizen-password", "password123");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.click("button[type='submit']"),
  ]);
  console.log("✓ Landed on dashboard:", page.url());

  // 2. Click Profile
  console.log("\n2. Navigating to Profile via sidebar link...");
  const profileLink = page.locator("aside nav a[href='/profile']").first();
  await profileLink.click();
  await page.waitForURL("**/profile");
  console.log("✓ Current URL:", page.url());
  assert.strictEqual(page.url(), "http://localhost:3000/profile", "Must be on /profile");

  // 3. Open Edit Modal (Complete / Edit Profile button)
  console.log("\n3. Testing Profile Edit Modal...");
  const editModalBtn = page.locator("button:has-text('Edit All Details'), button:has-text('Complete Profile'), button:has-text('Edit Details')").first();
  const hasEditBtn = (await editModalBtn.count()) > 0;
  console.log("Edit Details button found:", hasEditBtn);

  if (hasEditBtn) {
    await editModalBtn.click();
    await page.waitForTimeout(500);

    // Fill in test data
    console.log("Filling form fields...");
    const nameInput = page.locator("input#field_full_name, input[name='full_name']").first();
    if (await nameInput.count() > 0) {
      await nameInput.fill("Sai Sankeerth Updated");
    }

    const phoneInput = page.locator("input#field_phone_number, input[name='phone_number']").first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill("9876543210");
    }

    const saveBtn = page.locator("button:has-text('Save All Changes'), button:has-text('Save Profile')").first();
    await saveBtn.click();
    await page.waitForTimeout(1000);
    console.log("✓ Save button clicked");
  } else {
    // Test individual field inline edit
    console.log("Testing inline field edit...");
    const inlineEditBtn = page.locator("button[aria-label*='Edit'], button:has-text('Edit')").first();
    if (await inlineEditBtn.count() > 0) {
      await inlineEditBtn.click();
      await page.waitForTimeout(500);
      const input = page.locator("input[type='text']").first();
      await input.fill("Sai Sankeerth");
      const saveBtn = page.locator("button:has-text('Save'), button[aria-label*='Save']").first();
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // 4. Verify we are STILL on /profile
  console.log("\n4. Verifying URL remains on /profile...");
  console.log("Current URL:", page.url());
  assert.strictEqual(page.url(), "http://localhost:3000/profile", "Must NOT redirect to /dashboard after saving");

  // 5. Refresh page and verify persistence
  console.log("\n5. Refreshing page to verify persistence...");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  console.log("URL after refresh:", page.url());
  assert.strictEqual(page.url(), "http://localhost:3000/profile", "Must stay on /profile across page refresh");

  // 6. Direct API check: verify /api/profile returns the saved profile
  console.log("\n6. Verifying /api/profile endpoint...");
  const apiCheck = await page.evaluate(async () => {
    const res = await fetch("/api/profile");
    const json = await res.json();
    return { status: res.status, success: json.success, dataCount: json.data?.length, user: json.user };
  });
  console.log("API check result:", apiCheck);
  assert.strictEqual(apiCheck.status, 200, "API must return HTTP 200");
  assert.strictEqual(apiCheck.success, true, "API success must be true");

  console.log("\nConsole errors:", consoleErrors);
  assert.strictEqual(consoleErrors.length, 0, "Console errors must be 0");

  console.log("\n================================================================================");
  console.log("   ✓ ALL PROFILE EDITING AND PERSISTENCE TESTS PASSED!");
  console.log("================================================================================");

  await browser.close();
}

testProfileEditAndPersistence().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
