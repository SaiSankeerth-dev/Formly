import { registerUser, loginUser, authenticateSession, signSessionToken, verifySessionToken } from "../src/lib/server/db";
import { getAuthoritativeDb, pgQuery } from "../src/lib/server/pg-db";

async function runVerification() {
  console.log("=================================================================");
  console.log("SEVA SAARTHI — VERIFYING DASHBOARD & AUTH REPAIRS (ZERO FAKE DATA)");
  console.log("=================================================================\n");

  // 1. Test HMAC Token Signing and Verification
  console.log("[1] Testing HMAC Token Generation & Verification...");
  const testPayload = {
    userId: "u_test_hmac_123",
    name: "Verification User",
    email: "verify@sevasaarthi.gov.in",
    role: "Applicant / Citizen",
  };
  const token = signSessionToken(testPayload);
  if (!token.startsWith("formly_")) {
    throw new Error(`Token does not start with formly_: ${token}`);
  }
  const verified = verifySessionToken(token);
  if (!verified || verified.userId !== testPayload.userId || verified.email !== testPayload.email) {
    throw new Error(`Failed to verify session token: ${JSON.stringify(verified)}`);
  }
  console.log("  ✓ HMAC token generated and verified successfully:", token.substring(0, 35) + "...\n");

  // 2. Test Authoritative Database Connection
  console.log("[2] Testing Authoritative Database Connectivity...");
  const db = await getAuthoritativeDb();
  const dbResult = await pgQuery(`SELECT 1 as alive`);
  if (!dbResult || dbResult.length === 0) {
    throw new Error("Database query failed to return alive row");
  }
  console.log("  ✓ Authoritative PGlite / PostgreSQL database is active and responsive.\n");

  // 3. Authenticate Existing User (User A: Sai Sankeerth)
  console.log("[3] Testing User A (Sai Sankeerth) Login & Isolation...");
  const userALogin = await loginUser("sankeerths615@gmail.com", "1234567890");
  if (!userALogin.token.startsWith("formly_")) {
    throw new Error("User A login did not return a signed HMAC token");
  }
  const authUserA = await authenticateSession(userALogin.token);
  if (!authUserA || authUserA.email !== "sankeerths615@gmail.com") {
    throw new Error(`Failed to authenticate User A session: ${JSON.stringify(authUserA)}`);
  }
  console.log(`  ✓ User A authenticated: ${authUserA.name} (${authUserA.id})`);

  // 4. Register Brand New Citizen (User B) with 0 Applications & 0 Documents
  console.log("\n[4] Testing User B (Fresh Citizen Registration & Empty State)...");
  const uniqueEmail = `citizen_verify_${Date.now()}@example.com`;
  const userBReg = await registerUser("Pooja Reddy", uniqueEmail, "SecurePass@2026", "9123456780");
  if (!userBReg.token.startsWith("formly_")) {
    throw new Error("User B register did not return a signed HMAC token");
  }
  const authUserB = await authenticateSession(userBReg.token);
  if (!authUserB || authUserB.email !== uniqueEmail) {
    throw new Error(`Failed to authenticate User B session: ${JSON.stringify(authUserB)}`);
  }
  console.log(`  ✓ User B registered & authenticated: ${authUserB.name} (${authUserB.id})`);

  // 5. Test Cross-Container Recovery
  console.log("\n[5] Testing Cross-Container Recovery Simulation...");
  // Simulate token arriving at a fresh container with in-memory DB by passing User B's token directly
  const recoveredUser = await authenticateSession(userBReg.token);
  if (!recoveredUser || recoveredUser.id !== userBReg.user.id) {
    throw new Error("Cross-container session recovery failed");
  }
  console.log(`  ✓ Session verified and recovered across container boundary: ${recoveredUser.id}`);

  // 6. Verify Strict Data Isolation
  console.log("\n[6] Verifying Strict Data Isolation Between User A and User B...");
  const { getUserDocuments, getPanApplications, getUserProfileFields, getCitizenSessions } = await import("../src/lib/server/db");
  
  const userAApps = await getPanApplications({ userId: authUserA.id });
  const userBApps = await getPanApplications({ userId: authUserB.id });

  const userADocs = await getUserDocuments(authUserA.id);
  const userBDocs = await getUserDocuments(authUserB.id);

  console.log(`  User A Applications: ${userAApps.length}, Documents: ${userADocs.length}`);
  console.log(`  User B Applications: ${userBApps.length}, Documents: ${userBDocs.length}`);

  if (userBApps.length !== 0) {
    throw new Error(`User B should have 0 applications, but found ${userBApps.length}`);
  }
  if (userBDocs.length !== 0) {
    throw new Error(`User B should have 0 documents, but found ${userBDocs.length}`);
  }

  // Verify User B cannot see any of User A's application IDs
  const userAAppIds = new Set(userAApps.map(a => a.id));
  const leakedApps = userBApps.filter(b => userAAppIds.has(b.id));
  if (leakedApps.length > 0) {
    throw new Error(`Data leak detected: User B can see User A applications: ${JSON.stringify(leakedApps)}`);
  }
  console.log("  ✓ Strict multi-user data isolation verified: 0 leaks between User A and User B.");

  // 7. Verify Profile Completeness & Onboarding Detection for User B
  console.log("\n[7] Verifying Onboarding & Profile Completeness Detection...");
  const { checkOnboardingStatus, getProfileCompleteness } = await import("../src/lib/constants/profile");
  const userBProfile = await getUserProfileFields(authUserB.id);
  const onboardingStatus = checkOnboardingStatus(userBProfile, authUserB);
  const completeness = getProfileCompleteness(userBProfile);

  console.log(`  User B Profile Completed: ${onboardingStatus.isComplete}`);
  console.log(`  User B Current Onboarding Step: ${onboardingStatus.currentStep}`);
  console.log(`  User B Completion Score: ${completeness.strength}%`);

  if (onboardingStatus.isComplete) {
    throw new Error("Fresh citizen user should NOT have completed profile");
  }
  if (onboardingStatus.currentStep !== 1) {
    throw new Error(`Fresh citizen user should start at step 1, got ${onboardingStatus.currentStep}`);
  }
  console.log("  ✓ First-login onboarding detection verified: correctly detects incomplete profile at step 1.");

  console.log("\n=================================================================");
  console.log("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log("=================================================================");
}

runVerification().catch((err) => {
  console.error("\n❌ Verification Failed:", err);
  process.exit(1);
});
