import { GET as healthGet } from "../src/app/api/health/route";
import { GET as dashboardGet } from "../src/app/api/dashboard/route";
import { POST as loginPost } from "../src/app/api/auth/login/route";
import { POST as registerPost } from "../src/app/api/auth/register/route";

async function testRoutes() {
  console.log("=================================================================");
  console.log("TESTING ROUTE HANDLERS: /api/health & /api/dashboard & auth");
  console.log("=================================================================\n");

  // 1. Test /api/health
  console.log("[1] Testing /api/health...");
  const healthRes = await healthGet();
  const healthStatus = healthRes.status;
  const healthData = await healthRes.json();
  console.log("  Status:", healthStatus);
  console.log("  Body:", healthData);
  if (healthStatus !== 200 || healthData.status !== "ok" || healthData.database !== "connected") {
    throw new Error(`/api/health failed: ${JSON.stringify(healthData)}`);
  }
  console.log("  ✓ /api/health verified: 200 OK, database connected.\n");

  // 2. Test /api/dashboard Unauthenticated (must return 401)
  console.log("[2] Testing /api/dashboard Unauthenticated...");
  const unauthReq = new Request("http://localhost:3000/api/dashboard");
  const unauthRes = await dashboardGet(unauthReq);
  const unauthStatus = unauthRes.status;
  const unauthData = await unauthRes.json();
  console.log("  Status:", unauthStatus);
  console.log("  Body:", unauthData);
  if (unauthStatus !== 401 || unauthData.success !== false) {
    throw new Error(`/api/dashboard unauthenticated did not return 401: ${unauthStatus}`);
  }
  console.log("  ✓ /api/dashboard unauthenticated verified: 401 Unauthorized.\n");

  // 3. Test /api/auth/login User A (Sai Sankeerth)
  console.log("[3] Testing /api/auth/login (User A)...");
  const loginReq = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "sankeerths615@gmail.com", password: "password123" }),
  });
  const loginRes = await loginPost(loginReq);
  const loginData = await loginRes.json();
  console.log("  Login status:", loginRes.status);
  console.log("  User A:", loginData.user.name, `(${loginData.user.id})`);
  console.log("  Token starts with formly_:", loginData.token.startsWith("formly_"));
  if (!loginData.token.startsWith("formly_")) {
    throw new Error("Login token is not HMAC signed");
  }
  console.log("  ✓ User A login verified: 200 OK with HMAC session token.\n");

  // 4. Test /api/dashboard Authenticated with User A
  console.log("[4] Testing /api/dashboard Authenticated (User A)...");
  const userAReq = new Request("http://localhost:3000/api/dashboard", {
    headers: {
      Authorization: `Bearer ${loginData.token}`,
    },
  });
  const userARes = await dashboardGet(userAReq);
  const userAData = await userARes.json();
  console.log("  User A Dashboard status:", userARes.status);
  console.log("  User A Name:", userAData.user.name);
  console.log("  User A Applications count:", userAData.applications.length);
  console.log("  User A Documents count:", userAData.documents.length);
  console.log("  User A Recent Services count:", userAData.recentServices.length);
  if (userARes.status !== 200 || !userAData.success) {
    throw new Error(`User A dashboard load failed: ${JSON.stringify(userAData)}`);
  }
  if (!Array.isArray(userAData.applications) || !Array.isArray(userAData.documents) || !Array.isArray(userAData.recentServices)) {
    throw new Error("Dashboard contract violated: collections must be arrays");
  }
  console.log("  ✓ User A dashboard verified: 200 OK with real user database records.\n");

  // 5. Test /api/auth/register User B (Fresh Citizen)
  console.log("[5] Testing /api/auth/register (User B - Fresh Citizen)...");
  const freshEmail = `pooja_${Date.now()}@example.com`;
  const regReq = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Pooja Reddy",
      email: freshEmail,
      password: "password123",
      phone: "9876543210",
    }),
  });
  const regRes = await registerPost(regReq);
  const regData = await regRes.json();
  console.log("  Register status:", regRes.status);
  console.log("  User B:", regData.user.name, `(${regData.user.id})`);
  console.log("  Token starts with formly_:", regData.token.startsWith("formly_"));
  console.log("  ✓ User B register verified: 200 OK with HMAC session token.\n");

  // 6. Test /api/dashboard Authenticated with User B (Empty State)
  console.log("[6] Testing /api/dashboard Authenticated (User B - Empty State)...");
  const userBReq = new Request("http://localhost:3000/api/dashboard", {
    headers: {
      Authorization: `Bearer ${regData.token}`,
    },
  });
  const userBRes = await dashboardGet(userBReq);
  const userBData = await userBRes.json();
  console.log("  User B Dashboard status:", userBRes.status);
  console.log("  User B Profile completed:", userBData.profile.completed);
  console.log("  User B Onboarding step:", userBData.profile.currentStep);
  console.log("  User B Applications count:", userBData.applications.length);
  console.log("  User B Documents count:", userBData.documents.length);
  console.log("  User B Recent Services count:", userBData.recentServices.length);

  if (userBRes.status !== 200 || !userBData.success) {
    throw new Error(`User B dashboard load failed: ${JSON.stringify(userBData)}`);
  }
  if (userBData.applications.length !== 0 || userBData.documents.length !== 0) {
    throw new Error(`User B must have 0 applications and 0 documents, got apps=${userBData.applications.length}, docs=${userBData.documents.length}`);
  }
  if (userBData.profile.completed !== false || userBData.profile.currentStep !== 1) {
    throw new Error(`User B profile must be incomplete at step 1: ${JSON.stringify(userBData.profile)}`);
  }
  console.log("  ✓ User B empty state dashboard verified: 200 OK, empty arrays, onboarding step 1.\n");

  console.log("=================================================================");
  console.log("ALL ROUTE HANDLER TESTS PASSED (100%)!");
  console.log("=================================================================");
}

testRoutes().catch((err) => {
  console.error("\n❌ Route Handler Test Failed:", err);
  process.exit(1);
});
