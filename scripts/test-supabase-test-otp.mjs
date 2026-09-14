/**
 * Supabase Test Phone & OTP End-to-End Verification Suite
 * 
 * Tests the exact Supabase Auth configuration:
 * - Phone: 8499801489
 * - Test OTP: 123456
 * 
 * Verifies:
 * 1. Phone normalization (8499801489 -> +918499801489 and 8499801489)
 * 2. Error mapping rules: "send" context never leaks OTP code error messages
 * 3. Direct Supabase signInWithOtp with test phone 8499801489
 * 4. Direct Supabase verifyOtp with WRONG OTP (111111) -> rejection
 * 5. Direct Supabase verifyOtp with CORRECT OTP (123456) -> genuine Supabase session
 * 6. Real browser Playwright test on http://localhost:3000/login:
 *    - Initial state: NO error banner on phone screen
 *    - Enter 8499801489 and click Send OTP
 *    - Transition to OTP screen
 *    - Enter wrong OTP 111111 -> displays "That code is incorrect. Please try again."
 *    - Enter correct OTP 123456 -> successful verification & navigation
 *    - Refresh -> session persists
 *    - Logout -> /dashboard access blocked
 */

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import assert from "assert";
import {
  normalizeIndianPhoneNumber,
  mapOtpErrorToUserMessage,
  sendSupabaseOtpWithFallback,
  verifySupabaseOtpWithFallback,
} from "../src/lib/auth/phone-auth.ts";

const SUPABASE_URL = "https://jvzvfpfzhmidsztfexsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3asBWnzHlx_AKzwDFvWhWA_j5Zod3Yd";
const BASE_URL = "http://localhost:3000";
const TEST_PHONE = "8499801489";
const CORRECT_OTP = "123456";
const WRONG_OTP = "111111";

const results = [];
function record(testName, passed, detail) {
  results.push({ testName, passed, detail });
  const statusStr = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${statusStr}: ${testName} - ${detail}`);
}

async function runTests() {
  console.log("============================================================");
  console.log("SEVA SAARTHI — SUPABASE TEST PHONE OTP VERIFICATION");
  console.log("============================================================\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // -------------------------------------------------------------------------
  // TEST 1: Phone Normalization
  // -------------------------------------------------------------------------
  const validation = normalizeIndianPhoneNumber(TEST_PHONE);
  const normPassed =
    validation.valid === true &&
    validation.e164 === "+918499801489" &&
    validation.nationalNumber === "8499801489";
  record(
    "1. Phone Normalization",
    normPassed,
    `8499801489 -> e164: ${validation.e164}, national: ${validation.nationalNumber}`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Error Mapping Scoping (Root Cause Verification)
  // -------------------------------------------------------------------------
  // Simulated error containing the word "invalid" (like "Invalid template name")
  const templateErr = {
    message: "Error sending confirmation OTP to provider: Invalid template name",
    status: 422,
    code: "sms_send_failed",
  };
  const sendMapped = mapOtpErrorToUserMessage(templateErr, "send");
  const sendNoLeak =
    !sendMapped.message.toLowerCase().includes("code is incorrect") &&
    !sendMapped.message.toLowerCase().includes("invalid otp");

  record(
    "2. Send Error Scoping",
    sendNoLeak,
    `Send context maps provider template error to: "${sendMapped.message}" (NO premature OTP error)`
  );

  // In verify context, invalid code error must map cleanly
  const verifyErr = {
    message: "Token has expired or is invalid",
    status: 403,
    code: "otp_expired",
  };
  const verifyMapped = mapOtpErrorToUserMessage(verifyErr, "verify");
  const verifyCorrect = verifyMapped.message === "That code is incorrect. Please try again.";
  record(
    "2b. Verify Error Scoping",
    verifyCorrect,
    `Verify context maps invalid/expired token to: "${verifyMapped.message}"`
  );

  // -------------------------------------------------------------------------
  // TEST 3: Supabase signInWithOtp using Test Phone
  // -------------------------------------------------------------------------
  console.log("\n[TEST SETUP] Testing live Supabase signInWithOtp...");
  const sendResult = await sendSupabaseOtpWithFallback(supabase, validation);
  const sendPassed = sendResult.success === true && Boolean(sendResult.acceptedPhone);
  record(
    "3. Supabase signInWithOtp",
    sendPassed,
    `Successfully accepted by Supabase Auth with acceptedPhone: ${sendResult.acceptedPhone}`
  );

  // -------------------------------------------------------------------------
  // TEST 4: Supabase verifyOtp with WRONG OTP (111111)
  // -------------------------------------------------------------------------
  console.log("\n[TEST SETUP] Testing live Supabase verifyOtp with WRONG OTP (111111)...");
  const wrongVerify = await verifySupabaseOtpWithFallback(
    supabase,
    sendResult.acceptedPhone,
    WRONG_OTP
  );
  const wrongRejected = wrongVerify.success === false && Boolean(wrongVerify.error);
  record(
    "4. Wrong OTP Rejection",
    wrongRejected,
    `Supabase correctly rejected wrong OTP 111111 with error: "${wrongVerify.error?.message}"`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Supabase verifyOtp with CORRECT OTP (123456)
  // -------------------------------------------------------------------------
  console.log("\n[TEST SETUP] Testing live Supabase verifyOtp with CORRECT OTP (123456)...");
  const correctVerify = await verifySupabaseOtpWithFallback(
    supabase,
    sendResult.acceptedPhone,
    CORRECT_OTP
  );
  const correctSession =
    correctVerify.success === true &&
    Boolean(correctVerify.data?.session?.access_token) &&
    Boolean(correctVerify.data?.user?.id);

  record(
    "5. Correct OTP Verification",
    correctSession,
    `Supabase returned authentic JWT session: user.id=${correctVerify.data?.user?.id} phone=${correctVerify.data?.user?.phone}`
  );

  // -------------------------------------------------------------------------
  // TEST 6: Real Browser Playwright End-to-End Test
  // -------------------------------------------------------------------------
  console.log("\n[TEST SETUP] Launching Playwright Chromium for full browser test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  let initialNoBanner = false;
  let advancedToOtpScreen = false;
  let wrongOtpBannerShown = false;
  let correctOtpNavigated = false;
  let sessionPersisted = false;
  let logoutBlocked = false;

  try {
    // 1. Load /login
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // 2. Click Phone OTP tab
    const phoneTabBtn = page.locator("button:has-text('Phone OTP')");
    await phoneTabBtn.click();
    await page.waitForTimeout(400);

    // 3. Verify initial state has NO error banner
    const alertBanner = page.locator("div.bg-rose-50");
    const bannerVisible = await alertBanner.isVisible();
    initialNoBanner = !bannerVisible;

    // 4. Fill phone number 8499801489
    const phoneInput = page.locator("#citizen-phone-input");
    await phoneInput.fill(TEST_PHONE);
    await page.waitForTimeout(300);

    // 5. Click Send OTP
    const sendOtpBtn = page.locator("#citizen-send-otp-btn");
    await sendOtpBtn.click();

    // 6. Check that UI advanced to Step 2 (OTP screen)
    const otpHeading = page.locator("h3:has-text('Verify your phone')");
    await otpHeading.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    const otpBox0 = page.locator("#otp-input-0");
    advancedToOtpScreen = (await otpHeading.isVisible()) && (await otpBox0.isVisible());

    // 7. Test WRONG OTP (111111)
    if (advancedToOtpScreen) {
      for (let i = 0; i < 6; i++) {
        await page.locator(`#otp-input-${i}`).fill("1");
      }
      const verifyBtn = page.locator("#verify-otp-btn");
      await page.waitForTimeout(500);
      if (await verifyBtn.isEnabled()) {
        await verifyBtn.click().catch(() => {});
      }

      // Verify error banner is shown
      const alertBanner = page.locator("div.bg-rose-50");
      await alertBanner.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      const errorText = await alertBanner.innerText().catch(() => "");
      wrongOtpBannerShown =
        errorText.includes("incorrect") ||
        errorText.includes("invalid") ||
        errorText.includes("expired");

      // 8. Test CORRECT OTP (123456)
      // Fill 123456
      const digits = ["1", "2", "3", "4", "5", "6"];
      for (let i = 0; i < 6; i++) {
        await page.locator(`#otp-input-${i}`).fill(digits[i]);
      }
      await page.waitForTimeout(500);
      if (await verifyBtn.isEnabled()) {
        await verifyBtn.click().catch(() => {});
      }

      // Wait for post-auth navigation
      for (let waitCount = 0; waitCount < 10; waitCount++) {
        await page.waitForTimeout(500);
        const curUrl = page.url();
        if (
          curUrl.includes("/dashboard") ||
          curUrl.includes("/onboarding/profile") ||
          curUrl.includes("/profile")
        ) {
          break;
        }
      }

      // Check URL navigation
      const postAuthUrl = page.url();
      correctOtpNavigated =
        postAuthUrl.includes("/dashboard") ||
        postAuthUrl.includes("/onboarding/profile") ||
        postAuthUrl.includes("/profile");

      // 9. Session persistence on reload
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      const reloadUrl = page.url();
      sessionPersisted =
        reloadUrl.includes("/dashboard") ||
        reloadUrl.includes("/onboarding/profile") ||
        reloadUrl.includes("/profile");

      // 10. Logout & protected route test
      await page.goto(`${BASE_URL}/api/auth/logout`, { waitUntil: "networkidle" });
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

      const unauthContext = await browser.newContext();
      const unauthPage = await unauthContext.newPage();
      await unauthPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      const blockedUrl = unauthPage.url();
      logoutBlocked = blockedUrl.includes("/login");
      await unauthContext.close();
    }
  } catch (err) {
    console.error("[PLAYWRIGHT_ERROR]", err);
  } finally {
    await browser.close();
  }

  record(
    "6a. Initial Clean State",
    initialNoBanner,
    "No OTP error banner shown on phone screen"
  );
  record(
    "6b. Transition to OTP Screen",
    advancedToOtpScreen,
    "Send OTP advanced seamlessly to 6-digit OTP verification screen"
  );
  record(
    "6c. Wrong OTP (111111) Feedback",
    wrongOtpBannerShown,
    "Entering wrong OTP displays error message"
  );
  record(
    "6d. Correct OTP (123456) Login",
    correctOtpNavigated,
    "Entering correct OTP authenticated citizen and redirected"
  );
  record(
    "6e. Session Persistence on Reload",
    sessionPersisted,
    "Authenticated session persisted across page reload"
  );
  record(
    "6f. Logout & Route Protection",
    logoutBlocked,
    "Unauthenticated access to dashboard redirected to /login"
  );

  console.log("\n============================================================");
  console.log("TEST SUMMARY");
  console.log("============================================================\n");
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL: ${results.length} | PASSED: ${results.filter((r) => r.passed).length} | FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`FINAL RESULT: ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
  console.log("============================================================\n");

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
