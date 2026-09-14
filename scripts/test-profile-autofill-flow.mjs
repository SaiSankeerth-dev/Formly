import assert from "node:assert/strict";
import { GET as profileGET, PATCH as profilePATCH } from "../src/app/api/profile/route.ts";
import { GET as dashboardGET } from "../src/app/api/dashboard/route.ts";
import { GET as autofillGET, POST as autofillPOST } from "../src/app/api/agent/autofill/route.ts";
import { signSessionToken, registerUser } from "../src/lib/server/db.ts";
import { getAuthoritativeDb } from "../src/lib/server/pg-db.ts";

console.log("===============================================================");
console.log("   SEVA SAARTHI: PROFILE, ONBOARDING & AUTOFILL FLOW TEST");
console.log("===============================================================\n");

// Ensure DB is ready
await getAuthoritativeDb();

// ----------------------------------------------------------------------------
// 1. Test Unauthenticated Requests
// ----------------------------------------------------------------------------
console.log("--- 1. Testing Unauthenticated Route Protections ---");

const unauthReq = new Request("http://localhost:3000/api/profile");
const unauthProfileRes = await profileGET(unauthReq);
assert.equal(unauthProfileRes.status, 401, "Unauthenticated /api/profile must return 401");
console.log("✓ /api/profile rejected unauthenticated access with 401");

const unauthDashRes = await dashboardGET(new Request("http://localhost:3000/api/dashboard"));
assert.equal(unauthDashRes.status, 401, "Unauthenticated /api/dashboard must return 401");
console.log("✓ /api/dashboard rejected unauthenticated access with 401");

const unauthAutofillRes = await autofillGET(new Request("http://localhost:3000/api/agent/autofill"));
assert.equal(unauthAutofillRes.status, 401, "Unauthenticated /api/agent/autofill must return 401");
console.log("✓ /api/agent/autofill rejected unauthenticated access with 401");

// ----------------------------------------------------------------------------
// 2. User A Registration & Incomplete Profile Check
// ----------------------------------------------------------------------------
console.log("\n--- 2. Registering User A (Aarav Sharma) & Verifying Incomplete State ---");

const timestamp = Date.now();
const regA = await registerUser(
  "Aarav Sharma",
  `aarav_${timestamp}@test.gov.in`,
  "Password123!",
  "9811223344"
);
const userA = regA.user;
const tokenA = regA.token;
assert(userA?.id, "User A must be created");

const reqProfileA_Initial = new Request("http://localhost:3000/api/profile", {
  headers: {
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
});
const resProfileA_Initial = await profileGET(reqProfileA_Initial);
assert.equal(resProfileA_Initial.status, 200);
const dataProfileA_Initial = await resProfileA_Initial.json();
assert.equal(dataProfileA_Initial.completed, false, "New User A profile must NOT be marked complete");
assert.equal(dataProfileA_Initial.currentStep, 1, "New User A must start at step 1");
console.log("✓ User A initially has completed === false and currentStep === 1");

const reqDashA_Initial = new Request("http://localhost:3000/api/dashboard", {
  headers: {
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
});
const resDashA_Initial = await dashboardGET(reqDashA_Initial);
assert.equal(resDashA_Initial.status, 200);
const dataDashA_Initial = await resDashA_Initial.json();
assert.equal(dataDashA_Initial.profile.completed, false, "Dashboard must reflect incomplete profile");
console.log("✓ Dashboard confirms User A profile is incomplete, enforcing /onboarding/profile route");

// ----------------------------------------------------------------------------
// 3. User A Completes 4-Step Onboarding
// ----------------------------------------------------------------------------
console.log("\n--- 3. User A Completes Onboarding Wizard Steps ---");

// Step 1: Personal Info
const step1Res = await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
  body: JSON.stringify({
    fields: {
      full_name: "Aarav Sharma",
      father_name: "Mahesh Sharma",
      mother_name: "Sunita Sharma",
      date_of_birth: "2002-04-10",
      gender: "Male",
    },
  }),
}));
assert.equal(step1Res.status, 200);
console.log("✓ User A Step 1 (Personal Info) saved");

// Step 2: Contact Info
const step2Res = await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
  body: JSON.stringify({
    fields: {
      phone_number: "9811223344",
      mobile: "9811223344",
      phone_verified: "true",
      email: "aarav.sharma@test.gov.in",
    },
  }),
}));
assert.equal(step2Res.status, 200);
console.log("✓ User A Step 2 (Contact & Verified Phone) saved");

// Step 3: Address
const step3Res = await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
  body: JSON.stringify({
    fields: {
      state: "Telangana",
      district: "Medchal-Malkajgiri",
      mandal: "Ghatkesar",
      city: "Pocharam",
      permanent_address: "Flat 402, Green Meadows, Pocharam",
      pincode: "501301",
    },
  }),
}));
assert.equal(step3Res.status, 200);
console.log("✓ User A Step 3 (Address) saved");

// Step 4: Additional Info & Complete
const step4Res = await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
  body: JSON.stringify({
    fields: {
      occupation: "Student",
      education_degree: "B.Tech Computer Science",
      caste_category: "General",
      college_name: "CVR College of Engineering",
      profile_completed: "true",
    },
  }),
}));
assert.equal(step4Res.status, 200);
const step4Data = await step4Res.json();
assert.equal(step4Data.completed, true, "User A profile must now be completed");
console.log("✓ User A Step 4 (Additional Info) saved with profile_completed: 'true'");

// Verify profile and dashboard now report completed: true
const profileA_After = await (await profileGET(reqProfileA_Initial)).json();
assert.equal(profileA_After.completed, true);
console.log("✓ /api/profile confirms User A completed === true (permits viewing /profile without redirect)");

const dashA_After = await (await dashboardGET(reqDashA_Initial)).json();
assert.equal(dashA_After.profile.completed, true);
console.log("✓ /api/dashboard confirms User A completed === true (permits viewing /dashboard)");

// ----------------------------------------------------------------------------
// 4. User A Autofill Payload Verification
// ----------------------------------------------------------------------------
console.log("\n--- 4. Verifying User A Autofill Payload (Zero Mock Fallbacks) ---");

const reqAutofillA = new Request("http://localhost:3000/api/agent/autofill", {
  headers: {
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
});
const resAutofillA = await autofillGET(reqAutofillA);
assert.equal(resAutofillA.status, 200);
const dataAutofillA = await resAutofillA.json();

const cA = dataAutofillA.data.canonicalFields;
assert.equal(cA.full_name, "Aarav Sharma");
assert.equal(cA.father_name, "Mahesh Sharma");
assert.equal(cA.mother_name, "Sunita Sharma");
assert.equal(cA.date_of_birth, "2002-04-10");
assert.equal(cA.gender, "Male");
assert.equal(cA.district, "Medchal-Malkajgiri");
assert.equal(cA.pincode, "501301");
assert.notEqual(cA.full_name, "Sai Sankeerth", "User A must not be Sai Sankeerth");
assert.notEqual(cA.father_name, "Suresh Kumar", "User A father must not be Suresh Kumar");
assert.notEqual(cA.district, "Hyderabad", "User A district must not fallback to Hyderabad");
console.log("✓ User A autofill payload accurately reflects User A's profile with ZERO mock defaults");

// ----------------------------------------------------------------------------
// 5. User B Registration, Setup & Autofill Verification
// ----------------------------------------------------------------------------
console.log("\n--- 5. Registering User B (Priya Patel) & Testing Cross-User Isolation ---");

const regB = await registerUser(
  "Priya Patel",
  `priya_${timestamp}@test.gov.in`,
  "Password123!",
  "9988776655"
);
const userB = regB.user;
const tokenB = regB.token;
assert(userB?.id, "User B must be created");
assert.notEqual(userB.id, userA.id, "User B ID must be distinct from User A ID");

// Complete User B's profile with completely different data
await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenB}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenB}`,
  },
  body: JSON.stringify({
    fields: {
      full_name: "Priya Patel",
      father_name: "Kishore Patel",
      mother_name: "Meena Patel",
      date_of_birth: "1999-11-20",
      gender: "Female",
      phone_number: "9988776655",
      mobile: "9988776655",
      phone_verified: "true",
      email: "priya.patel@test.gov.in",
      state: "Karnataka",
      district: "Bengaluru Urban",
      mandal: "Bengaluru South",
      city: "Bengaluru",
      permanent_address: "12/A, Koramangala 4th Block",
      pincode: "560034",
      occupation: "Software Engineer",
      education_degree: "M.Tech",
      caste_category: "General",
      college_name: "IISc Bengaluru",
      profile_completed: "true",
    },
  }),
}));

const reqAutofillB = new Request("http://localhost:3000/api/agent/autofill", {
  headers: {
    Authorization: `Bearer ${tokenB}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenB}`,
  },
});
const resAutofillB = await autofillGET(reqAutofillB);
assert.equal(resAutofillB.status, 200);
const dataAutofillB = await resAutofillB.json();

const cB = dataAutofillB.data.canonicalFields;
assert.equal(cB.full_name, "Priya Patel");
assert.equal(cB.father_name, "Kishore Patel");
assert.equal(cB.mother_name, "Meena Patel");
assert.equal(cB.date_of_birth, "1999-11-20");
assert.equal(cB.gender, "Female");
assert.equal(cB.district, "Bengaluru Urban");
assert.equal(cB.pincode, "560034");

// ----------------------------------------------------------------------------
// 6. Strict Multi-User Non-Interference Assertions
// ----------------------------------------------------------------------------
console.log("\n--- 6. Verifying Mutual Non-Interference (User A !== User B) ---");

assert.notEqual(cA.full_name, cB.full_name, "Names must be isolated");
assert.notEqual(cA.father_name, cB.father_name, "Fathers must be isolated");
assert.notEqual(cA.mother_name, cB.mother_name, "Mothers must be isolated");
assert.notEqual(cA.date_of_birth, cB.date_of_birth, "DOB must be isolated");
assert.notEqual(cA.district, cB.district, "Districts must be isolated");
assert.notEqual(cA.pincode, cB.pincode, "Pincodes must be isolated");
assert.notEqual(cA.mobile, cB.mobile, "Mobiles must be isolated");

console.log("✓ User A full_name ('Aarav Sharma') !== User B full_name ('Priya Patel')");
console.log("✓ User A father ('Mahesh Sharma') !== User B father ('Kishore Patel')");
console.log("✓ User A mother ('Sunita Sharma') !== User B mother ('Meena Patel')");
console.log("✓ User A district ('Medchal-Malkajgiri') !== User B district ('Bengaluru Urban')");
console.log("✓ User A pincode ('501301') !== User B pincode ('560034')");
console.log("✓ ZERO cross-contamination or shared mock data detected!");

// ----------------------------------------------------------------------------
// 7. Live Form MAP_FIELDS Action Isolation
// ----------------------------------------------------------------------------
console.log("\n--- 7. Verifying MAP_FIELDS Action Isolation ---");

const testInputs = [
  { id: "inp_name", name: "applicant_name", label: "Applicant Name" },
  { id: "inp_father", name: "father_name", label: "Father's Full Name" },
  { id: "inp_dist", name: "district", label: "District" },
  { id: "inp_pin", name: "pincode", label: "PIN Code" },
];

const mapResA = await autofillPOST(new Request("http://localhost:3000/api/agent/autofill", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
  body: JSON.stringify({ action: "MAP_FIELDS", fields: testInputs }),
}));
const mapDataA = await mapResA.json();
const mappedValuesA = Object.fromEntries(mapDataA.mappings.map((m) => [m.canonicalField, m.value]));

assert.equal(mappedValuesA.full_name, "Aarav Sharma");
assert.equal(mappedValuesA.father_name, "Mahesh Sharma");
assert.equal(mappedValuesA.district, "Medchal-Malkajgiri");
assert.equal(mappedValuesA.pincode, "501301");
console.log("✓ MAP_FIELDS correctly returned User A's values for User A's session");

const mapResB = await autofillPOST(new Request("http://localhost:3000/api/agent/autofill", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenB}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenB}`,
  },
  body: JSON.stringify({ action: "MAP_FIELDS", fields: testInputs }),
}));
const mapDataB = await mapResB.json();
const mappedValuesB = Object.fromEntries(mapDataB.mappings.map((m) => [m.canonicalField, m.value]));

assert.equal(mappedValuesB.full_name, "Priya Patel");
assert.equal(mappedValuesB.father_name, "Kishore Patel");
assert.equal(mappedValuesB.district, "Bengaluru Urban");
assert.equal(mappedValuesB.pincode, "560034");
console.log("✓ MAP_FIELDS correctly returned User B's values for User B's session");

// ----------------------------------------------------------------------------
// 8. Anti-Spoofing & Server-Authoritative Ownership Security Check
// ----------------------------------------------------------------------------
console.log("\n--- 8. Testing Ownership & Anti-Spoofing Protections ---");

// User A attempts to pass userId of User B in query parameter
const spoofReq = new Request(`http://localhost:3000/api/profile?userId=${userB.id}`, {
  headers: {
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
});
const spoofRes = await profileGET(spoofReq);
assert.equal(spoofRes.status, 200);
const spoofData = await spoofRes.json();
assert.equal(spoofData.user.id, userA.id, "Profile API must strictly resolve User A ID from server session");
assert.notEqual(spoofData.user.id, userB.id, "User A cannot spoof User B by passing query parameter");
console.log("✓ /api/profile strictly derives identity from verified server session (spoofing blocked)");

// User A attempts to request User B data in autofill POST
const spoofAutofillReq = new Request("http://localhost:3000/api/agent/autofill", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenA}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenA}`,
  },
  body: JSON.stringify({
    action: "GET_AUTOFILL_DATA",
    userId: userB.id,
    email: userB.email,
  }),
});
const spoofAutofillRes = await autofillPOST(spoofAutofillReq);
assert.equal(spoofAutofillRes.status, 200);
const spoofAutofillData = await spoofAutofillRes.json();
assert.equal(spoofAutofillData.payload.canonicalFields.full_name, "Aarav Sharma", "Autofill API must ignore client-supplied userId/email");
console.log("✓ /api/agent/autofill ignores client-supplied userId/email (spoofing blocked)");

// ----------------------------------------------------------------------------
// 9. Onboarding Progression with Unverified Phone (Graceful SMS offline/disabled)
// ----------------------------------------------------------------------------
console.log("\n--- 9. Verifying Onboarding Completion with Unverified Phone ---");

const timestampC = Date.now() + 1;
const regC = await registerUser(
  "Devika Nair",
  `devika_${timestampC}@test.gov.in`,
  "Password123!",
  "9822334455"
);
const tokenC = regC.token;

// Step 1: Personal
await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenC}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenC}`,
  },
  body: JSON.stringify({
    fields: {
      full_name: "Devika Nair",
      date_of_birth: "2001-07-22",
      gender: "Female",
    },
  }),
}));

// Step 2: Contact with phone_verified: "false" (e.g. SMS provider not configured)
await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenC}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenC}`,
  },
  body: JSON.stringify({
    fields: {
      phone_number: "9822334455",
      mobile: "9822334455",
      phone_verified: "false",
      email: `devika_${timestampC}@test.gov.in`,
    },
  }),
}));

// Step 3: Address
await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenC}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenC}`,
  },
  body: JSON.stringify({
    fields: {
      state: "Kerala",
      district: "Ernakulam",
      permanent_address: "12/4 Marine Drive, Kochi",
      pincode: "682031",
    },
  }),
}));

// Step 4: Additional Info & Complete
const step4ResC = await profilePATCH(new Request("http://localhost:3000/api/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenC}`,
    Cookie: `FORMLY_CITIZEN_SESSION=${tokenC}`,
  },
  body: JSON.stringify({
    fields: {
      occupation: "Research Scholar",
      education_degree: "M.Sc Physics",
      caste_category: "General",
      profile_completed: "true",
    },
  }),
}));
const step4DataC = await step4ResC.json();
assert.equal(step4DataC.completed, true, "User C must complete onboarding even if phone is unverified");
console.log("✓ User C onboarding completed successfully with unverified phone (graceful offline progression)");

console.log("\n===============================================================");
console.log("   🎉 ALL PROFILE, ONBOARDING & AUTOFILL TESTS PASSED (100%)");
console.log("===============================================================");
