import { chromium } from "playwright";
import assert from "assert";

async function runCleanBrowserTestSuite() {
  console.log("================================================================================");
  console.log("   SEVA SAARTHI: CLEAN BROWSER OAUTH & SESSION INTEGRATION TEST SUITE");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });

  // TEST 1: Clean Browser Context (No existing cookies or storage)
  console.log("--- 1. Creating Fresh Browser Context (Zero Cookies/Storage) ---");
  const context = await browser.newContext();
  const page = await context.newPage();

  // Verify /dashboard redirects anonymous user to /login
  console.log("Navigating to http://localhost:3000/dashboard as anonymous user...");
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  assert.ok(
    page.url().includes("/login"),
    `Expected unauthenticated user to be redirected to /login, got: ${page.url()}`
  );
  console.log(`✓ PASS: Anonymous user redirected to: ${page.url()}\n`);

  // TEST 2: Inspect Google Button OAuth URL Target in Browser
  console.log("--- 2. Inspecting Google OAuth Redirect Configuration in DOM ---");
  const loginRes = await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  assert.strictEqual(loginRes.status(), 200, "Login page must return 200");

  // Intercept the outgoing navigation/request when clicking "Continue with Google"
  let interceptedOAuthUrl = null;
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/auth/v1/authorize") && url.includes("provider=google")) {
      interceptedOAuthUrl = url;
    }
  });

  const googleBtn = await page.waitForSelector("button:has-text('Continue with Google')");
  assert.ok(googleBtn, "Google sign-in button must exist in DOM");

  // Click Google button and catch navigation
  try {
    await Promise.race([
      googleBtn.click(),
      page.waitForRequest((req) => req.url().includes("/auth/v1/authorize"), { timeout: 4000 }),
    ]);
  } catch {}

  console.log(`Intercepted Supabase OAuth URL: ${interceptedOAuthUrl}`);
  assert.ok(interceptedOAuthUrl, "Supabase OAuth authorization request must be fired");
  
  const parsedOAuthUrl = new URL(interceptedOAuthUrl);
  const redirectToParam = parsedOAuthUrl.searchParams.get("redirect_to");
  console.log(`Resolved redirect_to parameter: ${redirectToParam}`);

  assert.strictEqual(
    redirectToParam,
    "http://localhost:3000/auth/callback",
    "CRITICAL: OAuth redirect_to MUST strictly be http://localhost:3000/auth/callback"
  );
  assert.ok(
    !redirectToParam.includes("vercel.app"),
    "CRITICAL: OAuth redirect_to MUST NEVER point to Vercel preview domain"
  );
  console.log("✓ PASS: Google sign-in sends exact localhost callback: http://localhost:3000/auth/callback\n");

  // TEST 3: Test OAuth Callback Error Handling
  console.log("--- 3. Testing /auth/callback with Missing/Invalid Code ---");
  await page.goto("http://localhost:3000/auth/callback", { waitUntil: "networkidle" });
  assert.ok(
    page.url().includes("/login?error=google_auth_failed"),
    `Missing code must redirect to /login?error=google_auth_failed, got: ${page.url()}`
  );
  console.log(`✓ PASS: /auth/callback safely redirected invalid attempt to: ${page.url()}\n`);

  // TEST 4: Test Accidental Root Code Forwarding in Middleware
  console.log("--- 4. Testing Root '/' Code Forwarding in Middleware ---");
  await page.goto("http://localhost:3000/?code=test_mock_code_12345", { waitUntil: "networkidle" });
  // Middleware should have forwarded it to /auth/callback?code=test_mock_code_12345
  // And /auth/callback attempted code exchange (which fails for mock code) and redirected to login with error
  console.log(`After mock code on root, final URL: ${page.url()}`);
  assert.ok(
    page.url().includes("/login?error=google_auth_failed"),
    "Root code was forwarded to /auth/callback and handled cleanly"
  );
  console.log("✓ PASS: Root OAuth code is forwarded to /auth/callback\n");

  // TEST 5: Clean Email/Password Login -> Dashboard Flow
  console.log("--- 5. Testing Email/Password Login -> Dashboard Flow ---");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill("#citizen-email", "sankeerths615@gmail.com");
  await page.fill("#citizen-password", "password123");
  
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 15000 }),
    page.click("button[type='submit']"),
  ]);

  assert.strictEqual(page.url(), "http://localhost:3000/dashboard");
  console.log(`✓ PASS: Citizen successfully authenticated and landed on: ${page.url()}\n`);

  // TEST 6: Dashboard Session Persistence across New Tab & Refresh
  console.log("--- 6. Testing Session Persistence (Refresh & New Tab) ---");
  await page.reload({ waitUntil: "networkidle" });
  assert.strictEqual(page.url(), "http://localhost:3000/dashboard");

  const newTab = await context.newPage();
  await newTab.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  assert.strictEqual(newTab.url(), "http://localhost:3000/dashboard");
  await newTab.close();
  console.log("✓ PASS: Session persists seamlessly across reload and new tabs\n");

  // TEST 7: Settings Route Preservation
  console.log("--- 7. Testing /settings Route Preservation ---");
  await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle" });
  assert.strictEqual(page.url(), "http://localhost:3000/settings");
  assert.ok(!page.url().includes("/gov/settings"), "/settings must not redirect to /gov/settings");
  console.log("✓ PASS: /settings remains strictly within Citizen boundary\n");

  // TEST 8: Logout Flow
  console.log("--- 8. Testing Logout & Session Invalidation ---");
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  const logoutRes = await page.request.post("http://localhost:3000/api/auth/logout");
  assert.strictEqual(logoutRes.status(), 200);

  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  assert.ok(
    page.url().includes("/login"),
    `After logout, /dashboard must redirect to /login, got: ${page.url()}`
  );
  console.log("✓ PASS: After logout, /dashboard immediately redirects to /login\n");

  await browser.close();
  console.log("================================================================================");
  console.log("   ALL 8 CLEAN BROWSER INTEGRATION TESTS PASSED (100% SUCCESS)");
  console.log("================================================================================");
}

runCleanBrowserTestSuite().catch((err) => {
  console.error("Clean browser test failed:", err);
  process.exit(1);
});
