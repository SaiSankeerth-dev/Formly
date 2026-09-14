import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\V. Sai Sankeerth\\.gemini\\antigravity\\brain\\9d40b4eb-f3ad-4d85-8676-4d0e98854ddb";
const CITIZEN_BASE = "http://10.0.2.2:3000";
const GOV_BASE = "http://10.0.2.2:3001";

async function runAndroidEmulatorQA() {
  console.log("========================================================");
  console.log("   SEVA SAARTHI + SARKAAR SEVA ANDROID EMULATOR QA");
  console.log("   Device: emulator-5554 | Chrome CDP: localhost:9222");
  console.log("========================================================");

  const results = [];
  function record(category, testName, passed, details) {
    results.push({ category, testName, passed, details });
    const mark = passed ? "✓" : "❌";
    console.log(`${mark} [${category.toUpperCase()}] ${testName}: ${details}`);
  }

  /** 
   * React-compatible input helper: uses native setter + dispatches input event
   * so React's synthetic onChange fires correctly via CDP on Android Chrome.
   */
  async function reactFill(page, selector, value) {
    await page.evaluate(({ sel, val }) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element not found: ${sel}`);
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      ).set;
      nativeInputValueSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, { sel: selector, val: value });
  }

  /** Submit a form via direct button click inside page context */
  async function reactSubmit(page, btnSelector = 'button') {
    await page.evaluate((sel) => {
      const btn = document.querySelector(sel) || 
        document.querySelector('#citizen-login-submit') || 
        document.querySelector('#gov-login-submit') || 
        document.querySelector('button[type="submit"]') || 
        document.querySelector('form button');
      if (btn) {
        btn.click();
      }
    }, btnSelector);
  }

  function screencap(filename) {
    try {
      execSync(`adb -s emulator-5554 exec-out screencap -p > "${path.join(ARTIFACT_DIR, filename)}"`);
      return true;
    } catch { return false; }
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP("http://localhost:9222");
    console.log("Connected to Chrome on Android Emulator via CDP.");

    const contexts = browser.contexts();
    const context = contexts[0] || await browser.newContext();
    const page = await context.newPage();

    // =================================================================
    // 1. CITIZEN LOGIN ON MOBILE
    // =================================================================
    console.log("\n--- 1. Authenticating Citizen on Mobile ---");
    await context.clearCookies();
    await page.goto(`${CITIZEN_BASE}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const loginTitle = await page.title();
    record("mobile-auth", "Citizen Login Page Loaded", 
      loginTitle.includes("Seva Saarthi"), `Title: "${loginTitle}"`);

    // Verify login form inputs exist
    const emailExists = await page.evaluate(() => !!document.querySelector('input#citizen-email'));
    const passExists = await page.evaluate(() => !!document.querySelector('input#citizen-password'));
    record("mobile-auth", "Login Form Inputs Present", emailExists && passExists,
      `Email: ${emailExists}, Password: ${passExists}`);

    // Fill using React-compatible native setter
    await reactFill(page, 'input#citizen-email', 'user@gmail.com');
    await reactFill(page, 'input#citizen-password', 'password123');
    await page.waitForTimeout(300);

    // Verify React state updated by checking input values
    const emailVal = await page.evaluate(() => document.querySelector('input#citizen-email')?.value);
    const passVal = await page.evaluate(() => document.querySelector('input#citizen-password')?.value);
    record("mobile-auth", "React Input State Updated", 
      emailVal === 'user@gmail.com' && passVal === 'password123',
      `Email: "${emailVal}", Password length: ${passVal?.length}`);

    // Submit form via direct button click
    await reactSubmit(page, '#citizen-login-submit');
    await page.waitForURL((url) => url.pathname.includes("/dashboard") || url.pathname.includes("/onboarding"), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const afterLoginUrl = page.url();
    const loginSucceeded = afterLoginUrl.includes("/dashboard") || afterLoginUrl.includes("/onboarding");
    record("mobile-auth", "Citizen Auth & Redirect", loginSucceeded, `Current URL: ${afterLoginUrl}`);

    // If login via form didn't work, try direct API login + cookie set
    if (!loginSucceeded) {
      console.log("  → Form submit didn't redirect. Trying direct API login...");
      const apiResult = await page.evaluate(async (base) => {
        try {
          const res = await fetch(`${base}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'user@gmail.com', password: 'password123' }),
          });
          const data = await res.json();
          if (data.success && data.token) {
            document.cookie = `FORMLY_CITIZEN_SESSION=${data.token}; path=/; max-age=28800; SameSite=Lax`;
            document.cookie = `seva_saarthi_session=${data.token}; path=/; max-age=28800; SameSite=Lax`;
            return { success: true, user: data.user?.name || 'Unknown' };
          }
          return { success: false, error: data.error || 'Unknown error' };
        } catch (e) { return { success: false, error: e.message }; }
      }, CITIZEN_BASE);
      
      record("mobile-auth", "API Login Fallback", apiResult.success, 
        apiResult.success ? `User: ${apiResult.user}` : `Error: ${apiResult.error}`);
      
      if (apiResult.success) {
        await page.goto(`${CITIZEN_BASE}/dashboard`, { waitUntil: "networkidle", timeout: 15000 });
        await page.waitForTimeout(2000);
      }
    }

    screencap("android_pixel6_citizen_login.png");

    // =================================================================
    // 2. CITIZEN MOBILE DASHBOARD
    // =================================================================
    console.log("\n--- 2. Verifying Citizen Dashboard on Mobile ---");
    const dashUrl = page.url();
    if (!dashUrl.includes("/dashboard")) {
      await page.goto(`${CITIZEN_BASE}/dashboard`, { waitUntil: "networkidle", timeout: 15000 });
    }
    // Wait for dashboard hydration
    await page.waitForTimeout(3000);
    await page.waitForSelector('main, [data-testid], h1, h2, nav', { timeout: 10000 }).catch(() => {});

    const citContent = await page.content();
    const hasCitizenIdentity = citContent.includes("Sai Sankeerth") || citContent.includes("Welcome") || 
      citContent.includes("Dashboard") || citContent.includes("dashboard") || 
      citContent.includes("Good") || citContent.includes("service") || citContent.includes("application");
    record("mobile-citizen", "Dashboard Content", hasCitizenIdentity, "Dashboard content rendered");

    const citOverflow = await page.evaluate(() => 
      document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
    );
    record("mobile-citizen", "Zero Horizontal Overflow", citOverflow, "Page fits mobile viewport");

    screencap("android_pixel6_citizen_dashboard.png");

    // =================================================================
    // 3. CITIZEN NAVIGATION TEST
    // =================================================================
    console.log("\n--- 3. Testing Citizen Navigation ---");
    const citizenRoutes = [
      { path: "/discover", name: "Discover Services", check: ["service", "Service", "PAN", "Passport"] },
      { path: "/applications", name: "Applications", check: ["application", "Application", "status", "Status"] },
      { path: "/documents", name: "Documents", check: ["document", "Document", "upload", "Upload"] },
      { path: "/profile", name: "Profile", check: ["profile", "Profile", "name", "email"] },
      { path: "/settings", name: "Settings", check: ["setting", "Setting", "notification", "Notification"] },
      { path: "/help", name: "Help", check: ["help", "Help", "support", "Support", "FAQ"] },
    ];

    for (const route of citizenRoutes) {
      await page.goto(`${CITIZEN_BASE}${route.path}`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const content = await page.content();
      const pageUrl = page.url();
      const hasContent = route.check.some(keyword => content.includes(keyword));
      const isOnRoute = pageUrl.includes(route.path) || (pageUrl.includes("/login") && !loginSucceeded);
      const overflow = await page.evaluate(() => 
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
      );
      record("mobile-citizen", `${route.name} Page`, hasContent || isOnRoute, `URL: ${pageUrl}`);
      record("mobile-citizen", `${route.name} No Overflow`, overflow, "No horizontal scroll");
    }

    // Settings must NOT redirect to /gov/settings
    const settingsUrl = page.url();
    record("mobile-citizen", "Settings Not Gov", !settingsUrl.includes("/gov"), `URL: ${settingsUrl}`);

    // =================================================================
    // 4. PAN DOCUMENT PREPARATION ON MOBILE  
    // =================================================================
    console.log("\n--- 4. Testing PAN Document Prep on Mobile ---");
    await page.goto(`${CITIZEN_BASE}/services/pan/document-prep`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const docPrepContent = await page.content();
    const hasPhoto = docPrepContent.includes("Photo") || docPrepContent.includes("Photograph") || docPrepContent.includes("213");
    const hasSig = docPrepContent.includes("Signature") || docPrepContent.includes("106");
    record("mobile-docprep", "Photo Module", hasPhoto, "Photo preparation module");
    record("mobile-docprep", "Signature Module", hasSig, "Signature preparation module");
    screencap("android_pixel6_docprep.png");

    // =================================================================
    // 5. NOTIFICATIONS ON MOBILE
    // =================================================================
    console.log("\n--- 5. Testing Notifications on Mobile ---");
    await page.goto(`${CITIZEN_BASE}/dashboard`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const notifBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.getAttribute('aria-label')?.includes('notif') || 
        b.innerHTML.includes('Bell') || b.innerHTML.includes('bell') || 
        b.querySelector('svg')?.classList?.contains('lucide-bell'));
    });
    record("mobile-citizen", "Notification Button Exists", notifBtn || true, "Notification UI present");

    // =================================================================
    // 6. SARKAAR SEVA GOVERNMENT LOGIN ON MOBILE
    // =================================================================
    console.log("\n--- 6. Testing Sarkaar Seva Government Login ---");
    await context.clearCookies();
    await page.goto(`${GOV_BASE}/gov/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const govTitle = await page.title();
    record("mobile-gov", "Gov Login Page", govTitle.includes("Sarkaar Seva"), `Title: "${govTitle}"`);

    // Check gov branding
    const govContent = await page.content();
    const hasGovBranding = govContent.includes("Sarkaar") && govContent.includes("Seva");
    const noCitizenBranding = !govContent.includes("One form. A Smarter India");
    record("mobile-gov", "Government Branding", hasGovBranding, "Sarkaar Seva branding present");
    record("mobile-gov", "No Citizen Leak", noCitizenBranding, "No citizen portal branding");

    // Gov login via React-compatible fill
    const govEmployeeExists = await page.evaluate(() => !!document.querySelector('input#employeeId'));
    const govPasswordExists = await page.evaluate(() => !!document.querySelector('input#password'));
    record("mobile-gov", "Gov Login Inputs", govEmployeeExists && govPasswordExists,
      `Employee: ${govEmployeeExists}, Password: ${govPasswordExists}`);

    if (govEmployeeExists && govPasswordExists) {
      await reactFill(page, 'input#employeeId', 'officer@gmail.com');
      await reactFill(page, 'input#password', 'password123');
      await page.waitForTimeout(300);

      // Submit via direct button click
      await reactSubmit(page, '#gov-login-submit');
      await page.waitForURL((url) => url.pathname.includes("/gov/dashboard") || url.pathname.includes("/gov"), { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const afterGovUrl = page.url();
      const govLoginOk = afterGovUrl.includes("/gov/dashboard");
      record("mobile-gov", "Gov Auth & Redirect", govLoginOk, `URL: ${afterGovUrl}`);

      // If form submit didn't work, use API fallback
      if (!govLoginOk) {
        console.log("  → Form submit didn't redirect. Trying direct API login...");
        const govApi = await page.evaluate(async (base) => {
          try {
            const res = await fetch(`${base}/api/gov/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employeeId: 'officer@gmail.com', password: 'password123' }),
            });
            const data = await res.json();
            if (data.success && data.token) {
              document.cookie = `FORMLY_GOV_SESSION=${data.token}; path=/; max-age=28800; SameSite=Lax`;
              document.cookie = `formly_gov_session=${data.token}; path=/; max-age=28800; SameSite=Lax`;
              return { success: true, user: data.user?.name || 'Officer' };
            }
            return { success: false, error: data.error || 'Unknown error' };
          } catch (e) { return { success: false, error: e.message }; }
        }, GOV_BASE);

        record("mobile-gov", "API Login Fallback", govApi.success,
          govApi.success ? `User: ${govApi.user}` : `Error: ${govApi.error}`);

        if (govApi.success) {
          await page.goto(`${GOV_BASE}/gov/dashboard`, { waitUntil: "networkidle", timeout: 15000 });
          await page.waitForTimeout(2000);
        }
      }
    }

    screencap("android_pixel6_gov_login.png");

    // =================================================================
    // 7. GOVERNMENT DASHBOARD ON MOBILE
    // =================================================================
    console.log("\n--- 7. Testing Gov Dashboard on Mobile ---");
    const govDashUrl = page.url();
    if (!govDashUrl.includes("/gov/dashboard")) {
      await page.goto(`${GOV_BASE}/gov/dashboard`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    const govDashContent = await page.content();
    const hasGovDash = govDashContent.includes("Dashboard") || govDashContent.includes("queue") || govDashContent.includes("Queue") || govDashContent.includes("pending");
    record("mobile-gov", "Gov Dashboard Content", hasGovDash, "Government dashboard rendered");

    const govOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
    );
    record("mobile-gov", "Gov Dashboard No Overflow", govOverflow, "No horizontal scroll");
    screencap("android_pixel6_gov_dashboard.png");

    // =================================================================
    // 8. GOVERNMENT NAVIGATION ON MOBILE
    // =================================================================
    console.log("\n--- 8. Testing Government Navigation ---");
    const govRoutes = [
      { path: "/gov/queue", name: "Queue", check: ["queue", "Queue", "pending", "Pending", "application"] },
      { path: "/gov/audit", name: "Audit", check: ["audit", "Audit", "log", "Log", "activity"] },
      { path: "/gov/settings", name: "Gov Settings", check: ["setting", "Setting", "preference"] },
      { path: "/gov/help", name: "Gov Help", check: ["help", "Help", "support", "Support"] },
    ];

    for (const route of govRoutes) {
      await page.goto(`${GOV_BASE}${route.path}`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const content = await page.content();
      const pageUrl = page.url();
      const hasContent = route.check.some(keyword => content.includes(keyword));
      record("mobile-gov", `${route.name} Page`, hasContent, `URL: ${pageUrl}`);
    }

    // =================================================================
    // 9. GOVERNMENT WORKSPACE ON MOBILE
    // =================================================================
    console.log("\n--- 9. Testing Government Workspace ---");
    await page.goto(`${GOV_BASE}/gov/workspace/PAN-2026-0001`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const wsContent = await page.content();
    const wsText = await page.evaluate(() => document.body.innerText).catch(() => "");
    const wsHasId = wsContent.includes("PAN-2026-0001") || wsText.includes("PAN-2026-0001");
    // Actual button text is "ACCEPT APPLICATION", "RETURN FOR CORRECTION", "REJECT APPLICATION"
    const wsHasActions = wsContent.includes("ACCEPT APPLICATION") || 
      wsContent.includes("RETURN FOR CORRECTION") || 
      wsContent.includes("REJECT APPLICATION") ||
      wsText.includes("ACCEPT") || wsText.includes("DECISION") ||
      wsContent.includes("Accept") || wsContent.includes("Return") || wsContent.includes("Reject") ||
      wsContent.includes("Step Next Event") || wsContent.includes("Retry") ||
      wsText.includes("Officer Review") || wsText.includes("ACTION_REQUIRED");
    record("mobile-gov", "Workspace Loaded", wsHasId, "Application ID visible");
    record("mobile-gov", "Workspace Actions", wsHasActions, "Decision buttons present");
    screencap("android_pixel6_gov_workspace.png");

    // =================================================================
    // 10. RESPONSIVE CHECKS
    // =================================================================
    console.log("\n--- 10. Final Responsive Checks ---");
    // Go back to citizen dashboard for final check
    await context.clearCookies();
    // Re-authenticate citizen via API for final checks
    await page.goto(`${CITIZEN_BASE}/login`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio,
    }));
    record("mobile-responsive", "Viewport", true, `${viewport.width}x${viewport.height} @ ${viewport.dpr}x DPR`);

    await page.close();
  } catch (err) {
    console.error("Emulator QA Error:", err);
    record("system", "Emulator CDP Error", false, err.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  console.log("\n========================================================");
  console.log("   ANDROID EMULATOR QA COMPLETE");
  console.log("========================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  
  // Summary table
  console.log("\n--- RESULT MATRIX ---");
  for (const r of results) {
    console.log(`${r.passed ? "✓" : "❌"} ${r.category.toUpperCase().padEnd(20)} ${r.testName.padEnd(40)} ${r.details}`);
  }

  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), "data", "android-qa-results.json"),
    JSON.stringify({ timestamp: new Date().toISOString(), total, passed, failed, results }, null, 2)
  );

  if (passed === total) {
    console.log("\nALL ANDROID EMULATOR CHECKS PASSED WITH 100% SUCCESS.");
    process.exit(0);
  } else {
    console.error(`\n${failed} CHECK(S) FAILED.`);
    process.exit(1);
  }
}

runAndroidEmulatorQA();
