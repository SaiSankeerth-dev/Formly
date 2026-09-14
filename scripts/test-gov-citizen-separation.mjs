import assert from "assert";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`SEVA SAARTHI: GOVERNMENT VS CITIZEN SEPARATION TEST`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let citizenToken = "";
  let govToken = "";

  // ------------------------------------------------------------------
  // TEST 1: Citizen Login at Citizen Endpoint (/api/auth/login)
  // ------------------------------------------------------------------
  console.log("TEST 1: Citizen login at /api/auth/login (user@gmail.com)");
  const citizenRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user@gmail.com",
      password: "password123",
    }),
  });

  const citizenData = await citizenRes.json();
  console.log(`  Status: ${citizenRes.status}`);
  console.log(`  Response:`, citizenData);

  assert.strictEqual(citizenRes.status, 200, "Citizen login should return 200 OK");
  assert.strictEqual(citizenData.success, true, "Citizen login should have success=true");
  assert.ok(citizenData.token, "Citizen login should issue a token");
  citizenToken = citizenData.token;

  // Extract set-cookie
  const citizenSetCookie = citizenRes.headers.get("set-cookie") || "";
  assert.ok(
    citizenSetCookie.includes("FORMLY_CITIZEN_SESSION"),
    "Response must set FORMLY_CITIZEN_SESSION cookie"
  );
  console.log("  ✓ TEST 1 PASSED: Citizen authenticated with FORMLY_CITIZEN_SESSION\n");

  // ------------------------------------------------------------------
  // TEST 2: Citizen Login Attempt at Government Endpoint (/api/gov/auth/login)
  // ------------------------------------------------------------------
  console.log("TEST 2: Citizen credentials at /api/gov/auth/login (Should be REJECTED 403)");
  const citizenAtGovRes = await fetch(`${BASE_URL}/api/gov/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: "user@gmail.com",
      password: "password123",
    }),
  });

  const citizenAtGovData = await citizenAtGovRes.json();
  console.log(`  Status: ${citizenAtGovRes.status}`);
  console.log(`  Response:`, citizenAtGovData);

  assert.strictEqual(
    citizenAtGovRes.status,
    403,
    "Citizen credentials at gov login must return 403 Forbidden"
  );
  assert.strictEqual(citizenAtGovData.success, false, "success must be false");
  assert.strictEqual(
    citizenAtGovData.error,
    "Your account is not authorized for the government portal.",
    "Exact error message required"
  );
  console.log("  ✓ TEST 2 PASSED: Citizen blocked from Government portal with exact error\n");

  // ------------------------------------------------------------------
  // TEST 3: Government Officer Credentials at Citizen Login (/api/auth/login)
  // ------------------------------------------------------------------
  console.log("TEST 3: Government officer credentials at /api/auth/login (Should be REJECTED 403)");
  const govAtCitizenRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "officer@gmail.com",
      password: "password123",
    }),
  });

  const govAtCitizenData = await govAtCitizenRes.json();
  console.log(`  Status: ${govAtCitizenRes.status}`);
  console.log(`  Response:`, govAtCitizenData);

  assert.strictEqual(
    govAtCitizenRes.status,
    403,
    "Government credentials at citizen login must return 403 Forbidden"
  );
  assert.strictEqual(govAtCitizenData.success, false, "success must be false");
  assert.strictEqual(govAtCitizenData.isGovernment, true, "isGovernment flag must be true");
  assert.strictEqual(
    govAtCitizenData.error,
    "This account belongs to the government portal.",
    "Exact error message required"
  );
  assert.strictEqual(
    govAtCitizenData.redirectTo,
    "/gov/login",
    "redirectTo must point to /gov/login"
  );
  console.log("  ✓ TEST 3 PASSED: Government officer blocked from Citizen login with redirect advice\n");

  // ------------------------------------------------------------------
  // TEST 4: Government Officer Login at Government Endpoint (/api/gov/auth/login)
  // ------------------------------------------------------------------
  console.log("TEST 4: Government officer login at /api/gov/auth/login (officer@gmail.com)");
  const govRes = await fetch(`${BASE_URL}/api/gov/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: "officer@gmail.com",
      password: "password123",
    }),
  });

  const govData = await govRes.json();
  console.log(`  Status: ${govRes.status}`);
  console.log(`  Response:`, govData);

  assert.strictEqual(govRes.status, 200, "Government login should return 200 OK");
  assert.strictEqual(govData.success, true, "Government login should have success=true");
  assert.ok(govData.token, "Government login should issue a token");
  govToken = govData.token;

  const govSetCookie = govRes.headers.get("set-cookie") || "";
  assert.ok(
    govSetCookie.includes("FORMLY_GOV_SESSION"),
    "Response must set FORMLY_GOV_SESSION cookie"
  );
  console.log("  ✓ TEST 4 PASSED: Government officer authenticated with FORMLY_GOV_SESSION\n");

  // ------------------------------------------------------------------
  // TEST 5: Middleware Cross-Access Protection
  // ------------------------------------------------------------------
  console.log("TEST 5: Middleware Route Guards and Cross-Portal Isolation");

  // 5a. Unauthenticated access to /gov/dashboard -> redirects to /gov/login
  const unauthGovRes = await fetch(`${BASE_URL}/gov/dashboard`, {
    redirect: "manual",
  });
  console.log(`  Unauthenticated /gov/dashboard status: ${unauthGovRes.status}`);
  const unauthGovLoc = unauthGovRes.headers.get("location") || "";
  console.log(`  Redirect location: ${unauthGovLoc}`);
  assert.ok(
    unauthGovLoc.includes("/gov/login"),
    "Unauthenticated /gov/dashboard must redirect to /gov/login"
  );

  // 5b. Citizen cookie accessing /gov/dashboard -> must redirect to /gov/login (NOT allowed!)
  const citizenAtGovRouteRes = await fetch(`${BASE_URL}/gov/dashboard`, {
    headers: {
      Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}`,
    },
    redirect: "manual",
  });
  console.log(`  Citizen cookie accessing /gov/dashboard status: ${citizenAtGovRouteRes.status}`);
  const citizenAtGovLoc = citizenAtGovRouteRes.headers.get("location") || "";
  console.log(`  Redirect location: ${citizenAtGovLoc}`);
  assert.ok(
    citizenAtGovLoc.includes("/gov/login"),
    "Citizen session accessing /gov/dashboard must redirect to /gov/login"
  );

  // 5c. Government cookie accessing /dashboard -> must redirect to /login (NOT allowed!)
  const govAtCitizenRouteRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: {
      Cookie: `FORMLY_GOV_SESSION=${govToken}`,
    },
    redirect: "manual",
  });
  console.log(`  Gov cookie accessing /dashboard status: ${govAtCitizenRouteRes.status}`);
  const govAtCitizenLoc = govAtCitizenRouteRes.headers.get("location") || "";
  console.log(`  Redirect location: ${govAtCitizenLoc}`);
  assert.ok(
    govAtCitizenLoc.includes("/login"),
    "Government session accessing /dashboard must redirect to /login"
  );

  // 5d. Government cookie accessing /gov/dashboard -> 200 OK
  const govAtGovRouteRes = await fetch(`${BASE_URL}/gov/dashboard`, {
    headers: {
      Cookie: `FORMLY_GOV_SESSION=${govToken}`,
    },
    redirect: "manual",
  });
  console.log(`  Gov cookie accessing /gov/dashboard status: ${govAtGovRouteRes.status}`);
  assert.strictEqual(
    govAtGovRouteRes.status,
    200,
    "Valid government session must be allowed on /gov/dashboard"
  );

  // 5e. Citizen cookie accessing /dashboard -> 200 OK
  const citizenAtCitizenRouteRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: {
      Cookie: `FORMLY_CITIZEN_SESSION=${citizenToken}`,
    },
    redirect: "manual",
  });
  console.log(`  Citizen cookie accessing /dashboard status: ${citizenAtCitizenRouteRes.status}`);
  assert.strictEqual(
    citizenAtCitizenRouteRes.status,
    200,
    "Valid citizen session must be allowed on /dashboard"
  );

  // 5f. Government officer accessing /gov root -> redirects to /gov/dashboard
  const govRootRes = await fetch(`${BASE_URL}/gov`, {
    headers: {
      Cookie: `FORMLY_GOV_SESSION=${govToken}`,
    },
    redirect: "manual",
  });
  console.log(`  Accessing /gov status: ${govRootRes.status}`);
  const govRootLoc = govRootRes.headers.get("location") || "";
  console.log(`  Redirect location: ${govRootLoc}`);
  assert.ok(
    govRootLoc.includes("/gov/dashboard"),
    "Accessing /gov must redirect to /gov/dashboard"
  );

  console.log("  ✓ TEST 5 PASSED: Middleware strictly enforces zero cross-portal leakage!\n");

  console.log(`======================================================`);
  console.log(`ALL 5 SEPARATION INTEGRATION TESTS PASSED SUCCESSFULLY!`);
  console.log(`======================================================\n`);
}

runTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
