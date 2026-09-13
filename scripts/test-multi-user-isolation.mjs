import {
  registerUser,
  loginUser,
  authenticateSession,
  logoutSession,
  getUserProfileFields,
  updateUserProfileField,
  getUserDocuments,
  addDocumentForUser,
  updateDocumentForUser,
  getCitizenSessions,
  saveCitizenSession,
} from "../src/lib/server/db.ts";
import { POPULAR_SERVICES_LIST } from "../src/lib/services/popular-services-data.ts";
import { checkOnboardingStatus } from "../src/lib/constants/profile.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
}

async function runMultiUserIsolationTests() {
  console.log("\n========================================================");
  console.log("   SEVA SAARTHI — MULTI-USER ISOLATION & REGISTRY TESTS");
  console.log("========================================================\n");

  const timestamp = Date.now();
  const userAEmail = `citizen_a_${timestamp}@test.seva.in`;
  const userBEmail = `citizen_b_${timestamp}@test.seva.in`;

  // 1. Register User A
  console.log("--- 1. Registering User A (Sai Sankeerth) ---");
  const regA = await registerUser("Sai Sankeerth", userAEmail, "SecurePassA@2026", "9876543210");
  const userA = regA.user;
  const tokenA = regA.token;
  assert(userA && userA.id, `User A registered with ID ${userA.id}`);
  assert(userA.name === "Sai Sankeerth", "User A name matches");

  // 2. Set Profile A for User A
  console.log("\n--- 2. Setting User A Profile & Documents ---");
  await updateUserProfileField(userA.id, "full_name", "Sai Sankeerth");
  await updateUserProfileField(userA.id, "date_of_birth", "2001-08-15");
  await updateUserProfileField(userA.id, "gender", "Male");
  await updateUserProfileField(userA.id, "phone_number", "9876543210");
  await updateUserProfileField(userA.id, "email", userAEmail);
  await updateUserProfileField(userA.id, "location", "Hyderabad, Telangana");
  await updateUserProfileField(userA.id, "district", "Hyderabad");
  await updateUserProfileField(userA.id, "permanent_address", "Flat 402, Cyber Towers, Madhapur");
  await updateUserProfileField(userA.id, "occupation", "Software Engineer");

  const fieldsAComplete = await getUserProfileFields(userA.id);
  const statusA = checkOnboardingStatus(fieldsAComplete, userA);
  assert(statusA.isComplete === true, "User A with all 4 steps saved is marked complete");

  const docAId = crypto.randomUUID();
  await addDocumentForUser(
    userA.id,
    {
      id: docAId,
      user_id: userA.id,
      document_type: "AADHAAR",
      storage_path: "/vault/aadhaar_sai.pdf",
      original_filename: "Aadhaar_Sai_Card.pdf",
      mime_type: "application/pdf",
      status: "VERIFIED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    []
  );

  await saveCitizenSession(userA.id, {
    serviceId: "pan-application-protean",
    serviceName: "PAN Application",
    department: "Income Tax Department",
    officialUrl: "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
    status: "Work in progress",
    nextAction: "Continue form",
  });
  console.log("User A profile, document, and session created.");

  // 3. Register User B
  console.log("\n--- 3. Registering User B (Rahul Kumar) ---");
  const regB = await registerUser("Rahul Kumar", userBEmail, "SecurePassB@2026", "9876543211");
  const userB = regB.user;
  const tokenB = regB.token;
  assert(userB && userB.id, `User B registered with ID ${userB.id}`);
  assert(userB.id !== userA.id, "User B ID is completely distinct from User A ID");

  // 4. Verify User B starts clean (no data leakage from User A)
  console.log("\n--- 4. Verifying User B Isolation on First Login ---");
  const profileBInitial = await getUserProfileFields(userB.id);
  assert(profileBInitial.length <= 1, `User B has at most 1 initial profile field (found ${profileBInitial.length})`);
  assert(!profileBInitial.some(f => f.user_id === userA.id), "Zero fields belong to User A");
  const statusBInitial = checkOnboardingStatus(profileBInitial);
  assert(statusBInitial.isComplete === false, "User B starts with isComplete === false (first-login onboarding required)");
  assert(statusBInitial.currentStep === 1, "User B starts at onboarding wizard step 1");

  const docsBInitial = await getUserDocuments(userB.id);
  assert(docsBInitial.length === 0, `User B has 0 documents (found ${docsBInitial.length})`);

  const sessionsBInitial = await getCitizenSessions(userB.id);
  assert(sessionsBInitial.length === 0, `User B has 0 active sessions (found ${sessionsBInitial.length})`);

  // 5. Populate User B data
  console.log("\n--- 5. Populating User B Profile & Documents ---");
  await updateUserProfileField(userB.id, "full_name", "Rahul Kumar");
  await updateUserProfileField(userB.id, "district", "Bangalore");
  await updateUserProfileField(userB.id, "date_of_birth", "1998-05-20");

  const docBId = crypto.randomUUID();
  await addDocumentForUser(
    userB.id,
    {
      id: docBId,
      user_id: userB.id,
      document_type: "PASSPORT",
      storage_path: "/vault/passport_rahul.pdf",
      original_filename: "Passport_Rahul_Travel.pdf",
      mime_type: "application/pdf",
      status: "VERIFIED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    []
  );

  await saveCitizenSession(userB.id, {
    serviceId: "scholarship-nsp",
    serviceName: "National Scholarship",
    department: "Ministry of Education",
    officialUrl: "https://scholarships.gov.in/",
    status: "Work in progress",
    nextAction: "Review documents",
  });

  // 6. Cross-User Isolation Assertions
  console.log("\n--- 6. Verifying Mutual Cross-User Isolation ---");

  // Check User A
  const fieldsA = await getUserProfileFields(userA.id);
  const fullNameA = fieldsA.find((f) => f.field_name === "full_name")?.value;
  const districtA = fieldsA.find((f) => f.field_name === "district")?.value;
  assert(fullNameA === "Sai Sankeerth", "User A profile returns Sai Sankeerth");
  assert(districtA === "Hyderabad", "User A district is Hyderabad");

  const docsA = await getUserDocuments(userA.id);
  assert(docsA.some((d) => d.id === docAId), "User A sees doc A");
  assert(!docsA.some((d) => d.id === docBId), "CRITICAL: User A CANNOT see User B doc (Passport_Rahul)");

  const sessionsA = await getCitizenSessions(userA.id);
  assert(sessionsA.some((s) => s.serviceId === "pan-application-protean"), "User A sees PAN session");
  assert(!sessionsA.some((s) => s.serviceId === "scholarship-nsp"), "CRITICAL: User A CANNOT see User B session (Scholarship)");

  // Check User B
  const fieldsB = await getUserProfileFields(userB.id);
  const fullNameB = fieldsB.find((f) => f.field_name === "full_name")?.value;
  const districtB = fieldsB.find((f) => f.field_name === "district")?.value;
  assert(fullNameB === "Rahul Kumar", "User B profile returns Rahul Kumar");
  assert(districtB === "Bangalore", "User B district is Bangalore");

  const docsB = await getUserDocuments(userB.id);
  assert(docsB.some((d) => d.id === docBId), "User B sees doc B");
  assert(!docsB.some((d) => d.id === docAId), "CRITICAL: User B CANNOT see User A doc (Aadhaar_Sai)");

  const sessionsB = await getCitizenSessions(userB.id);
  assert(sessionsB.some((s) => s.serviceId === "scholarship-nsp"), "User B sees Scholarship session");
  assert(!sessionsB.some((s) => s.serviceId === "pan-application-protean"), "CRITICAL: User B CANNOT see User A session (PAN)");

  // 7. Session Security & Logout
  console.log("\n--- 7. Testing Session Authentication & Logout Invalidation ---");
  const authA = await authenticateSession(tokenA);
  assert(authA && authA.id === userA.id, "Token A validates as User A");

  const authB = await authenticateSession(tokenB);
  assert(authB && authB.id === userB.id, "Token B validates as User B");

  await logoutSession(tokenA);
  const authAfterLogoutA = await authenticateSession(tokenA);
  assert(authAfterLogoutA === null, "Token A is completely invalidated after logout");

  const authAfterLogoutB = await authenticateSession(tokenB);
  assert(authAfterLogoutB !== null && authAfterLogoutB.id === userB.id, "Token B remains active and unaffected by User A logout");

  // 8. Test Real PAN Application URL in Service Registry
  console.log("\n--- 8. Testing Official PAN URL in Registry (Section 35) ---");
  const panService = POPULAR_SERVICES_LIST.find((s) => s.id === "pan-application-protean");
  assert(Boolean(panService), "PAN service exists in service registry");
  assert(
    panService.officialApplicationUrl === "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
    `Exact Protean PAN URL verified: ${panService.officialApplicationUrl}`
  );
  assert(
    panService.officialDomain === "onlineservices.proteantech.in",
    `Approved domain verified: ${panService.officialDomain}`
  );

  // 9. Document Preparation Persistence & Isolation
  console.log("\n--- 9. Testing Document Preparation Persistence & Isolation ---");
  const targetPreparedBytes = 188416; // 184 KB
  await updateDocumentForUser(userA.id, docAId, {
    prepared_size_bytes: targetPreparedBytes,
    status: "VERIFIED",
  });

  const updatedDocsA = await getUserDocuments(userA.id);
  const updatedDocA = updatedDocsA.find((d) => d.id === docAId);
  assert(Boolean(updatedDocA), "User A doc A retrieved after preparation");
  assert(Number(updatedDocA.prepared_size_bytes) === targetPreparedBytes, `Doc A prepared size updated to ${targetPreparedBytes} bytes`);

  const updatedDocsB = await getUserDocuments(userB.id);
  const updatedDocB = updatedDocsB.find((d) => d.id === docBId);
  assert(Number(updatedDocB.prepared_size_bytes || 0) !== targetPreparedBytes, "CRITICAL: User B doc B prepared size was unaffected by User A doc preparation");

  // 10. Step-by-Step Profile Onboarding Progression
  console.log("\n--- 10. Testing Step-by-Step Profile Onboarding Progression ---");
  const userCEmail = `citizen_c_${timestamp}@test.seva.in`;
  const regC = await registerUser("Priya Sharma", userCEmail, "SecurePassC@2026", "9876543212");
  const userC = regC.user;

  // Initial: clean user must be on Step 1 and not complete
  const initialStatusC = checkOnboardingStatus(await getUserProfileFields(userC.id));
  assert(!initialStatusC.isComplete, "User C onboarding is initially incomplete");
  assert(initialStatusC.currentStep === 1, `User C starts at step 1 (got ${initialStatusC.currentStep})`);

  // Complete Step 1
  await updateUserProfileField(userC.id, "full_name", "Priya Sharma");
  await updateUserProfileField(userC.id, "date_of_birth", "1999-11-12");
  await updateUserProfileField(userC.id, "gender", "Female");
  const step1StatusC = checkOnboardingStatus(await getUserProfileFields(userC.id));
  assert(step1StatusC.isStep1, "Step 1 (Personal) marked complete");
  assert(step1StatusC.currentStep === 2, `User C advances to step 2 (got ${step1StatusC.currentStep})`);
  assert(!step1StatusC.isComplete, "User C still incomplete after step 1");

  // Complete Step 2
  await updateUserProfileField(userC.id, "phone_number", "9876543212");
  await updateUserProfileField(userC.id, "email", userCEmail);
  const step2StatusC = checkOnboardingStatus(await getUserProfileFields(userC.id));
  assert(step2StatusC.isStep2, "Step 2 (Contact) marked complete");
  assert(step2StatusC.currentStep === 3, `User C advances to step 3 (got ${step2StatusC.currentStep})`);

  // Complete Step 3
  await updateUserProfileField(userC.id, "state", "Telangana");
  await updateUserProfileField(userC.id, "district", "Hyderabad");
  await updateUserProfileField(userC.id, "permanent_address", "Flat 402, Lotus Residency");
  await updateUserProfileField(userC.id, "pincode", "500081");
  const step3StatusC = checkOnboardingStatus(await getUserProfileFields(userC.id));
  assert(step3StatusC.isStep3, "Step 3 (Address) marked complete");
  assert(step3StatusC.currentStep === 4, `User C advances to step 4 (got ${step3StatusC.currentStep})`);

  // Complete Step 4
  await updateUserProfileField(userC.id, "occupation", "Software Engineer");
  await updateUserProfileField(userC.id, "education_degree", "B.Tech Computer Science");
  await updateUserProfileField(userC.id, "caste_category", "General");
  const finalStatusC = checkOnboardingStatus(await getUserProfileFields(userC.id));
  assert(finalStatusC.isStep4, "Step 4 (Additional Info) marked complete");
  assert(finalStatusC.isComplete, "User C onboarding is 100% complete and ready for dashboard");

  // 11. Multi-Tab Logout & Concurrency Guard
  console.log("\n--- 11. Testing Multi-Tab Logout Invalidation Guard ---");
  // Simulate User B logs out in Tab 1
  await logoutSession(tokenB);
  // Tab 2 attempts operation using tokenB
  const tab2AuthCheck = await authenticateSession(tokenB);
  assert(tab2AuthCheck === null, "Tab 2 session check with invalidated token is rejected (auth is null)");

  console.log("\n========================================================");
  console.log("   ALL MULTI-USER ISOLATION & REGISTRY TESTS PASSED!");
  console.log("========================================================\n");
}

runMultiUserIsolationTests().catch((err) => {
  console.error("Multi-user isolation test failed:", err);
  process.exit(1);
});
