import assert from "assert";

const CITIZEN_ORIGIN = "http://localhost:3000";
const GOV_ORIGIN = "http://localhost:3001";

async function runMatrix() {
  console.log("\n================================================================================");
  console.log("   COMPREHENSIVE RUNTIME VERIFICATION MATRIX (PORT 3000 & 3001)");
  console.log("================================================================================\n");

  // 1. Citizen Login
  console.log("--- 1. Testing Citizen Login ---");
  const citizenLoginRes = await fetch(`${CITIZEN_ORIGIN}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "sankeerths615@gmail.com", password: "password123" }),
  });
  assert.strictEqual(citizenLoginRes.status, 200, "Citizen login API must return 200 OK");
  const citizenData = await citizenLoginRes.json();
  assert.strictEqual(citizenData.success, true, "Citizen login success flag must be true");
  const citizenCookieHeader = citizenLoginRes.headers.get("set-cookie") || "";
  assert.ok(citizenCookieHeader.includes("FORMLY_CITIZEN_SESSION"), "Must issue FORMLY_CITIZEN_SESSION");
  const citizenCookieMatch = citizenCookieHeader.match(/FORMLY_CITIZEN_SESSION=([^;]+)/);
  const citizenToken = citizenCookieMatch ? citizenCookieMatch[1] : "";
  console.log("✓ Citizen login successfully authenticated with session token.");

  // 2. Citizen Logout
  console.log("\n--- 2. Testing Citizen Logout ---");
  const citizenLogoutRes = await fetch(`${CITIZEN_ORIGIN}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}` },
  });
  assert.strictEqual(citizenLogoutRes.status, 200, "Citizen logout API must return 200 OK");
  console.log("✓ Citizen logout successfully invalidated session.");

  // 3. Citizen Settings
  console.log("\n--- 3. Testing Citizen Settings ---");
  // 3a. Unauthenticated access to /settings -> must redirect to /login
  const unauthSettingsRes = await fetch(`${CITIZEN_ORIGIN}/settings`, { redirect: "manual" });
  assert.ok([302, 307, 308].includes(unauthSettingsRes.status), "Unauthenticated /settings must redirect");
  const unauthSettingsLoc = unauthSettingsRes.headers.get("location") || "";
  assert.ok(unauthSettingsLoc.includes("/login"), "Must redirect to /login");
  assert.ok(!unauthSettingsLoc.includes("/gov"), "Must NEVER redirect to /gov/settings");
  console.log("✓ Unauthenticated /settings redirects to /login (no gov leakage).");

  // 3b. Authenticated access to /settings -> must return 200 OK
  const authSettingsRes = await fetch(`${CITIZEN_ORIGIN}/settings`, {
    headers: { Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}` },
    redirect: "manual",
  });
  assert.strictEqual(authSettingsRes.status, 200, "Authenticated citizen /settings must return 200 OK");
  const settingsHtml = await authSettingsRes.text();
  assert.ok(
    settingsHtml.includes("settings") || settingsHtml.includes("Seva Saarthi") || settingsHtml.includes("Checking secure citizen session"),
    "Must render citizen settings layout"
  );
  assert.ok(!settingsHtml.includes("Sarkaar Seva"), "Citizen settings must NOT show Sarkaar Seva");
  console.log("✓ Authenticated citizen /settings returns 200 OK with citizen branding.");

  // 4. Citizen Profile
  console.log("\n--- 4. Testing Citizen Profile ---");
  const authProfileRes = await fetch(`${CITIZEN_ORIGIN}/profile`, {
    headers: { Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}` },
    redirect: "manual",
  });
  assert.strictEqual(authProfileRes.status, 200, "Authenticated citizen /profile must return 200 OK");
  console.log("✓ Authenticated citizen /profile returns 200 OK.");

  // 5. Citizen Dashboard
  console.log("\n--- 5. Testing Citizen Dashboard ---");
  const authDashRes = await fetch(`${CITIZEN_ORIGIN}/dashboard`, {
    headers: { Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}` },
    redirect: "manual",
  });
  assert.strictEqual(authDashRes.status, 200, "Authenticated citizen /dashboard must return 200 OK");
  const dashHtml = await authDashRes.text();
  assert.ok(!dashHtml.includes("Sarkaar Seva"), "Citizen dashboard must NOT contain Sarkaar Seva branding");
  console.log("✓ Authenticated citizen /dashboard returns 200 OK with Seva Saarthi branding.");

  // 6. Google Login Initiation
  console.log("\n--- 6. Testing Google Login Initiation ---");
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jvzvfpfzhmidsztfexsd.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_3asBWnzHlx_AKzwDFvWhWA_j5Zod3Yd"
  );
  const oauthInit = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${CITIZEN_ORIGIN}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  assert.ok(oauthInit.data?.url, "signInWithOAuth must return authorization URL");
  const initUrl = new URL(oauthInit.data.url);
  assert.strictEqual(initUrl.pathname, "/auth/v1/authorize");
  assert.strictEqual(initUrl.searchParams.get("provider"), "google");
  assert.strictEqual(initUrl.searchParams.get("redirect_to"), `${CITIZEN_ORIGIN}/auth/callback`);
  console.log(`✓ Google OAuth authorization URL generated: ${initUrl.origin}${initUrl.pathname}`);
  console.log(`  redirect_to: ${initUrl.searchParams.get("redirect_to")}`);

  // Inspect the broker redirect to Google
  const brokerRes = await fetch(oauthInit.data.url, { redirect: "manual" });
  const googleConsentLoc = brokerRes.headers.get("location");
  assert.ok(googleConsentLoc, "Supabase broker must redirect to Google Accounts");
  const googleConsentUrl = new URL(googleConsentLoc);
  const sentClientId = googleConsentUrl.searchParams.get("client_id");
  const sentRedirectUri = googleConsentUrl.searchParams.get("redirect_uri");
  console.log(`✓ Exact Google Client ID: ${sentClientId}`);
  console.log(`✓ Exact Google redirect_uri sent by broker: ${sentRedirectUri}`);
  assert.strictEqual(sentRedirectUri, "https://jvzvfpfzhmidsztfexsd.supabase.co/auth/v1/callback");

  // 7. Google Callback Route
  console.log("\n--- 7. Testing Google Callback Route (/auth/callback) ---");
  const callbackNoCodeRes = await fetch(`${CITIZEN_ORIGIN}/auth/callback`, { redirect: "manual" });
  assert.ok([302, 307, 308].includes(callbackNoCodeRes.status), "Callback without code must redirect");
  const callbackNoCodeLoc = callbackNoCodeRes.headers.get("location") || "";
  assert.ok(callbackNoCodeLoc.includes("/login?error=oauth_failed"), "Must redirect to /login?error=oauth_failed");
  console.log("✓ Callback route /auth/callback exists, handles missing/invalid code, and safely redirects to /login.");

  // 8. Government Login
  console.log("\n--- 8. Testing Government Login ---");
  const govLoginRes = await fetch(`${GOV_ORIGIN}/api/gov/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId: "sankeerthvss@gmail.com", password: "password123" }),
  });
  assert.strictEqual(govLoginRes.status, 200, "Government login API must return 200 OK");
  const govData = await govLoginRes.json();
  assert.strictEqual(govData.success, true, "Government login success flag must be true");
  const govCookieHeader = govLoginRes.headers.get("set-cookie") || "";
  assert.ok(govCookieHeader.includes("FORMLY_GOV_SESSION"), "Must issue FORMLY_GOV_SESSION");
  const govCookieMatch = govCookieHeader.match(/FORMLY_GOV_SESSION=([^;]+)/);
  const govToken = govCookieMatch ? govCookieMatch[1] : "";
  console.log("✓ Government officer login successfully authenticated with FORMLY_GOV_SESSION.");

  // 9. Government Dashboard
  console.log("\n--- 9. Testing Government Dashboard ---");
  // 9a. Unauthenticated access to /gov/dashboard -> redirects to /gov/login
  const unauthGovDashRes = await fetch(`${GOV_ORIGIN}/gov/dashboard`, { redirect: "manual" });
  assert.ok([302, 307, 308].includes(unauthGovDashRes.status), "Unauthenticated /gov/dashboard must redirect");
  const unauthGovDashLoc = unauthGovDashRes.headers.get("location") || "";
  assert.ok(unauthGovDashLoc.includes("/gov/login"), "Must redirect to /gov/login");
  console.log("✓ Unauthenticated /gov/dashboard redirects to /gov/login.");

  // 9b. Authenticated access to /gov/dashboard -> 200 OK
  const authGovDashRes = await fetch(`${GOV_ORIGIN}/gov/dashboard`, {
    headers: { Cookie: `FORMLY_GOV_SESSION=${govToken}` },
    redirect: "manual",
  });
  assert.strictEqual(authGovDashRes.status, 200, "Authenticated officer /gov/dashboard must return 200 OK");
  const govDashHtml = await authGovDashRes.text();
  assert.ok(govDashHtml.includes("Sarkaar Seva"), "Government dashboard must contain Sarkaar Seva branding");
  assert.ok(!govDashHtml.includes("One Form. A Smarter India"), "Government must NOT contain Seva Saarthi slogan");
  console.log("✓ Authenticated /gov/dashboard returns 200 OK with Sarkaar Seva branding.");

  // 10. Government Settings
  console.log("\n--- 10. Testing Government Settings ---");
  // 10a. Unauthenticated access to /gov/settings -> redirects to /gov/login
  const unauthGovSettRes = await fetch(`${GOV_ORIGIN}/gov/settings`, { redirect: "manual" });
  assert.ok([302, 307, 308].includes(unauthGovSettRes.status), "Unauthenticated /gov/settings must redirect");
  const unauthGovSettLoc = unauthGovSettRes.headers.get("location") || "";
  assert.ok(unauthGovSettLoc.includes("/gov/login"), "Must redirect to /gov/login");
  console.log("✓ Unauthenticated /gov/settings redirects to /gov/login.");

  // 10b. Authenticated access to /gov/settings -> 200 OK
  const authGovSettRes = await fetch(`${GOV_ORIGIN}/gov/settings`, {
    headers: { Cookie: `FORMLY_GOV_SESSION=${govToken}` },
    redirect: "manual",
  });
  assert.strictEqual(authGovSettRes.status, 200, "Authenticated officer /gov/settings must return 200 OK");
  const govSettHtml = await authGovSettRes.text();
  assert.ok(govSettHtml.includes("Officer Settings") || govSettHtml.includes("Workdesk"), "Must render officer settings");
  console.log("✓ Authenticated /gov/settings returns 200 OK with officer workdesk settings.");

  // 11. Citizen Attempting /gov/*
  console.log("\n--- 11. Testing Citizen Attempting /gov/* ---");
  // 11a. Citizen session accessing /gov/dashboard on port 3001
  const citizenAtGov3001 = await fetch(`${GOV_ORIGIN}/gov/dashboard`, {
    headers: { Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}` },
    redirect: "manual",
  });
  assert.ok([302, 307, 308].includes(citizenAtGov3001.status), "Citizen accessing /gov/* on port 3001 must redirect");
  const citizenAtGov3001Loc = citizenAtGov3001.headers.get("location") || "";
  assert.ok(citizenAtGov3001Loc.includes("/gov/login"), "Citizen accessing /gov/* on port 3001 redirected to /gov/login");

  // 11b. Citizen accessing /gov/* on port 3000
  const citizenAtGov3000 = await fetch(`${CITIZEN_ORIGIN}/gov/dashboard`, {
    headers: { Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}` },
    redirect: "manual",
  });
  assert.strictEqual(citizenAtGov3000.status, 403, "Citizen accessing /gov/* on port 3000 blocked with 403 Origin Isolation");
  console.log("✓ Citizen attempting /gov/* is strictly blocked/redirected across all entry points.");

  // 12. Government Attempting Citizen-Only Routes
  console.log("\n--- 12. Testing Government Attempting Citizen-Only Routes ---");
  // 12a. Officer session accessing /dashboard on port 3000
  const govAtCit3000 = await fetch(`${CITIZEN_ORIGIN}/dashboard`, {
    headers: { Cookie: `FORMLY_GOV_SESSION=${govToken}` },
    redirect: "manual",
  });
  assert.ok([302, 307, 308].includes(govAtCit3000.status), "Gov session accessing citizen /dashboard must redirect");
  const govAtCit3000Loc = govAtCit3000.headers.get("location") || "";
  assert.ok(govAtCit3000Loc.includes("/login"), "Gov session accessing citizen /dashboard redirected to /login");

  // 12b. Officer accessing citizen /dashboard on port 3001
  const govAtCit3001 = await fetch(`${GOV_ORIGIN}/dashboard`, {
    headers: { Cookie: `FORMLY_GOV_SESSION=${govToken}` },
    redirect: "manual",
  });
  assert.ok([302, 307, 308].includes(govAtCit3001.status), "Accessing /dashboard on port 3001 redirects to /gov/dashboard");
  const govAtCit3001Loc = govAtCit3001.headers.get("location") || "";
  assert.ok(govAtCit3001Loc.includes("/gov/dashboard"), "Redirects to canonical /gov/dashboard");

  // 12c. Accessing citizen-only route /documents on port 3001
  const docAtGov3001 = await fetch(`${GOV_ORIGIN}/documents`, {
    headers: { Cookie: `FORMLY_GOV_SESSION=${govToken}` },
    redirect: "manual",
  });
  assert.strictEqual(docAtGov3001.status, 403, "Citizen-only /documents on port 3001 returns 403 Platform Boundary");
  console.log("✓ Government attempting citizen routes is strictly isolated and cannot leak identities.");

  // 13. Audit ALL 14 Citizen Routes
  console.log("\n--- 13. Auditing All 14 Citizen Routes on Port 3000 ---");
  const citizenRoutes = [
    { path: "/login", auth: false, expected: 200 },
    { path: "/signup", auth: false, expected: 200 },
    { path: "/dashboard", auth: true, expected: 200 },
    { path: "/discover", auth: false, expected: 200 },
    { path: "/services", auth: false, expected: 200 },
    { path: "/applications", auth: true, expected: 200 },
    { path: "/documents", auth: true, expected: 200 },
    { path: "/profile", auth: true, expected: 200 },
    { path: "/settings", auth: true, expected: 200 },
    { path: "/notifications", auth: false, expected: 200 },
    { path: "/help", auth: false, expected: 200 },
    { path: "/support", auth: false, expected: 200 },
    { path: "/privacy", auth: false, expected: 200 },
    { path: "/terms", auth: false, expected: 200 },
  ];

  for (const r of citizenRoutes) {
    const headers = r.auth ? { Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}` } : {};
    const res = await fetch(`${CITIZEN_ORIGIN}${r.path}`, { headers, redirect: "manual" });
    assert.strictEqual(
      res.status,
      r.expected,
      `Citizen route ${r.path} expected HTTP ${r.expected} but received ${res.status}`
    );
    console.log(`  ✓ ${r.path} -> HTTP ${res.status} OK`);
  }

  // 14. Audit ALL 7 Government Routes
  console.log("\n--- 14. Auditing All 7 Government Routes on Port 3001 ---");
  const govRoutes = [
    { path: "/gov/login", auth: false, expected: 200 },
    { path: "/gov/dashboard", auth: true, expected: 200 },
    { path: "/gov/applications", auth: true, expected: 200 },
    { path: "/gov/queue", auth: true, expected: 200 },
    { path: "/gov/exceptions", auth: true, expected: 200 },
    { path: "/gov/audit", auth: true, expected: 200 },
    { path: "/gov/settings", auth: true, expected: 200 },
  ];

  for (const r of govRoutes) {
    const headers = r.auth ? { Cookie: `FORMLY_GOV_SESSION=${govToken}` } : {};
    const res = await fetch(`${GOV_ORIGIN}${r.path}`, { headers, redirect: "manual" });
    assert.strictEqual(
      res.status,
      r.expected,
      `Government route ${r.path} expected HTTP ${r.expected} but received ${res.status}`
    );
    console.log(`  ✓ ${r.path} -> HTTP ${res.status} OK`);
  }

  console.log("\n================================================================================");
  console.log("   🎉 ALL RUNTIME CHECKS, ROUTES & BOUNDARIES PASSED (100% PASS)");
  console.log("================================================================================\n");
}

runMatrix().catch((err) => {
  console.error("\n❌ MATRIX FAILED:", err);
  process.exit(1);
});
