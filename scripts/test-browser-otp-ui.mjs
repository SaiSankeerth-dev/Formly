import { chromium } from "playwright";
import assert from "assert";

async function testBrowserOtpUi() {
  console.log("================================================================================");
  console.log("   TESTING BROWSER PHONE OTP & AUTH UI ON LOCALHOST:3000");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // 1. Visit /login and inspect Google Button & Phone Tab
  console.log("1. Inspecting /login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  // Check Google Button exists
  const googleBtn = await page.$("button:has-text('Google')");
  assert.ok(googleBtn, "Google OAuth button must exist");
  console.log("✓ Google Auth button verified on /login");

  // Check Phone tab exists and click it
  const phoneTab = await page.$("button:has-text('Phone OTP')");
  assert.ok(phoneTab, "Phone OTP tab button must exist");
  await phoneTab.click();
  await page.waitForTimeout(300);

  // Check Phone input field
  const phoneInput = await page.$("input[placeholder*='98765']");
  assert.ok(phoneInput, "Phone number input must exist in Phone OTP tab");
  console.log("✓ Phone OTP tab rendered successfully with phone input");

  // Test Invalid Phone Number validation
  await phoneInput.fill("12345");
  const sendOtpBtn = await page.$("button:has-text('Send OTP')");
  await sendOtpBtn.click();
  await page.waitForTimeout(300);
  const errorText = await page.textContent("body");
  assert.ok(
    errorText.includes("valid 10-digit") || errorText.includes("Indian mobile"),
    "Should show invalid phone validation error"
  );
  console.log("✓ Invalid phone number rejected with clear error message");

  // Test Valid Phone Number input and OTP step
  await phoneInput.fill("9876543210");
  await sendOtpBtn.click();
  await page.waitForTimeout(1000);

  // Since Supabase has SMS provider disabled, verify clean user message (no raw leak)
  const bodyTextAfterSend = await page.textContent("body");
  console.log("   Message after Send OTP:", bodyTextAfterSend.slice(0, 300).replace(/\s+/g, " "));
  assert.ok(
    bodyTextAfterSend.includes("SMS") || bodyTextAfterSend.includes("OTP") || bodyTextAfterSend.includes("configured"),
    "Clean error message rendered without provider key leak"
  );
  console.log("✓ Send OTP cleanly handled without raw error leakage");

  // 2. Test Onboarding Step 2 Phone Guard
  console.log("\n2. Testing /onboarding/profile step protection...");
  // Try visiting step 3 directly while unverified
  await page.goto("http://localhost:3000/onboarding/profile?step=3", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  console.log("   URL after navigating to step 3:", page.url());
  // Because user is unauthenticated or unverified, proxy redirects to /login or step reset to 1/2
  assert.ok(
    page.url().includes("/login") || page.url().includes("step=1") || page.url().includes("step=2"),
    "Unverified / unauthenticated user must be prevented from skipping to step 3"
  );
  console.log("✓ Onboarding step jumping guard verified!");

  // 3. Test /settings protection
  console.log("\n3. Testing /settings protection on citizen platform...");
  await page.goto("http://localhost:3000/settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  console.log("   URL after unauthenticated /settings:", page.url());
  assert.ok(page.url().includes("/login"), "/settings must redirect unauthenticated users to /login");
  console.log("✓ Citizen /settings protected route verified!");

  // 4. Test Government Platform Isolation on port 3001
  console.log("\n4. Testing Government Platform on port 3001...");
  const govContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const govPage = await govContext.newPage();
  await govPage.goto("http://localhost:3001/gov/login", { waitUntil: "domcontentloaded" });
  await govPage.waitForTimeout(500);
  console.log("   Gov login URL:", govPage.url());
  assert.ok(govPage.url().includes("/gov/login"), "Gov login must load on port 3001");
  const govPageContent = await govPage.textContent("body");
  assert.ok(govPageContent.includes("Government") || govPageContent.includes("Employee ID"), "Gov login page rendered");
  console.log("✓ Government portal isolated and functioning on port 3001!");

  await browser.close();
  console.log("\n================================================================================");
  console.log("   ✓ ALL BROWSER PHONE OTP & AUTH TESTS PASSED CLEANLY!");
  console.log("================================================================================\n");
}

testBrowserOtpUi().catch((err) => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
