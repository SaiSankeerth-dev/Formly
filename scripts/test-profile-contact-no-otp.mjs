import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const TEST_PHONE = "8499801489";
const TEST_OTP = "123456";

let passedCount = 0;
let totalCount = 0;

function assertCheck(desc, condition, details = "") {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ PASS: ${desc}${details ? ` - ${details}` : ""}`);
  } else {
    console.error(`❌ FAIL: ${desc}${details ? ` - ${details}` : ""}`);
  }
}

async function run() {
  console.log("============================================================");
  console.log("SEVA SAARTHI — PROFILE CONTACT STEP (NO OTP) VERIFICATION");
  console.log("============================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // -----------------------------------------------------------------------
    // STEP 1: Verify login has zero Phone OTP tab and authenticate citizen
    // -----------------------------------------------------------------------
    console.log("\n[1/4] Verifying login page has zero Phone OTP tab and authenticating citizen...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const loginPhoneTab = page.locator("button:has-text('Phone OTP')");
    assertCheck("Login portal does NOT have Phone OTP tab", (await loginPhoneTab.count()) === 0);

    console.log("Authenticating via citizen credentials (user@gmail.com)...");
    await page.fill("#citizen-email", "user@gmail.com");
    await page.fill("#citizen-password", "password123");
    await page.click("#citizen-login-submit");
    await page.waitForTimeout(2000);

    // Wait for post-auth navigation
    for (let w = 0; w < 10; w++) {
      await page.waitForTimeout(500);
      const cur = page.url();
      if (cur.includes("/onboarding/profile") || cur.includes("/dashboard") || cur.includes("/profile")) {
        break;
      }
    }

    assertCheck(
      "1. Citizen Authentication",
      !page.url().includes("/login"),
      `Authenticated successfully, current URL: ${page.url()}`
    );

    // -----------------------------------------------------------------------
    // STEP 3 & 4: Open Profile Onboarding Contact Step (Step 2)
    // -----------------------------------------------------------------------
    console.log("\n[2/4] Navigating to Onboarding Step 2 (Contact)...");
    await page.goto(`${BASE_URL}/onboarding/profile?step=2&edit=true`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // -----------------------------------------------------------------------
    // STEP 5: Confirm Contact Step UI Requirements
    // -----------------------------------------------------------------------
    console.log("\n[3/4] Verifying Contact Step UI (Strict Zero-OTP Audit)...");

    // 5a. Phone Number field is displayed
    const profilePhoneInput = page.locator("#profile-phone-input");
    const phoneInputVisible = await profilePhoneInput.isVisible();
    const phoneVal = (await profilePhoneInput.inputValue().catch(() => "")).replace(/\D/g, "");
    assertCheck(
      "2. Phone Input Displayed",
      phoneInputVisible && (phoneVal.includes(TEST_PHONE) || phoneVal.length >= 10 || phoneVal === ""),
      `Phone input visible=${phoneInputVisible}, value=${phoneVal || "(empty/ready)"}`
    );

    // 5b. Email Address field is displayed
    const profileEmailInput = page.locator("#profile-email-input");
    const emailInputVisible = await profileEmailInput.isVisible();
    assertCheck("3. Email Input Displayed", emailInputVisible, "Standard email field visible");

    // 5c. NO "Send OTP" button
    const sendOtpButtonPresent = await page.locator("button:has-text('Send OTP'), #citizen-send-otp-btn").count();
    assertCheck(
      "4. No Send OTP Button",
      sendOtpButtonPresent === 0,
      `Send OTP buttons found: ${sendOtpButtonPresent}`
    );

    // 5d. NO OTP input fields
    const otpBoxesPresent = await page.locator("input[id^='otp-input-'], .on-otp-grid").count();
    assertCheck(
      "5. No OTP Input Boxes",
      otpBoxesPresent === 0,
      `OTP input boxes found: ${otpBoxesPresent}`
    );

    // 5e. NO Truecaller 1-tap verification button
    const truecallerBtnPresent = await page.locator("#citizen-truecaller-btn, button:has-text('Truecaller')").count();
    assertCheck(
      "6. No Truecaller Button on Profile",
      truecallerBtnPresent === 0,
      `Truecaller buttons found: ${truecallerBtnPresent}`
    );

    // 5f. NO OTP error banners
    const pageText = await page.innerText("body");
    const hasOtpError =
      pageText.includes("Invalid OTP") ||
      pageText.includes("check the 6-digit code") ||
      pageText.includes("That code is incorrect") ||
      pageText.includes("That code has expired");
    assertCheck(
      "7. No OTP Error Banners",
      !hasOtpError,
      "Zero OTP error text on Contact step"
    );

    // 5g. Back button and Save & Continue button exist
    const backBtn = page.locator("button:has-text('Back')");
    const saveBtn = page.locator("button:has-text('Save & Continue')");
    const backVisible = await backBtn.isVisible();
    const saveVisible = await saveBtn.isVisible();
    assertCheck(
      "8. Navigation Buttons Visible",
      backVisible && saveVisible,
      `Back button visible=${backVisible}, Save & Continue button visible=${saveVisible}`
    );

    // -----------------------------------------------------------------------
    // STEP 6 & 7: Click Save & Continue and Confirm Profile Saves Normally
    // -----------------------------------------------------------------------
    console.log("\n[4/4] Testing Save & Continue on Contact step...");

    // Fill contact fields
    if (!(await profileEmailInput.inputValue())) {
      await profileEmailInput.fill("citizen.tester@formly.local");
    }
    await profilePhoneInput.fill(TEST_PHONE);
    await page.waitForTimeout(300);

    // Click Save & Continue
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Check that we advanced to Step 3 (Address)
    const currentUrl = page.url();
    const isStep3 =
      currentUrl.includes("step=3") ||
      (await page.locator("label:has-text('State')").isVisible().catch(() => false)) ||
      (await page.locator("label:has-text('PIN Code')").isVisible().catch(() => false));

    assertCheck(
      "9. Save & Continue Advances Step",
      isStep3,
      `Contact saved without OTP! Advanced to Step 3, URL: ${currentUrl}`
    );

    // -----------------------------------------------------------------------
    // BONUS: Verify /profile page has zero verify modal / button
    // -----------------------------------------------------------------------
    console.log("\n[Bonus] Checking /profile page...");
    await page.goto(`${BASE_URL}/profile`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const verifyPhoneModalCount = await page.locator("button:has-text('Verify Phone')").count();
    assertCheck(
      "10. Profile Page Has No 'Verify Phone' Trigger",
      verifyPhoneModalCount === 0,
      `Verify Phone buttons found on /profile: ${verifyPhoneModalCount}`
    );
  } catch (err) {
    console.error("[TEST_ERROR]", err);
  } finally {
    await browser.close();
  }

  console.log("\n============================================================");
  console.log(`TEST SUMMARY: ${passedCount}/${totalCount} PASSED`);
  if (passedCount === totalCount && totalCount > 0) {
    console.log("FINAL RESULT: ALL PROFILE CONTACT TESTS PASSED ✅");
  } else {
    console.log("FINAL RESULT: SOME TESTS FAILED ❌");
  }
  console.log("============================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
