import {
  registerUser,
  loginUser,
  findOrCreateGoogleUser,
  authenticateSession,
  logoutSession,
  getUserProfileFields,
  updateUserProfileField,
  getUserDocuments,
  addDocumentForUser,
} from "../src/lib/server/db.ts";
import { checkOnboardingStatus } from "../src/lib/constants/profile.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
}

async function runGoogleAuthTests() {
  console.log("\n========================================================");
  console.log("   SEVA SAARTHI — GOOGLE OAUTH & ACCOUNT LINKING TESTS");
  console.log("========================================================\n");

  const timestamp = Date.now();
  const googleEmailNew = `google_citizen_${timestamp}@gmail.com`;
  const linkedEmail = `linked_citizen_${timestamp}@gmail.com`;

  // 1. New Google User Signup Flow
  console.log("--- 1. New Google User Login & Session Creation ---");
  const googleResultNew = await findOrCreateGoogleUser({
    email: googleEmailNew,
    name: "Arjun Verma",
    avatar: "https://lh3.googleusercontent.com/a/sample-avatar",
    providerAccountId: `g_${timestamp}`,
  });

  assert(googleResultNew.isNewUser === true, "New Google user is flagged as isNewUser: true");
  assert(Boolean(googleResultNew.user && googleResultNew.user.id), "User ID generated");
  assert(googleResultNew.user.email === googleEmailNew, "Email matches Google email");
  assert(googleResultNew.user.name === "Arjun Verma", "Name mapped from Google profile");
  assert(Boolean(googleResultNew.token), "Stateless HMAC session token generated");

  // Verify Session Token
  const authCheckNew = await authenticateSession(googleResultNew.token);
  assert(authCheckNew !== null, "Session token successfully authenticates");
  assert(authCheckNew?.id === googleResultNew.user.id, "Session resolves to correct user ID");

  // Verify Profile Onboarding Check for New Google User
  const newProfileFields = await getUserProfileFields(googleResultNew.user.id);
  const newStatus = checkOnboardingStatus(newProfileFields, googleResultNew.user);
  assert(newStatus.isComplete === false, "New Google user profile is incomplete -> redirects to /onboarding/profile");
  assert(newStatus.currentStep === 1, "New Google user starts at onboarding step 1");

  // 2. Existing Email User Signs in with Google (Safe Account Linking)
  console.log("\n--- 2. Safe Account Linking (Email User signs in with Google) ---");
  const regEmailUser = await registerUser(
    "Kavita Reddy",
    linkedEmail,
    "SecureKavitaPass@2026",
    "9876500001"
  );
  const originalUserId = regEmailUser.user.id;
  assert(Boolean(originalUserId), `Original email account created with ID ${originalUserId}`);

  // Complete profile for this user
  await updateUserProfileField(originalUserId, "full_name", "Kavita Reddy");
  await updateUserProfileField(originalUserId, "date_of_birth", "1997-04-10");
  await updateUserProfileField(originalUserId, "gender", "Female");
  await updateUserProfileField(originalUserId, "phone_number", "9876500001");
  await updateUserProfileField(originalUserId, "email", linkedEmail);
  await updateUserProfileField(originalUserId, "location", "Warangal, Telangana");
  await updateUserProfileField(originalUserId, "district", "Warangal");
  await updateUserProfileField(originalUserId, "permanent_address", "H.No 3-12, Station Road");
  await updateUserProfileField(originalUserId, "occupation", "Data Analyst");

  const completedFields = await getUserProfileFields(originalUserId);
  const initialStatus = checkOnboardingStatus(completedFields, regEmailUser.user);
  assert(initialStatus.isComplete === true, "Email user profile is 100% complete");

  // Now user signs in with Google using the same email address
  console.log("Signing in with Google using identical email...");
  const googleLinkedResult = await findOrCreateGoogleUser({
    email: linkedEmail,
    name: "Kavita Reddy (Google)",
    avatar: "https://lh3.googleusercontent.com/a/sample-avatar-kavita",
    providerAccountId: `g_kavita_${timestamp}`,
  });

  assert(googleLinkedResult.isNewUser === false, "Existing user recognized, isNewUser is false");
  assert(googleLinkedResult.user.id === originalUserId, "CRITICAL: Linked to existing user ID (no duplicate user created)");
  assert(googleLinkedResult.user.email === linkedEmail, "Email preserved");

  // Verify that profile remains complete and routes to /dashboard
  const linkedProfileFields = await getUserProfileFields(googleLinkedResult.user.id);
  const linkedStatus = checkOnboardingStatus(linkedProfileFields, googleLinkedResult.user);
  assert(linkedStatus.isComplete === true, "Profile remains complete after Google link -> redirects to /dashboard");

  // 3. Multi-User Isolation between Email User and Google User
  console.log("\n--- 3. Multi-User Isolation (User A: Email vs User B: Google) ---");
  const docAId = crypto.randomUUID();
  await addDocumentForUser(
    originalUserId,
    {
      id: docAId,
      user_id: originalUserId,
      document_type: "AADHAAR",
      storage_path: "/vault/aadhaar_kavita.pdf",
      original_filename: "Aadhaar_Kavita.pdf",
      mime_type: "application/pdf",
      status: "VERIFIED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    []
  );

  const docsUserA = await getUserDocuments(originalUserId);
  const docsUserB = await getUserDocuments(googleResultNew.user.id);

  assert(docsUserA.some((d) => d.id === docAId), "User A sees doc A");
  assert(!docsUserB.some((d) => d.id === docAId), "CRITICAL: Google User B CANNOT see User A documents");

  // 4. Session Invalidation Test
  console.log("\n--- 4. Google Session Logout & Invalidation ---");
  const tokenNew = googleResultNew.token;
  assert(await authenticateSession(tokenNew) !== null, "Google session token is valid");
  await logoutSession(tokenNew);
  assert(await authenticateSession(tokenNew) === null, "Google session token is invalidated on logout");

  console.log("\n========================================================");
  console.log("   ALL GOOGLE AUTH & ACCOUNT LINKING TESTS PASSED! (100%)");
  console.log("========================================================\n");
}

runGoogleAuthTests().catch((err) => {
  console.error("Google Auth test failed:", err);
  process.exit(1);
});
