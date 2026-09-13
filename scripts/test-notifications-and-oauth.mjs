import {
  registerUser,
  loginUser,
  findOrCreateGoogleUser,
  authenticateSession,
  logoutSession,
  getUserProfileFields,
  updateUserProfileField,
  createNotification,
} from "../src/lib/server/db.ts";
import { checkOnboardingStatus } from "../src/lib/constants/profile.ts";
import { getAuthoritativeDb, pgQuery } from "../src/lib/server/pg-db.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
}

async function runNotificationsAndOAuthTestSuite() {
  console.log("\n========================================================");
  console.log("   SEVA SAARTHI — NOTIFICATIONS & GOOGLE OAUTH TEST SUITE");
  console.log("========================================================\n");

  const timestamp = Date.now();
  const userAEmail = `citizen_notif_a_${timestamp}@test.seva.in`;
  const userBEmail = `citizen_notif_b_${timestamp}@test.seva.in`;

  // ------------------------------------------------------------------
  // PART A: NOTIFICATION TESTS (ISOLATION, UNREAD COUNT, PERSISTENCE)
  // ------------------------------------------------------------------
  console.log("--- PART A: Multi-User Notification Isolation & State ---");

  // 1. Create two test citizens: User A and User B
  const regA = await registerUser("Aarav Patel", userAEmail, "SecurePassA@2026", "9876543210");
  const regB = await registerUser("Diya Sharma", userBEmail, "SecurePassB@2026", "9876543211");
  const userAId = regA.user.id;
  const userBId = regB.user.id;

  assert(Boolean(userAId && userBId), "Registered User A and User B successfully");

  const cleanUserAId = userAId.replace(/^u_/, "");
  const cleanUserBId = userBId.replace(/^u_/, "");

  // Verify initial state: 0 notifications, 0 unread
  await getAuthoritativeDb();
  const initialA = await pgQuery(
    `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN'`,
    [cleanUserAId]
  );
  const initialB = await pgQuery(
    `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN'`,
    [cleanUserBId]
  );
  assert(initialA.length === 0, "User A starts with 0 notifications (empty state)");
  assert(initialB.length === 0, "User B starts with 0 notifications (empty state)");

  // 2. Create Notification 1 for User A
  const notifA1Id = crypto.randomUUID();
  await pgQuery(
    `INSERT INTO notifications (id, recipient_id, recipient_type, notification_type, title, body, severity, action_url, created_at)
     VALUES ($1, $2, 'CITIZEN', 'DOCUMENT', 'Document Verified: Income Certificate', 'Your income certificate has been verified by the tehsildar.', 'SUCCESS', '/documents', now())`,
    [notifA1Id, cleanUserAId]
  );

  // Create Notification 2 for User A
  const notifA2Id = crypto.randomUUID();
  await pgQuery(
    `INSERT INTO notifications (id, recipient_id, recipient_type, notification_type, title, body, severity, action_url, created_at)
     VALUES ($1, $2, 'CITIZEN', 'APPLICATION', 'PAN Application Update', 'Your PAN card application has been processed.', 'INFO', '/applications', now())`,
    [notifA2Id, cleanUserAId]
  );

  // Create Notification 1 for User B
  const notifB1Id = crypto.randomUUID();
  await pgQuery(
    `INSERT INTO notifications (id, recipient_id, recipient_type, notification_type, title, body, severity, action_url, created_at)
     VALUES ($1, $2, 'CITIZEN', 'PROFILE', 'Profile Action Required', 'Please complete your bank account details.', 'ACTION_REQUIRED', '/profile', now())`,
    [notifB1Id, cleanUserBId]
  );

  // 3. Verify Isolation: User A sees ONLY User A notifications
  const queryA = await pgQuery(
    `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN' ORDER BY created_at DESC`,
    [cleanUserAId]
  );
  assert(queryA.length === 2, `User A retrieved exactly 2 notifications (found ${queryA.length})`);
  assert(queryA.every((n) => n.recipient_id === cleanUserAId), "All retrieved notifications belong strictly to User A");
  assert(!queryA.some((n) => n.id === notifB1Id), "User A CANNOT see User B notification (Zero Leakage)");

  const unreadA = queryA.filter((n) => !n.read_at).length;
  assert(unreadA === 2, `User A unread count is accurately 2 (badge = 2)`);

  // 4. Verify User B sees ONLY User B notifications
  const queryB = await pgQuery(
    `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN' ORDER BY created_at DESC`,
    [cleanUserBId]
  );
  assert(queryB.length === 1, `User B retrieved exactly 1 notification (found ${queryB.length})`);
  assert(queryB[0].id === notifB1Id, "User B notification matches notifB1Id");
  assert(!queryB.some((n) => n.id === notifA1Id || n.id === notifA2Id), "User B CANNOT see User A notifications");

  const unreadB = queryB.filter((n) => !n.read_at).length;
  assert(unreadB === 1, `User B unread count is accurately 1 (badge = 1)`);

  // 5. Test Mark Single as Read for User A
  console.log("\n--- Testing Single Notification Mark-as-Read ---");
  await pgQuery(
    `UPDATE notifications SET read_at = now() WHERE id = $1 AND recipient_id = $2 AND recipient_type = 'CITIZEN'`,
    [notifA1Id, cleanUserAId]
  );

  const queryAAfterSingle = await pgQuery(
    `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN' ORDER BY created_at DESC`,
    [cleanUserAId]
  );
  const notifA1Updated = queryAAfterSingle.find((n) => n.id === notifA1Id);
  const notifA2Updated = queryAAfterSingle.find((n) => n.id === notifA2Id);

  assert(Boolean(notifA1Updated?.read_at), "Notification A1 is marked as read");
  assert(!notifA2Updated?.read_at, "Notification A2 remains unread");
  const unreadAAfterSingle = queryAAfterSingle.filter((n) => !n.read_at).length;
  assert(unreadAAfterSingle === 1, `User A unread count correctly decremented from 2 to 1`);

  // Verify User B unread count remains unchanged
  const queryBUnchanged = await pgQuery(
    `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN' AND read_at IS NULL`,
    [cleanUserBId]
  );
  assert(queryBUnchanged.length === 1, "User B notification unread status untouched by User A action");

  // 6. Test Mark All as Read for User A
  console.log("\n--- Testing Mark All as Read ---");
  await pgQuery(
    `UPDATE notifications SET read_at = now() WHERE recipient_id = $1 AND recipient_type = 'CITIZEN' AND read_at IS NULL`,
    [cleanUserAId]
  );

  const queryAAllRead = await pgQuery(
    `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN'`,
    [cleanUserAId]
  );
  const unreadAAll = queryAAllRead.filter((n) => !n.read_at).length;
  assert(unreadAAll === 0, `User A unread count is 0 after mark-all-read (badge hidden, count = 0)`);

  // User B still has unread notification
  const queryBStillUnread = await pgQuery(
    `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN' AND read_at IS NULL`,
    [cleanUserBId]
  );
  assert(queryBStillUnread.length === 1, "User B unread count is still 1 after User A cleared all");

  // ------------------------------------------------------------------
  // PART B: GOOGLE OAUTH & REDIRECT DESTINATION TESTS
  // ------------------------------------------------------------------
  console.log("\n--- PART B: Google OAuth Flow & Profile Destination Tests ---");

  // 7. Brand new Google citizen: incomplete profile -> /onboarding/profile?step=1
  const newGoogleEmail = `new_google_citizen_${timestamp}@gmail.com`;
  const googleNew = await findOrCreateGoogleUser({
    email: newGoogleEmail,
    name: "Rohan Gupta",
    avatar: "https://lh3.googleusercontent.com/rohan-avatar",
    providerAccountId: `google_sub_${timestamp}`,
  });

  assert(googleNew.isNewUser === true, "New Google user flagged as isNewUser: true");
  const newFields = await getUserProfileFields(googleNew.user.id);
  const newOnboarding = checkOnboardingStatus(newFields, googleNew.user);
  assert(newOnboarding.isComplete === false, "New Google user profile is incomplete");
  const destinationNew = newOnboarding.isComplete ? "/dashboard" : "/onboarding/profile?step=1";
  assert(destinationNew === "/onboarding/profile?step=1", "New Google user destination correctly routes to /onboarding/profile?step=1");

  // 8. Returning Google citizen with complete profile -> /dashboard
  const existingGoogleEmail = `returning_citizen_${timestamp}@gmail.com`;
  const returningReg = await registerUser("Meera Nair", existingGoogleEmail, "SecureMeera@2026", "9876543299");
  const returningId = returningReg.user.id;

  // Complete Meera's profile
  await updateUserProfileField(returningId, "full_name", "Meera Nair");
  await updateUserProfileField(returningId, "date_of_birth", "1998-11-20");
  await updateUserProfileField(returningId, "gender", "Female");
  await updateUserProfileField(returningId, "phone_number", "9876543299");
  await updateUserProfileField(returningId, "email", existingGoogleEmail);
  await updateUserProfileField(returningId, "location", "Kochi, Kerala");
  await updateUserProfileField(returningId, "district", "Ernakulam");
  await updateUserProfileField(returningId, "permanent_address", "42 Palm Grove, Marine Drive");
  await updateUserProfileField(returningId, "occupation", "Civil Engineer");

  const meeraFields = await getUserProfileFields(returningId);
  const meeraStatus = checkOnboardingStatus(meeraFields, returningReg.user);
  assert(meeraStatus.isComplete === true, "Meera profile is 100% complete");

  // Meera signs in via Google with identical email
  const googleReturning = await findOrCreateGoogleUser({
    email: existingGoogleEmail,
    name: "Meera Nair (Google)",
    avatar: "https://lh3.googleusercontent.com/meera",
    providerAccountId: `google_meera_${timestamp}`,
  });

  assert(googleReturning.isNewUser === false, "Existing user recognized on Google login (no duplicate profile)");
  assert(googleReturning.user.id === returningId, "CRITICAL: Linked to existing user ID (preserves user data & vault)");
  const returningFields = await getUserProfileFields(googleReturning.user.id);
  const returningStatus = checkOnboardingStatus(returningFields, googleReturning.user);
  assert(returningStatus.isComplete === true, "Profile remains complete after Google login");
  const destinationReturning = returningStatus.isComplete ? "/dashboard" : "/onboarding/profile?step=1";
  assert(destinationReturning === "/dashboard", "Returning user with completed profile routes cleanly to /dashboard");

  // 9. Session Verification & Portal Isolation
  const validToken = googleReturning.token;
  const verifiedUser = await authenticateSession(validToken);
  assert(verifiedUser !== null, "Stateless citizen session token is valid and verifiable");
  assert(verifiedUser?.id === returningId, "Session resolves to correct authenticated citizen ID");

  console.log("\n========================================================");
  console.log("   ALL NOTIFICATIONS & GOOGLE OAUTH TESTS PASSED (100%)");
  console.log("========================================================\n");
}

runNotificationsAndOAuthTestSuite().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
