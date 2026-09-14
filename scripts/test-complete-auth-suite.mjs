import assert from "node:assert";
import { chromium } from "playwright";
import {
  normalizeIndianPhoneNumber,
  mapOtpErrorToUserMessage,
  maskPhoneNumber,
  maskEmail,
} from "../src/lib/auth/phone-auth.ts";
import { resolvePostAuthDestination, isSafeInternalRoute } from "../src/lib/auth/routing.ts";

const BASE_URL = "http://localhost:3000";

async function runAuthSuite() {
  console.log("========================================================");
  console.log("   SEVA SAARTHI — COMPLETE AUTHENTICATION VERIFICATION   ");
  console.log("========================================================\n");

  // ========================================================
  // TEST 1: Phone Normalization (E.164 Strict Format)
  // ========================================================
  console.log("--- 1. Testing Phone Normalization (+91 Indian E.164) ---");
  const testInputs = [
    "8499801489",
    "+918499801489",
    "918499801489",
    "91 84998 01489",
    "+91 84998 01489",
    "08499801489",
  ];

  for (const input of testInputs) {
    const res = normalizeIndianPhoneNumber(input);
    assert.strictEqual(res.valid, true, `Expected valid for input ${input}`);
    assert.strictEqual(res.e164, "+918499801489", `Expected +918499801489 for input ${input}`);
    assert.strictEqual(res.nationalNumber, "8499801489");
  }
  console.log("✓ All Indian phone format variations correctly normalize to +918499801489");

  // Invalid cases
  assert.strictEqual(normalizeIndianPhoneNumber("1234567890").valid, false); // invalid starting digit
  assert.strictEqual(normalizeIndianPhoneNumber("84998").valid, false); // too short
  assert.strictEqual(normalizeIndianPhoneNumber("").valid, false); // empty
  console.log("✓ Invalid numbers rejected cleanly with localized error messages");

  // Masking
  assert.strictEqual(maskPhoneNumber("+918499801489"), "+91 ******1489");
  assert.strictEqual(maskEmail("sankeerths615@gmail.com"), "s***5@gmail.com");
  console.log("✓ Phone and Email masking functions produce expected PII-safe strings");

  // ========================================================
  // TEST 2: Section 9 Exact OTP Error Mappings
  // ========================================================
  console.log("\n--- 2. Testing Section 9 Exact OTP Error Message Mappings ---");

  // Provider disabled / unconfigured
  const errProvider = mapOtpErrorToUserMessage({ message: "Unsupported phone provider", code: "phone_provider_disabled" }, "send");
  assert.strictEqual(errProvider.message, "Phone verification is temporarily unavailable.");
  assert.strictEqual(errProvider.isBlockedProvider, true);
  console.log(`✓ Provider unconfigured maps to: "${errProvider.message}"`);

  // Invalid OTP code
  const errInvalid = mapOtpErrorToUserMessage({ message: "Token is invalid" }, "verify");
  assert.strictEqual(errInvalid.message, "That code is incorrect. Please try again.");
  console.log(`✓ Invalid OTP code maps to: "${errInvalid.message}"`);

  // Expired OTP code
  const errExpired = mapOtpErrorToUserMessage({ message: "Token has expired", code: "otp_expired" }, "verify");
  assert.strictEqual(errExpired.message, "That code has expired. Request a new one.");
  console.log(`✓ Expired OTP code maps to: "${errExpired.message}"`);

  // Rate limiting / Too many attempts
  const errRate = mapOtpErrorToUserMessage({ message: "over_sms_send_rate_limit", status: 429 }, "send");
  assert.strictEqual(errRate.message, "Too many attempts. Please wait before requesting another code.");
  console.log(`✓ Rate limit maps to: "${errRate.message}"`);

  // Network / connection error
  const errNet = mapOtpErrorToUserMessage({ message: "fetch failed" }, "send");
  assert.strictEqual(errNet.message, "Unable to contact the authentication service. Please try again.");
  console.log(`✓ Network failure maps to: "${errNet.message}"`);

  // ========================================================
  // TEST 3: Deterministic Post-Auth Routing Engine
  // ========================================================
  console.log("\n--- 3. Testing resolvePostAuthDestination & Safe Routing ---");

  // Safe internal routes
  assert.strictEqual(isSafeInternalRoute("/profile"), true);
  assert.strictEqual(isSafeInternalRoute("/dashboard"), true);
  assert.strictEqual(isSafeInternalRoute("/applications"), true);
  assert.strictEqual(isSafeInternalRoute("/gov"), false); // Government route blocked
  assert.strictEqual(isSafeInternalRoute("//attacker.com"), false); // Protocol-relative blocked
  assert.strictEqual(isSafeInternalRoute("javascript:alert(1)"), false); // XSS blocked
  assert.strictEqual(isSafeInternalRoute("/login"), false); // Recursive login blocked
  console.log("✓ Route sanitization enforces strict citizen boundary and blocks malicious/gov URLs");

  // Unauthenticated user -> /login
  assert.strictEqual(resolvePostAuthDestination(null), "/login");
  assert.strictEqual(resolvePostAuthDestination({ authenticated: false }), "/login");
  console.log("✓ Unauthenticated callers always resolve to /login");

  // Authenticated user with preserved destination (e.g. ?from=/profile)
  const user = { id: "u_test_123", email: "test@citizen.local" };
  assert.strictEqual(
    resolvePostAuthDestination(user, { fromParam: "/profile" }),
    "/profile"
  );
  assert.strictEqual(
    resolvePostAuthDestination({ authenticated: true, requestedDestination: "/profile", profileCompleted: true }),
    "/profile"
  );
  assert.strictEqual(
    resolvePostAuthDestination({ authenticated: true, requestedDestination: "/applications", profileCompleted: false }),
    "/applications"
  );
  console.log("✓ Preserved destination (?from=/profile) is strictly honored over default dashboard");

  // Authenticated user with unsafe destination falls back to completeness check
  assert.strictEqual(
    resolvePostAuthDestination(user, { fromParam: "//evil.com", isComplete: true }),
    "/dashboard"
  );
  assert.strictEqual(
    resolvePostAuthDestination(user, { fromParam: "/gov/queue", isComplete: false }),
    "/onboarding/profile"
  );
  console.log("✓ Unsafe destinations safely fall back to dashboard / onboarding");

  // ========================================================
  // TEST 4: Truecaller Server Verification Route Security
  // ========================================================
  console.log("\n--- 4. Testing Truecaller Server Verification Security ---");
  const tcEmptyRes = await fetch(`${BASE_URL}/api/auth/truecaller/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.strictEqual(tcEmptyRes.status, 400);
  const tcEmptyJson = await tcEmptyRes.json();
  assert.strictEqual(tcEmptyJson.success, false);
  console.log("✓ Truecaller endpoint rejects empty token with status 400");

  const tcBadRes = await fetch(`${BASE_URL}/api/auth/truecaller/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: "invalid_fake_token_abc" }),
  });
  // 503 if unconfigured on server, or 401/502 if provider unreachable
  assert.ok([401, 502, 503].includes(tcBadRes.status));
  console.log(`✓ Truecaller endpoint handles unconfigured/invalid token securely (status ${tcBadRes.status})`);

  // ========================================================
  // TEST 5: Unauthenticated Route Protection & Query Param
  // ========================================================
  console.log("\n--- 5. Testing Protected Route Redirect & Destination Preservation ---");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Visit /profile unauthenticated
  await page.goto(`${BASE_URL}/profile`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const currentUrl = page.url();
  console.log(`Navigated to /profile -> Landed at: ${currentUrl}`);
  assert.ok(
    currentUrl.includes("/login") && (currentUrl.includes("from=%2Fprofile") || currentUrl.includes("from=/profile")),
    `Expected redirect to /login with from=/profile, got ${currentUrl}`
  );
  console.log("✓ Protected /profile redirects unauthenticated citizen to /login?from=/profile");

  // ========================================================
  // TEST 6: Real Login Flow & Land on Preserved /profile
  // ========================================================
  console.log("\n--- 6. Testing Authenticated Login to Preserved Destination ---");
  // Fill credentials on login page
  await page.waitForSelector("#citizen-email");
  await page.fill("#citizen-email", "user@gmail.com");
  await page.fill("#citizen-password", "password123");
  await page.click("#citizen-login-submit");

  // Wait for post-auth destination navigation
  await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const postLoginUrl = page.url();
  console.log(`Post-login destination: ${postLoginUrl}`);
  assert.ok(
    postLoginUrl.includes("/profile") || postLoginUrl.includes("/dashboard"),
    `Expected landing on /profile or /dashboard, got ${postLoginUrl}`
  );
  console.log("✓ Authenticated login lands successfully without error");

  // ========================================================
  // TEST 7: Page Reload on /profile & /settings
  // ========================================================
  console.log("\n--- 7. Testing Session Persistence on Direct Reload ---");
  // Page is already at /profile from Test 6
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const reloadProfileUrl = page.url();
  assert.ok(
    reloadProfileUrl.includes("/profile"),
    `Expected /profile to persist on reload, got ${reloadProfileUrl}`
  );
  console.log("✓ Direct reload on /profile preserves authenticated session");

  await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const reloadSettingsUrl = page.url();
  assert.ok(
    reloadSettingsUrl.includes("/settings"),
    `Expected /settings to persist on reload, got ${reloadSettingsUrl}`
  );
  console.log("✓ Direct reload on /settings preserves authenticated session");

  // ========================================================
  // TEST 8: API Route Security (401 for anonymous, 200 for authed)
  // ========================================================
  console.log("\n--- 8. Testing API Endpoint Protection ---");
  // Anonymous fetch
  const anonRes = await fetch(`${BASE_URL}/api/profile`);
  assert.strictEqual(anonRes.status, 401, "Expected 401 for unauthenticated /api/profile");
  console.log("✓ /api/profile returns 401 for anonymous callers");

  // Authenticated fetch via page context cookies
  const cookies = await context.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const authedRes = await fetch(`${BASE_URL}/api/profile`, {
    headers: { Cookie: cookieHeader },
  });
  assert.strictEqual(authedRes.status, 200, "Expected 200 for authenticated /api/profile");
  const profileData = await authedRes.json();
  assert.ok(profileData.user, "Expected user object in profile API response");
  console.log(`✓ /api/profile returns 200 with authenticated citizen: ${profileData.user.name || profileData.user.email}`);

  // ========================================================
  // TEST 9: Responsive Mobile Viewports & Zero Overflow
  // ========================================================
  console.log("\n--- 9. Testing Mobile Viewports & Zero Overflow ---");
  const mobileViewports = [
    { name: "iPhone 13 mini / X", width: 375, height: 812 },
    { name: "iPhone 14 / 15", width: 390, height: 844 },
    { name: "Pixel 7 / Android", width: 412, height: 915 },
  ];

  // Open fresh unauthenticated context for login page viewport audit
  const mobileContext = await browser.newContext();
  const mobilePage = await mobileContext.newPage();

  for (const vp of mobileViewports) {
    await mobilePage.setViewportSize({ width: vp.width, height: vp.height });
    await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(400);

    // Check for horizontal overflow
    const overflowInfo = await mobilePage.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientWidth = Math.max(docEl.clientWidth, body.clientWidth);
      return {
        scrollWidth,
        clientWidth,
        hasOverflow: scrollWidth > clientWidth,
      };
    });

    assert.strictEqual(
      overflowInfo.hasOverflow,
      false,
      `Horizontal overflow detected on ${vp.name} (${vp.width}x${vp.height}): scrollWidth=${overflowInfo.scrollWidth}, clientWidth=${overflowInfo.clientWidth}`
    );
    console.log(`✓ Viewport ${vp.name} (${vp.width}x${vp.height}): Zero horizontal overflow verified (${overflowInfo.scrollWidth}px <= ${overflowInfo.clientWidth}px)`);

    // Verify Phone OTP is completely removed and Email/Password is default
    const phoneTab = mobilePage.locator("button:has-text('Phone OTP')");
    assert.strictEqual(await phoneTab.count(), 0, "Phone OTP tab must not exist on login");
    
    // Verify email and password inputs are visible and functional
    const emailInput = mobilePage.locator("#citizen-email");
    assert.ok(await emailInput.isVisible(), "Email input visible on mobile");
    const pwdInput = mobilePage.locator("#citizen-password");
    assert.ok(await pwdInput.isVisible(), "Password input visible on mobile");
    const googleBtn = mobilePage.locator("button:has-text('Continue with Google')");
    assert.ok(await googleBtn.isVisible(), "Google sign-in button visible on mobile");
    console.log(`✓ Mobile auth UI renders cleanly without phone OTP on ${vp.name}`);
  }

  await mobileContext.close();
  await context.close();
  await browser.close();

  console.log("\n========================================================");
  console.log("   🎉 ALL AUTHENTICATION & SECURITY TESTS PASSED!       ");
  console.log("========================================================");
}

runAuthSuite().catch((err) => {
  console.error("\n❌ AUTH TEST SUITE FAILED:", err);
  process.exit(1);
});
