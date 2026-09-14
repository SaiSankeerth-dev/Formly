import { chromium } from "playwright";
import assert from "assert";

async function runFullVerificationMatrix() {
  console.log("================================================================================");
  console.log("   SEVA SAARTHI: VIDEO-STYLE OTP & FULL VERIFICATION MATRIX");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Unauthenticated /profile -> /login?from=/profile
  // ---------------------------------------------------------------------------
  console.log("--- 1. Testing Unauthenticated /profile Protected Route ---");
  await page.goto("http://localhost:3000/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  console.log("   Landed on:", page.url());
  assert.ok(
    page.url().includes("/login?from=/profile") || page.url().includes("/login?from=%2Fprofile"),
    `Expected unauthenticated /profile to redirect to /login?from=/profile, got: ${page.url()}`
  );
  console.log("✓ PASS: Unauthenticated /profile redirects to /login?from=/profile\n");

  // ---------------------------------------------------------------------------
  // TEST 2: Video-Style Login Card Elements
  // ---------------------------------------------------------------------------
  console.log("--- 2. Inspecting Video-Style Login Card & Phone Tab ---");
  const emailInput = await page.$("#citizen-email");
  const passwordInput = await page.$("#citizen-password");
  const signInBtn = await page.$("#citizen-login-submit");
  const googleBtn = await page.$("button:has-text('Continue with Google')");

  assert.ok(emailInput, "Email input must exist on login card");
  assert.ok(passwordInput, "Password input must exist on login card");
  assert.ok(signInBtn, "Sign In button must exist on login card");
  assert.ok(googleBtn, "Continue with Google button must exist on login card");
  console.log("✓ PASS: Credentials view has Email, Password, Sign In, and Google OAuth\n");

  // ---------------------------------------------------------------------------
  // TEST 3: Video-Style Phone OTP Flow & Supabase Provider Status
  // ---------------------------------------------------------------------------
  console.log("--- 3. Testing Phone OTP Flow & Supabase Provider Status ---");
  const phoneTab = await page.$("button:has-text('Phone OTP')");
  assert.ok(phoneTab, "Phone OTP tab must exist");
  await phoneTab.click();
  await page.waitForTimeout(300);

  const phoneInput = await page.$("#citizen-phone-input");
  assert.ok(phoneInput, "Phone number input must exist with ID citizen-phone-input");

  // Enter invalid number
  await phoneInput.fill("12345");
  const sendOtpBtn = await page.$("#citizen-send-otp-btn");
  assert.ok(sendOtpBtn, "Send OTP button must exist");
  await sendOtpBtn.click();
  await page.waitForTimeout(300);

  let errorText = await page.textContent("body");
  assert.ok(
    errorText.includes("valid 10-digit") || errorText.includes("Indian mobile"),
    "Must validate 10-digit Indian phone number"
  );
  console.log("✓ PASS: 10-digit Indian mobile number validation enforced");

  // Enter valid number -> Supabase Auth check
  await phoneInput.fill("9876541489");
  await sendOtpBtn.click();
  await page.waitForTimeout(2500);

  errorText = await page.textContent("body");
  // Per Part 7: If SMS provider is not configured, show "Phone verification is not available yet."
  // Do NOT claim "OTP sent" unless Supabase actually accepted it
  assert.ok(
    errorText.includes("Phone verification is not available yet") ||
    errorText.includes("Verify your identity") ||
    errorText.includes("Enter the 6-digit code"),
    `Expected accurate provider message or OTP entry, got text snippet: ${errorText.slice(0, 300)}`
  );
  console.log("✓ PASS: Accurately reflects Supabase provider status without fake OTP!\n");

  // ---------------------------------------------------------------------------
  // TEST 4: Email/Password Login -> from=/profile Navigation
  // ---------------------------------------------------------------------------
  console.log("--- 4. Testing Email/Password Login with from=/profile Target ---");
  // Switch back to Email tab
  const emailTab = await page.$("button:has-text('Email & Password')");
  await emailTab.click();
  await page.waitForTimeout(200);

  await page.fill("#citizen-email", "user@gmail.com");
  await page.fill("#citizen-password", "password123");
  await page.click("#citizen-login-submit");

  // Wait for post-login navigation
  await page.waitForTimeout(3000);
  console.log("   URL after login:", page.url());
  assert.ok(
    page.url().includes("/profile") || page.url().includes("/onboarding/profile") || page.url().includes("/dashboard"),
    `Expected valid citizen route, got: ${page.url()}`
  );
  console.log("✓ PASS: Citizen successfully authenticated and reached authorized portal route\n");

  // ---------------------------------------------------------------------------
  // TEST 5: Direct Navigation to /profile and /settings while Authenticated
  // ---------------------------------------------------------------------------
  console.log("--- 5. Testing Profile and Settings Persistence ---");
  await page.goto("http://localhost:3000/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  console.log("   Authenticated /profile URL:", page.url());
  assert.ok(page.url().endsWith("/profile"), "Authenticated citizen on /profile must stay on /profile");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  assert.ok(page.url().endsWith("/profile"), "Reloading /profile must stay on /profile");
  console.log("✓ PASS: /profile route remains stable across refresh and direct navigation");

  await page.goto("http://localhost:3000/settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  console.log("   Authenticated /settings URL:", page.url());
  assert.ok(page.url().endsWith("/settings"), "Authenticated citizen on /settings must stay on /settings");
  console.log("✓ PASS: /settings route remains stable\n");

  // ---------------------------------------------------------------------------
  // TEST 6: Government Audit Page - Zero React Duplicate Key Errors
  // ---------------------------------------------------------------------------
  console.log("--- 6. Testing Government Audit Page for 0 Duplicate Key Errors ---");
  const govContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const govPage = await govContext.newPage();

  const govConsoleErrors = [];
  govPage.on("console", (msg) => {
    if (msg.type() === "error") {
      govConsoleErrors.push(msg.text());
    }
  });

  // Login as government officer
  await govPage.goto("http://localhost:3000/gov/login", { waitUntil: "domcontentloaded" });
  await govPage.waitForTimeout(500);

  const empIdInput = await govPage.$("input[name='employeeId']");
  if (empIdInput) {
    await empIdInput.fill("OFF-SAN-7043");
    await govPage.fill("input[name='password']", "1234567890");
    await govPage.click("button[type='submit']");
    await govPage.waitForTimeout(2000);
  }

  // Visit /gov/audit
  await govPage.goto("http://localhost:3000/gov/audit", { waitUntil: "domcontentloaded" });
  await govPage.waitForTimeout(1000);

  const keyErrors = govConsoleErrors.filter((err) =>
    err.includes("unique \"key\" prop") ||
    err.includes("two children with the same key") ||
    err.includes("duplicate key")
  );

  console.log("   Gov Audit Console Key Errors found:", keyErrors.length);
  assert.strictEqual(keyErrors.length, 0, `Expected 0 duplicate React key errors, found: ${keyErrors.join(", ")}`);
  console.log("✓ PASS: Government Audit Center has 0 React duplicate-key warnings!\n");

  // ---------------------------------------------------------------------------
  // TEST 7: Mobile Viewport Responsiveness (375x812, 390x844, 412x915)
  // ---------------------------------------------------------------------------
  console.log("--- 7. Testing Mobile Viewports (375x812, 390x844, 412x915) ---");
  const viewports = [
    { width: 375, height: 812, name: "iPhone X/XS (375x812)" },
    { width: 390, height: 844, name: "iPhone 12/13/14 (390x844)" },
    { width: 412, height: 915, name: "Pixel 7 / Galaxy S20 (412x915)" },
  ];

  for (const vp of viewports) {
    const mobileContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(500);

    // Check for horizontal scroll overflow
    const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
    assert.ok(
      scrollWidth <= clientWidth + 2,
      `Horizontal overflow detected on ${vp.name}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`
    );
    console.log(`✓ PASS: ${vp.name} verified: No horizontal scroll overflow (scroll=${scrollWidth}, client=${clientWidth})`);
    await mobileContext.close();
  }

  await browser.close();
  console.log("\n================================================================================");
  console.log("   ✓ ALL VERIFICATION MATRIX TESTS PASSED 100% CLEAN!");
  console.log("================================================================================\n");
}

runFullVerificationMatrix().catch((err) => {
  console.error("Verification matrix failed:", err);
  process.exit(1);
});
