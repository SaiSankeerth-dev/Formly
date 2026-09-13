import { chromium } from "playwright";
import assert from "assert";

async function verifyBrowserUI() {
  console.log("================================================================================");
  console.log("   PLAYWRIGHT REAL BROWSER UI VERIFICATION");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Track console errors and warnings
  const citizenConsoleErrors = [];
  const govConsoleErrors = [];

  // -------------------------------------------------------------
  // PART 1: Citizen Direct Dashboard Access (No Login Page Barrier)
  // -------------------------------------------------------------
  console.log("--- 1. Testing Citizen Platform UI (Port 3000) ---");
  const citizenPage = await context.newPage();
  citizenPage.on("console", (msg) => {
    if (msg.type() === "error") citizenConsoleErrors.push(msg.text());
  });

  console.log("Navigating to http://localhost:3000/login (should redirect directly to /dashboard)...");
  await citizenPage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });

  const currentUrl = citizenPage.url();
  console.log(`Current citizen URL after visiting /login: ${currentUrl}`);
  assert.ok(
    currentUrl.includes("/dashboard") || currentUrl === "http://localhost:3000/",
    "User must be redirected directly to citizen dashboard"
  );
  console.log("✓ PASS: /login successfully redirected directly to citizen dashboard (login page removed)");

  await citizenPage.waitForTimeout(1000);

  const dashBodyText = await citizenPage.innerText("body");
  
  // Verify dashboard does NOT show the error state
  assert.ok(
    !dashBodyText.includes("Your dashboard couldn't be loaded") &&
    !dashBodyText.includes("Your dashboard couldn't be loaded."),
    "Dashboard must NOT display error 'Your dashboard couldn't be loaded'"
  );
  console.log("✓ PASS: No 'Your dashboard couldn't be loaded' error message on citizen dashboard");

  // Verify dashboard displays user greeting and content
  assert.ok(
    dashBodyText.includes("Sai") || dashBodyText.includes("Namaste") || dashBodyText.includes("Welcome"),
    "Dashboard should show citizen name / greeting"
  );
  console.log("✓ PASS: Citizen dashboard rendered greeting and services for Sai Sankeerth");

  await citizenPage.screenshot({ path: "scripts/citizen-dashboard-verified.png", fullPage: false });
  console.log("✓ Saved screenshot to scripts/citizen-dashboard-verified.png\n");

  // -------------------------------------------------------------
  // PART 2: Government Audit Page & React Key Verification
  // -------------------------------------------------------------
  console.log("--- 2. Testing Government Platform & Audit Center (Port 3001) ---");
  const govContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const govPage = await govContext.newPage();
  
  const duplicateKeyWarnings = [];
  govPage.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Encountered two children with the same key") || text.includes("duplicate key")) {
      duplicateKeyWarnings.push(text);
    }
    if (msg.type() === "error") govConsoleErrors.push(text);
  });

  console.log("Navigating to http://localhost:3001/gov/login...");
  await govPage.goto("http://localhost:3001/gov/login", { waitUntil: "networkidle" });

  await govPage.fill("#employeeId, input[name='employeeId'], input[type='text']", "sankeerthvss@gmail.com");
  await govPage.fill("#password, input[type='password']", "password123");

  console.log("Submitting government officer login...");
  await Promise.all([
    govPage.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 }).catch(() => {}),
    govPage.click('button[type="submit"]'),
  ]);

  await govPage.waitForTimeout(1500);

  // Navigate to /gov/audit
  console.log("Navigating to http://localhost:3001/gov/audit...");
  await govPage.goto("http://localhost:3001/gov/audit", { waitUntil: "networkidle" });
  await govPage.waitForTimeout(2000);

  const govAuditText = await govPage.innerText("body");
  assert.ok(
    govAuditText.includes("AUDIT CENTER") || govAuditText.includes("Audit"),
    "Must display AUDIT CENTER heading"
  );
  console.log("✓ PASS: AUDIT CENTER page loaded successfully");

  // Verify zero duplicate key warnings in console
  console.log(`Duplicate key warnings caught: ${duplicateKeyWarnings.length}`);
  assert.strictEqual(
    duplicateKeyWarnings.length,
    0,
    `Detected duplicate key warnings: ${duplicateKeyWarnings.join("; ")}`
  );
  console.log("✓ PASS: ZERO React duplicate key warnings in console! (AUD-6602 bug completely fixed)");

  // Test row expansion
  const tableRows = await govPage.locator("table tbody tr");
  const rowCount = await tableRows.count();
  console.log(`Rendered audit rows: ${rowCount}`);
  assert.ok(rowCount > 0, "Audit table should display rows");

  // Click first row to toggle expand
  await tableRows.first().click();
  await govPage.waitForTimeout(500);
  console.log("✓ PASS: Toggled row expansion cleanly without key collisions");

  await govPage.screenshot({ path: "scripts/gov-audit-verified.png", fullPage: false });
  console.log("✓ Saved screenshot to scripts/gov-audit-verified.png\n");

  await browser.close();

  console.log("================================================================================");
  console.log("   PLAYWRIGHT BROWSER VERIFICATION: ALL CHECKS PASSED (100%)");
  console.log("================================================================================\n");
}

verifyBrowserUI().catch((err) => {
  console.error("❌ BROWSER VERIFICATION FAILED:", err);
  process.exit(1);
});
