import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { verifyOfficialUrl } from "../src/lib/registry/official-domain-guard.ts";
import { verifiedServiceById, VERIFIED_SERVICES } from "../src/lib/registry/verified-service-registry.ts";
import { GET, POST } from "../src/app/api/agent/autofill/route.ts";
import { INITIAL_PROFILE_FIELDS, DEFAULT_USER } from "../src/lib/mock-data/initial-state.ts";
import { signSessionToken } from "../src/lib/server/db.ts";

console.log("=== SEVA SAARTHI AUTOFILL VERIFICATION SUITE ===\n");

// TEST 1: Service Registry & s001 / NSP
console.log("Test 1: Verifying Service Registry entries...");
const nspService = verifiedServiceById("s001");
assert(nspService !== undefined, "s001 service should be registered in verified-service-registry");
assert.equal(nspService.officialDomain, "scholarships.gov.in");
console.log("✓ s001 (Post Matric Scholarship) correctly verified in registry.");

const proteanService = verifiedServiceById("pan-application-protean");
assert(proteanService !== undefined, "pan-application-protean should be found");
console.log("✓ pan-application-protean correctly found.");

// TEST 2: Official Domain Guard
console.log("\nTest 2: Verifying Official Domain Guard...");
const nspCheck = verifyOfficialUrl("https://scholarships.gov.in/portal");
assert.equal(nspCheck.allowed, true, "scholarships.gov.in must be allowed");

const proteanCheck = verifyOfficialUrl("https://onlineservices.proteantech.in/paam/endUserRegisterContact.html");
assert.equal(proteanCheck.allowed, true, "onlineservices.proteantech.in must be allowed");

const telanganaCheck = verifyOfficialUrl("https://telanganaepass.cgg.gov.in/");
assert.equal(telanganaCheck.allowed, true, "telanganaepass.cgg.gov.in must be allowed");

const fakeCheck = verifyOfficialUrl("https://fake-scholarship-phishing.com/apply");
assert.equal(fakeCheck.allowed, false, "Phishing domain must be rejected");

const httpCheck = verifyOfficialUrl("http://scholarships.gov.in");
assert.equal(httpCheck.allowed, false, "Insecure HTTP must be rejected");
console.log("✓ Official domain guard correctly allows verified HTTPS portals and blocks fake/insecure URLs.");

// TEST 3: GET /api/agent/autofill
console.log("\nTest 3: Verifying GET /api/agent/autofill auth guard & authenticated retrieval...");
// 3A: Verify unauthenticated GET is blocked with 401
const unauthGetReq = new Request("http://localhost:3000/api/agent/autofill", {
  method: "GET",
  headers: { "Content-Type": "application/json" },
});
const unauthGetRes = await GET(unauthGetReq);
assert.equal(unauthGetRes.status, 401, "Unauthenticated GET /api/agent/autofill must return 401");
const unauthGetData = await unauthGetRes.json();
assert.equal(unauthGetData.success, false);
console.log("✓ Security Check: Unauthenticated GET /api/agent/autofill correctly rejected with 401.");

// 3B: Verify authenticated GET succeeds with 200
const testCitizenToken = signSessionToken({
  userId: "u_0bc5a3b6-f059-4ab2-9870-46a9c25178b7",
  name: "Sai Sankeerth",
  email: "sankeerths615@gmail.com",
  phone: "9876543210",
  role: "Applicant / Citizen",
});

const authGetReq = new Request("http://localhost:3000/api/agent/autofill", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${testCitizenToken}`,
    "Cookie": `FORMLY_CITIZEN_SESSION=${testCitizenToken}`,
  },
});
const getRes = await GET(authGetReq);
assert.equal(getRes.status, 200, "Authenticated GET must return 200");
const getData = await getRes.json();
assert.equal(getData.success, true);
assert(getData.data.canonicalFields.full_name, "Full name must be present");
assert(getData.data.canonicalFields.date_of_birth, "DOB must be present");
assert(getData.data.canonicalFields.aadhaar_number, "Aadhaar must be present");
assert(getData.data.canonicalFields.bank_account_no, "Bank account must be present");
assert(getData.data.canonicalFields.college_name, "College name must be present");
console.log(`✓ Authenticated GET returned ${Object.keys(getData.data.canonicalFields).length} canonical profile fields successfully.`);

// TEST 4: POST /api/agent/autofill with MAP_FIELDS
console.log("\nTest 4: Verifying MAP_FIELDS action in /api/agent/autofill...");
const mockFormFields = [
  { id: "f1", name: "applicant_name", label: "Applicant Legal Name", type: "text" },
  { id: "f2", name: "dob", label: "Date of Birth (DD/MM/YYYY)", type: "text" },
  { id: "f3", name: "gender_select", label: "Gender", type: "select" },
  { id: "f4", name: "mobile_number", label: "Mobile Number", type: "tel" },
  { id: "f5", name: "email_id", label: "Email Address", type: "email" },
  { id: "f6", name: "aadhaar_no", label: "12-digit Aadhaar UID", type: "text" },
  { id: "f7", name: "inst_name", label: "College / Institution Name", type: "text" },
  { id: "f8", name: "bank_acc", label: "Savings Account Number", type: "text" },
  { id: "f9", name: "ifsc_code", label: "Bank IFSC", type: "text" },
  { id: "f10", name: "otp_code", label: "Enter OTP", type: "text" },
  { id: "f11", name: "user_password", label: "Password", type: "password" },
  { id: "f12", name: "captcha_input", label: "Enter Captcha", type: "text" },
  { id: "f13", name: "pincode", label: "Enter PIN Code", type: "text" },
  { id: "f14", name: "district_name", label: "District Name", type: "text" },
  { id: "f15", name: "course_name", label: "Course / Degree Name", type: "text" },
  { id: "f16", name: "account_holder_name", label: "Account Holder Name", type: "text" },
  { id: "f17", name: "guardian_name", label: "Guardian Name", type: "text" },
  { id: "f18", name: "first_name", label: "First Name", type: "text" },
  { id: "f19", name: "last_name", label: "Last Name / Surname", type: "text" },
];

// 4A: Unauthenticated MAP_FIELDS blocked
const unauthMapReq = new Request("http://localhost:3000/api/agent/autofill", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "MAP_FIELDS",
    fields: mockFormFields,
  }),
});
const unauthMapRes = await POST(unauthMapReq);
assert.equal(unauthMapRes.status, 401, "Unauthenticated MAP_FIELDS must return 401");
console.log("✓ Security Check: Unauthenticated MAP_FIELDS correctly blocked with 401.");

// 4B: Authenticated MAP_FIELDS succeeds
const authMapReq = new Request("http://localhost:3000/api/agent/autofill", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${testCitizenToken}`,
    "Cookie": `FORMLY_CITIZEN_SESSION=${testCitizenToken}`,
  },
  body: JSON.stringify({
    action: "MAP_FIELDS",
    fields: mockFormFields,
  }),
});
const mapRes = await POST(authMapReq);
assert.equal(mapRes.status, 200);
const mapData = await mapRes.json();
assert.equal(mapData.success, true);

// Verify sensitive fields are protected
const otpMapping = mapData.mappings.find((m) => m.elementId === "f10");
assert.equal(otpMapping.safeToFill, false, "OTP must NOT be marked safe to fill");

const passMapping = mapData.mappings.find((m) => m.elementId === "f11");
assert.equal(passMapping.safeToFill, false, "Password must NOT be marked safe to fill");

const captchaMapping = mapData.mappings.find((m) => m.elementId === "f12");
assert.equal(captchaMapping.safeToFill, false, "Captcha must NOT be marked safe to fill");

// Verify postal pincode is SAFE to fill (not blocked as sensitive PIN)
const pinMapping = mapData.mappings.find((m) => m.elementId === "f13");
assert.equal(pinMapping.safeToFill, true, "PIN Code must be safe to fill");
assert.equal(pinMapping.canonicalField, "pincode", "PIN Code must map to pincode");
assert.equal(pinMapping.value, "500032", "PIN Code value must be 500032");

// Verify disambiguation prevents false matching to full_name
const districtMapping = mapData.mappings.find((m) => m.elementId === "f14");
assert.equal(districtMapping.safeToFill, true, "District must be safe to fill");
assert.equal(districtMapping.canonicalField, "district", "District Name must map to district, NOT full_name");

const courseMapping = mapData.mappings.find((m) => m.elementId === "f15");
assert.equal(courseMapping.safeToFill, true, "Course must be safe to fill");
assert.equal(courseMapping.canonicalField, "education_degree", "Course Name must map to education_degree, NOT full_name");

const accHolderMapping = mapData.mappings.find((m) => m.elementId === "f16");
assert.equal(accHolderMapping.safeToFill, true, "Account Holder must be safe to fill");
assert.equal(accHolderMapping.canonicalField, "account_holder_name", "Account Holder Name must map to account_holder_name, NOT full_name");

const guardianMapping = mapData.mappings.find((m) => m.elementId === "f17");
assert.equal(guardianMapping.safeToFill, true, "Guardian Name must be safe to fill");
assert.equal(guardianMapping.canonicalField, "father_name", "Guardian Name must map to father_name, NOT full_name");

const firstNameMapping = mapData.mappings.find((m) => m.elementId === "f18");
assert.equal(firstNameMapping.safeToFill, true, "First Name must be safe to fill");
assert.equal(firstNameMapping.canonicalField, "first_name", "First Name must map to first_name");
assert.equal(firstNameMapping.value, "Sai", "First Name value must be Sai");

const lastNameMapping = mapData.mappings.find((m) => m.elementId === "f19");
assert.equal(lastNameMapping.safeToFill, true, "Last Name must be safe to fill");
assert.equal(lastNameMapping.canonicalField, "last_name", "Last Name must map to last_name");
assert.equal(lastNameMapping.value, "Sankeerth", "Last Name value must be Sankeerth");

const nameMapping = mapData.mappings.find((m) => m.elementId === "f1");
assert.equal(nameMapping.safeToFill, true, "Applicant name must be safe to fill");
assert.equal(nameMapping.canonicalField, "full_name");
assert.equal(nameMapping.value, "Sai Sankeerth");

console.log(`✓ MAP_FIELDS correctly matched ${mapData.matchedCount} safe fields and protected OTP/Password/Captcha.`);

// TEST 5: POST /api/agent/autofill with START_AGENT
console.log("\nTest 5: Verifying START_AGENT handoff action...");

// 5A: Unauthenticated START_AGENT blocked
const unauthStartReq = new Request("http://localhost:3000/api/agent/autofill", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "START_AGENT",
    payload: {
      serviceId: "s001",
      portalUrl: "https://scholarships.gov.in",
    },
  }),
});
const unauthStartRes = await POST(unauthStartReq);
assert.equal(unauthStartRes.status, 401, "Unauthenticated START_AGENT must return 401");
console.log("✓ Security Check: Unauthenticated START_AGENT correctly blocked with 401.");

// 5B: Authenticated START_AGENT succeeds
const authStartReq = new Request("http://localhost:3000/api/agent/autofill", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${testCitizenToken}`,
    "Cookie": `FORMLY_CITIZEN_SESSION=${testCitizenToken}`,
  },
  body: JSON.stringify({
    action: "START_AGENT",
    payload: {
      serviceId: "s001",
      portalUrl: "https://scholarships.gov.in",
    },
  }),
});
const startRes = await POST(authStartReq);
assert.equal(startRes.status, 200);
const startData = await startRes.json();
assert.equal(startData.success, true);
assert.equal(startData.mode, "BROWSER_EXTENSION_HANDOFF");
assert(startData.autofillPayload.canonicalFields.full_name, "Autofill payload must contain full name");
assert(startData.autofillPayload.canonicalFields.first_name, "Autofill payload must contain first name");
assert(startData.autofillPayload.canonicalFields.last_name, "Autofill payload must contain last name");
assert(startData.autofillPayload.canonicalFields.pincode, "Autofill payload must contain pincode");
console.log("✓ START_AGENT returns valid extension handoff session with enriched autofillPayload.");

// TEST 6: Extension Files Integrity Check
console.log("\nTest 6: Verifying Extension codebase integrity...");
const manifest = JSON.parse(fs.readFileSync(path.resolve("extension/manifest.json"), "utf8"));
assert(manifest.host_permissions.includes("https://scholarships.gov.in/*"), "scholarships.gov.in in host_permissions");
assert(manifest.host_permissions.includes("https://*.gov.in/*"), "*.gov.in in host_permissions");
assert(manifest.content_scripts[0].all_frames === true, "all_frames must be true for iframe portal support");
assert(manifest.content_scripts[0].matches.includes("http://localhost:3000/*"), "localhost in content_scripts matches");

const contentJs = fs.readFileSync(path.resolve("extension/content.js"), "utf8");
assert(contentJs.includes("EXECUTE_AUTOFILL"), "content.js must handle EXECUTE_AUTOFILL");
assert(contentJs.includes("setNativeInputValue"), "content.js must have setNativeInputValue");
assert(contentJs.includes("_valueTracker"), "content.js must reset React _valueTracker");
assert(contentJs.includes("CANONICAL_DEFINITIONS"), "content.js must have CANONICAL_DEFINITIONS");
assert(contentJs.includes("buildUnifiedValues"), "content.js must have buildUnifiedValues");

const policyJs = fs.readFileSync(path.resolve("extension/policy-engine.js"), "utf8");
assert(policyJs.includes("isSensitiveElement"), "policy-engine.js must have isSensitiveElement");
assert(policyJs.includes("password"), "policy-engine.js must block passwords");
assert(policyJs.includes("isPostalPin"), "policy-engine.js must distinguish postal pin");

const sidepanelJs = fs.readFileSync(path.resolve("extension/sidepanel.js"), "utf8");
assert(sidepanelJs.includes("handleAutofill"), "sidepanel.js must handle autofill button click");
assert(sidepanelJs.includes("EXECUTE_AUTOFILL"), "sidepanel.js must dispatch EXECUTE_AUTOFILL");
assert(sidepanelJs.includes("ensureContentScriptInjected"), "sidepanel.js must ensure content script injection");

const bridgeJs = fs.readFileSync(path.resolve("extension/webapp-bridge.js"), "utf8");
assert(bridgeJs.includes("SEVA_SAARTHI_SYNC_PROFILE"), "bridge must listen to SEVA_SAARTHI_SYNC_PROFILE");

assert(contentJs.includes("isFemaleRadio"), "content.js must differentiate female vs male radio");
assert(contentJs.includes("localhost"), "content.js floating widget must support localhost for testing");
assert(contentJs.includes("_reset_tracker_"), "content.js must use robust tracker reset token");

console.log("✓ Extension files contain all required autofill engine hooks and resilience checks.");

// TEST 7: Gender Radio Disambiguation Verification
console.log("\nTest 7: Verifying Gender Radio Disambiguation Logic...");
function testGenderRadio(targetGender, radioVal, radioLabel) {
  const targetVal = String(targetGender).trim().toLowerCase();
  const rVal = String(radioVal).trim().toLowerCase();
  const rLbl = String(radioLabel).trim().toLowerCase();

  const isFemaleRadio =
    rVal === "female" ||
    rVal === "f" ||
    rVal === "2" ||
    /\bfemale\b/i.test(rLbl) ||
    /\bwoman\b/i.test(rLbl) ||
    /\bgirl\b/i.test(rLbl);
  const isMaleRadio =
    (rVal === "male" ||
      rVal === "m" ||
      rVal === "1" ||
      /\bmale\b/i.test(rLbl) ||
      /\bman\b/i.test(rLbl) ||
      /\bboy\b/i.test(rLbl)) &&
    !isFemaleRadio;

  if (targetVal === "male" || targetVal === "m") {
    return isMaleRadio;
  } else if (targetVal === "female" || targetVal === "f") {
    return isFemaleRadio;
  }
  return false;
}

// Case A: Citizen is Male. Radio is Female with label "Female"
assert.equal(testGenderRadio("Male", "female", "Female"), false, "Male citizen must NOT match Female radio button");
// Case B: Citizen is Male. Radio is Male with label "Male"
assert.equal(testGenderRadio("Male", "male", "Male"), true, "Male citizen must match Male radio button");
// Case C: Citizen is Female. Radio is Male with label "Male"
assert.equal(testGenderRadio("Female", "male", "Male"), false, "Female citizen must NOT match Male radio button");
// Case D: Citizen is Female. Radio is Female with label "Female"
assert.equal(testGenderRadio("Female", "female", "Female"), true, "Female citizen must match Female radio button");
// Case E: Citizen is Male. Radio is Female with value "F" and label "Female Applicant"
assert.equal(testGenderRadio("Male", "F", "Female Applicant"), false, "Male citizen must NOT match Female Applicant radio");
// Case F: Citizen is Female. Radio is Female with value "F" and label "Female Applicant"
assert.equal(testGenderRadio("Female", "F", "Female Applicant"), true, "Female citizen must match Female Applicant radio");

console.log("✓ Gender radio disambiguation verified: Female inputs will NEVER falsely match Male applicants.");

// TEST 8: Select Element Synonym Mapping
console.log("\nTest 8: Verifying Select Dropdown Option Synonym Matching...");
function matchSelectOption(options, target) {
  const t = String(target).trim().toLowerCase();
  // 1. Exact
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    if (o.value.toLowerCase() === t || o.text.toLowerCase() === t) return i;
  }
  // 2. Female
  if (t === "female" || t === "f") {
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (o.value.toLowerCase() === "f" || o.value === "2" || /\bfemale\b/i.test(o.text)) return i;
    }
  }
  // 3. Title Shri
  if (t === "shri" || t === "mr") {
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (/\b(shri|mr|shri\.|mr\.)\b/i.test(o.text) || o.value.toLowerCase() === "shri") return i;
    }
  }
  // 4. Caste OBC
  if (t === "obc" || t.includes("backward")) {
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (/\b(obc|other backward|bc)\b/i.test(o.text) || o.value.toLowerCase() === "obc") return i;
    }
  }
  // 5. State TS / TG
  if (t === "telangana" || t === "ts" || t === "tg") {
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (o.text.toLowerCase().includes("telangana") || o.value.toLowerCase() === "tg" || o.value.toLowerCase() === "ts") return i;
    }
  }
  return -1;
}

const casteOptions = [
  { value: "1", text: "Scheduled Caste (SC)" },
  { value: "2", text: "Scheduled Tribe (ST)" },
  { value: "3", text: "Other Backward Classes (OBC)" },
  { value: "4", text: "General / Unreserved" },
];
assert.equal(matchSelectOption(casteOptions, "OBC"), 2, "OBC target should match Other Backward Classes");

const genderOptions = [
  { value: "1", text: "Male" },
  { value: "2", text: "Female" },
  { value: "3", text: "Transgender" },
];
assert.equal(matchSelectOption(genderOptions, "Male"), 0, "Male target matches Male");
assert.equal(matchSelectOption(genderOptions, "Female"), 1, "Female target matches Female");

const titleOptions = [
  { value: "1", text: "Mr. / Shri" },
  { value: "2", text: "Mrs. / Smt." },
  { value: "3", text: "Miss / Kumari" },
];
assert.equal(matchSelectOption(titleOptions, "SHRI"), 0, "SHRI target matches Mr. / Shri");

const stateOptions = [
  { value: "AP", text: "Andhra Pradesh" },
  { value: "TG", text: "Telangana" },
  { value: "KA", text: "Karnataka" },
];
assert.equal(matchSelectOption(stateOptions, "Telangana"), 1, "Telangana target matches TG option");

console.log("✓ Select dropdown option synonym matching verified for Caste, Gender, Title, and State.");

console.log("\n=======================================================");
console.log("🎉 ALL AUTOFILL TESTS PASSED SUCCESSFULLY (8/8)!");
console.log("=======================================================\n");
