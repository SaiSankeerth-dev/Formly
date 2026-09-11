/**
 * Seva Saarthi — Comprehensive Digital MeeSeva AI Assistant Test Suite
 * 
 * Verifies:
 * 1. Category Coverage: All 9 statutory categories populated with structured definitions.
 * 2. 8 Specialized MeeSeva Agents:
 *    - Service Finder (Colloquial queries -> accurate services)
 *    - Eligibility Guide (Criteria evaluation, missing info detection)
 *    - Requirement Agent (Vault audit, procurement plans)
 *    - Form Guide (Field-by-field operator tips, boundary notices)
 *    - Document Agent (Portal constraints, 90% margin, readability)
 *    - Validation Agent (Cross-checks, discrepancies, pre-submission gate)
 *    - Submission Guide (Official portal walkthrough, acknowledgement slip)
 *    - Payment Guide (Statutory fees, anti-scam advisories)
 * 3. Strict 3-Tier Boundary Enforcement:
 *    - Blocks AI autonomous submit, payment, or approval
 *    - Enforces Citizen exclusive control zone
 *    - Enforces Government statutory authority
 */

import assert from "node:assert";
import {
  STRUCTURED_GOVERNMENT_SERVICES,
  ALL_SERVICE_CATEGORIES,
  getStructuredServiceById,
  getStructuredServicesByCategory,
} from "../src/lib/knowledge/meeseva-service-registry.ts";
import {
  ServiceFinderAgent,
  EligibilityGuideAgent,
  RequirementAgent,
  FormGuideAgent,
  DocumentAgent,
  ValidationAgent,
  SubmissionGuideAgent,
  PaymentGuideAgent,
} from "../src/lib/agents/meeseva-agents.ts";
import { BoundaryEnforcer } from "../src/lib/agents/boundary-enforcer.ts";

console.log("========================================================");
console.log("   SEVA SAARTHI — DIGITAL MEESEVA OPERATOR TEST SUITE   ");
console.log("========================================================\n");

// -------------------------------------------------------------
// SUITE 1: 9-CATEGORY SERVICE REGISTRY COVERAGE
// -------------------------------------------------------------
console.log("--- Suite 1: Structured Service Registry Across 9 Categories ---");

const expectedCategories = [
  "Identity",
  "Certificates",
  "Welfare",
  "Land/revenue",
  "Civil supplies",
  "Transport",
  "Municipal",
  "Employment",
  "Business",
];

for (const cat of expectedCategories) {
  assert(ALL_SERVICE_CATEGORIES.includes(cat), `Category declared in ALL_SERVICE_CATEGORIES: ${cat}`);
  const servicesInCat = getStructuredServicesByCategory(cat);
  assert(servicesInCat.length > 0, `At least 1 service populated in category '${cat}' (found ${servicesInCat.length})`);
  console.log(`✓ Category '${cat}' has ${servicesInCat.length} service(s) configured`);
}

// Check structural completeness of every service definition
for (const srv of STRUCTURED_GOVERNMENT_SERVICES) {
  assert(srv.id && typeof srv.id === "string", `Service ${srv.id} has valid ID`);
  assert(srv.service && srv.service.length > 3, `Service ${srv.id} has descriptive name`);
  assert(srv.authority && srv.authority.length > 3, `Service ${srv.id} has issuing authority`);
  assert(srv.applicationRoute && srv.applicationRoute.length > 3, `Service ${srv.id} has application route`);
  assert(Array.isArray(srv.eligibility) && srv.eligibility.length > 0, `Service ${srv.id} has eligibility rules`);
  assert(Array.isArray(srv.requiredDocuments) && srv.requiredDocuments.length > 0, `Service ${srv.id} has required documents`);
  assert(Array.isArray(srv.fields) && srv.fields.length > 0, `Service ${srv.id} has form fields`);
  assert(srv.fees && typeof srv.fees.officialFee === "number", `Service ${srv.id} has fee definition`);
  assert(Array.isArray(srv.steps) && srv.steps.length > 0, `Service ${srv.id} has process steps`);
  assert(Array.isArray(srv.validationRules), `Service ${srv.id} has validation rules`);
  assert(Array.isArray(srv.commonErrors), `Service ${srv.id} has common errors`);
}
console.log(`✓ All ${STRUCTURED_GOVERNMENT_SERVICES.length} services satisfy the complete structured definition schema`);

// -------------------------------------------------------------
// SUITE 2: AGENT 1 — SERVICE FINDER
// -------------------------------------------------------------
console.log("\n--- Suite 2: Agent 1 — Service Finder ---");

const testQueries = [
  { q: "I need proof of my income", expectedId: "income-certificate-meeseva" },
  { q: "I want to apply for a PAN card", expectedId: "pan-card-new" },
  { q: "driving licence learner test", expectedId: "driving-licence-llr" },
  { q: "food security ration card add member", expectedId: "ration-card-addition" },
  { q: "farmer crop assistance pm kisan", expectedId: "pm-kisan-registration" },
  { q: "agricultural land mutation dharani", expectedId: "dharani-land-mutation" },
  { q: "shop trade licence permit", expectedId: "ghmc-trade-licence" },
  { q: "udyam msme business loan", expectedId: "udyam-msme-registration" },
];

for (const testCase of testQueries) {
  const result = ServiceFinderAgent.findServices(testCase.q);
  assert(result.matchedServices.length > 0, `Service finder returned results for '${testCase.q}'`);
  const topMatch = result.matchedServices[0];
  assert(
    topMatch.service.id === testCase.expectedId,
    `Query '${testCase.q}' matched top service ${topMatch.service.id} (expected ${testCase.expectedId})`
  );
  assert(topMatch.relevanceScore >= 50, `Relevance score is high: ${topMatch.relevanceScore}`);
  console.log(`✓ '${testCase.q}' -> ${topMatch.service.service} (Score: ${topMatch.relevanceScore}%)`);
}

// -------------------------------------------------------------
// SUITE 3: AGENT 2 — ELIGIBILITY GUIDE
// -------------------------------------------------------------
console.log("\n--- Suite 3: Agent 2 — Eligibility Guide ---");

// Test 3.1: Fully satisfied eligibility
const panEligible = EligibilityGuideAgent.evaluateEligibility("pan-card-new", {
  "pan-age": "Individual Citizen (18+)",
  "pan-existing": "No, this is my first PAN",
  "pan-aadhaar-link": "Yes, mobile is linked",
});
assert.strictEqual(panEligible.isEligible, true);
assert.strictEqual(panEligible.status, "ELIGIBLE");
assert.strictEqual(panEligible.score, 100);
assert(panEligible.operatorExplanation.includes("fulfill all 3 statutory requirements"));
console.log("✓ Fully satisfied PAN criteria recognized as 100% ELIGIBLE");

// Test 3.2: Missing answers requires more info
const panMissingInfo = EligibilityGuideAgent.evaluateEligibility("pan-card-new", {
  "pan-age": "Individual Citizen (18+)",
});
assert.strictEqual(panMissingInfo.isEligible, false);
assert.strictEqual(panMissingInfo.status, "NEEDS_MORE_INFO");
assert.strictEqual(panMissingInfo.pendingQuestions.length, 2);
console.log("✓ Incomplete answers correctly flagged as NEEDS_MORE_INFO with 2 pending questions");

// Test 3.3: Ineligible response
const panIneligible = EligibilityGuideAgent.evaluateEligibility("pan-card-new", {
  "pan-age": "Individual Citizen (18+)",
  "pan-existing": "Yes, I already possess a PAN (not allowed)",
  "pan-aadhaar-link": "Yes, mobile is linked",
});
assert.strictEqual(panIneligible.isEligible, false);
assert.strictEqual(panIneligible.status, "NOT_ELIGIBLE");
assert(panIneligible.unmetCriteria.length > 0);
console.log("✓ Disqualifying criteria correctly identified as NOT_ELIGIBLE");

// -------------------------------------------------------------
// SUITE 4: AGENT 3 — REQUIREMENT AGENT
// -------------------------------------------------------------
console.log("\n--- Suite 4: Agent 3 — Requirement Agent ---");

const mockVaultEmpty = [];
const auditEmpty = RequirementAgent.auditDocuments("income-certificate-meeseva", mockVaultEmpty);
assert.strictEqual(auditEmpty.readyForApplication, false);
assert.strictEqual(auditEmpty.missingCount, 3);
assert(auditEmpty.operatorProcurementPlan.length === 3);
console.log("✓ Empty vault flags all 3 mandatory income certificate documents as missing");

const mockVaultComplete = [
  { type: "AADHAAR", fileName: "aadhaar.pdf", sizeBytes: 150000 },
  { type: "RATION_CARD", fileName: "ration_card.jpg", sizeBytes: 120000 },
  { type: "INCOME_PROOF", fileName: "salary_slip.pdf", sizeBytes: 180000 },
];
const auditComplete = RequirementAgent.auditDocuments("income-certificate-meeseva", mockVaultComplete);
assert.strictEqual(auditComplete.readyForApplication, true);
assert.strictEqual(auditComplete.missingCount, 0);
assert.strictEqual(auditComplete.availableCount, 3);
console.log("✓ Complete vault documents verified as 100% ready for application");

// Document size optimization flagged
const mockVaultOversized = [
  { type: "AADHAAR", fileName: "aadhaar_huge.pdf", sizeBytes: 2500000 }, // 2.5 MB (limit 200 KB)
  { type: "RATION_CARD", fileName: "ration.jpg", sizeBytes: 120000 },
  { type: "INCOME_PROOF", fileName: "salary.pdf", sizeBytes: 150000 },
];
const auditOversized = RequirementAgent.auditDocuments("income-certificate-meeseva", mockVaultOversized);
const aadhaarDoc = auditOversized.documents.find((d) => d.requirement.documentType === "AADHAAR");
assert.strictEqual(aadhaarDoc.status, "OPTIMIZATION_NEEDED");
assert(aadhaarDoc.optimizationNote.includes("exceeds official 200 KB limit"));
console.log("✓ Oversized vault document correctly flagged with OPTIMIZATION_NEEDED");

// -------------------------------------------------------------
// SUITE 5: AGENT 4 — FORM GUIDE
// -------------------------------------------------------------
console.log("\n--- Suite 5: Agent 4 — Form Guide ---");

const formGuidanceName = FormGuideAgent.getFieldGuidance("pan-card-new", 0, "Sai Sankeerth");
assert.strictEqual(formGuidanceName.isValid, true);
assert(formGuidanceName.operatorDialogue.includes("Looks good"));
assert(formGuidanceName.field.operatorTip.includes("exact spelling shown on your Aadhaar card"));
console.log("✓ Field 1 guidance delivers accurate MeeSeva operator tip without inventing answers");

// Test regex validation on Aadhaar field (index 3)
const formGuidanceAadhaarInvalid = FormGuideAgent.getFieldGuidance("pan-card-new", 3, "1234");
assert.strictEqual(formGuidanceAadhaarInvalid.isValid, false);
assert(formGuidanceAadhaarInvalid.validationError.includes("12 numeric digits"));
console.log("✓ Invalid Aadhaar format correctly rejected by regex rule");

// Sensitive field boundary notice
assert.strictEqual(formGuidanceAadhaarInvalid.field.isSensitive, true);
assert(formGuidanceAadhaarInvalid.boundaryNotice.includes("Citizen Control Zone"));
console.log("✓ Sensitive authentication field is wrapped in Citizen Control Zone boundary notice");

// -------------------------------------------------------------
// SUITE 6: AGENT 5 — DOCUMENT AGENT
// -------------------------------------------------------------
console.log("\n--- Suite 6: Agent 5 — Document Agent ---");

const audit2MB = DocumentAgent.auditAndPrepareAdvice(
  "income-certificate-meeseva",
  "INCOME_CERTIFICATE",
  "income_scan.jpg",
  2 * 1024 * 1024, // 2 MB
  { width: 1200, height: 1600 }
);
assert.strictEqual(audit2MB.isCompliant, false);
assert.strictEqual(audit2MB.targetSizeBytes, 180 * 1024); // 90% of 200 KB
assert(audit2MB.actionsPerformed.some((a) => a.includes("90% safety margin factor")));
assert(audit2MB.operatorAdvice.includes("Smart Preparer optimize this file"));
console.log("✓ 2 MB document targeted to 180 KB with 90% safety margin factor");

const auditCompliant = DocumentAgent.auditAndPrepareAdvice(
  "income-certificate-meeseva",
  "INCOME_CERTIFICATE",
  "income_opt.jpg",
  150 * 1024, // 150 KB <= 200 KB
  { width: 800, height: 1000 }
);
assert.strictEqual(auditCompliant.isCompliant, true);
console.log("✓ 150 KB document audited as 100% compliant and ready");

// -------------------------------------------------------------
// SUITE 7: AGENT 6 — VALIDATION AGENT
// -------------------------------------------------------------
console.log("\n--- Suite 7: Agent 6 — Validation Agent ---");

// Test missing mandatory fields & docs
const valFail = ValidationAgent.runPreSubmissionCheck(
  "income-certificate-meeseva",
  { applicant_name: "" },
  []
);
assert.strictEqual(valFail.canProceedToSubmit, false);
assert(valFail.errorCount >= 2);
console.log(`✓ Pre-submission check correctly blocked submission with ${valFail.errorCount} fatal errors`);

// Test fully valid submission
const valPass = ValidationAgent.runPreSubmissionCheck(
  "income-certificate-meeseva",
  {
    applicant_name: "Sai Sankeerth",
    district_mandal: "Rangareddy - Rajendranagar",
    annual_income: "180000",
    purpose_of_certificate: "Post-Matric Scholarship",
  },
  mockVaultComplete
);
assert.strictEqual(valPass.canProceedToSubmit, true);
assert.strictEqual(valPass.errorCount, 0);
assert(valPass.operatorFinalChecklist.length === 4);
console.log("✓ Valid submission approved with 4 final operator checklist confirmations");

// -------------------------------------------------------------
// SUITE 8: AGENT 7 — SUBMISSION GUIDE & AGENT 8 — PAYMENT GUIDE
// -------------------------------------------------------------
console.log("\n--- Suite 8: Agents 7 & 8 — Submission & Payment Guides ---");

const subGuidance = SubmissionGuideAgent.getSubmissionGuidance("income-certificate-meeseva");
assert(subGuidance.officialSubmissionUrl.includes("tg.meeseva.gov.in"));
assert(subGuidance.acknowledgementGuide.formatExample.includes("REV-INC"));
assert.strictEqual(subGuidance.postSubmissionTimeline.timelineDays, "7 - 14 Working Days");
console.log(`✓ Submission Guide provides official URL: ${subGuidance.officialSubmissionUrl}`);
console.log(`✓ Acknowledgement Slip guidance formatted for ${subGuidance.acknowledgementGuide.identifierName}`);

const payAdvisory = PaymentGuideAgent.getPaymentAdvisory("income-certificate-meeseva");
assert.strictEqual(payAdvisory.officialFee, 45);
assert(payAdvisory.operatorWarning.includes("₹45") && payAdvisory.operatorWarning.includes("STATUTORY FEE"));
assert(payAdvisory.operatorWarning.includes("Seva Saarthi assistance is completely free"));
assert(payAdvisory.acceptedModes.includes("UPI"));
console.log("✓ Payment Guide provides transparent ₹45 MeeSeva statutory fee with anti-scam warning");

// Test Free Service (PM-Kisan)
const kisanPay = PaymentGuideAgent.getPaymentAdvisory("pm-kisan-registration");
assert.strictEqual(kisanPay.officialFee, 0);
assert(kisanPay.operatorWarning.includes("100% FREE OF COST"));
console.log("✓ Free government service (PM-Kisan) enforces 100% free statutory advisory");

// -------------------------------------------------------------
// SUITE 9: STRICT 3-TIER BOUNDARY ENFORCEMENT
// -------------------------------------------------------------
console.log("\n--- Suite 9: Strict 3-Tier Boundary Enforcement Engine ---");

// Test AI autonomous submit is strictly blocked
const aiSubmitResult = BoundaryEnforcer.evaluateAction({
  actionType: "AI_AUTONOMOUS_SUBMIT",
  initiatedBy: "AI_ASSISTANT",
});
assert.strictEqual(aiSubmitResult.isPermitted, false);
assert(aiSubmitResult.violationMessage.includes("cannot autonomously submit"));
console.log("✓ Guard strictly BLOCKS AI Assistant from autonomous submission");

// Test AI autonomous payment is strictly blocked
const aiPayResult = BoundaryEnforcer.evaluateAction({
  actionType: "AI_EXECUTE_PAYMENT",
  initiatedBy: "AI_ASSISTANT",
});
assert.strictEqual(aiPayResult.isPermitted, false);
assert(aiPayResult.violationMessage.includes("cannot initiate or deduct financial payments"));
console.log("✓ Guard strictly BLOCKS AI Assistant from executing payments");

// Test AI statutory approval is strictly blocked
const aiApprovalResult = BoundaryEnforcer.evaluateAction({
  actionType: "AI_STATUTORY_APPROVAL",
  initiatedBy: "AI_ASSISTANT",
});
assert.strictEqual(aiApprovalResult.isPermitted, false);
assert(aiApprovalResult.violationMessage.includes("assistant, NOT the government authority"));
console.log("✓ Guard strictly BLOCKS AI Assistant from claiming statutory approval authority");

// Test Citizen actions are permitted in Citizen Zone
const citizenSubmitResult = BoundaryEnforcer.evaluateAction({
  actionType: "CITIZEN_FINAL_SUBMIT",
  initiatedBy: "CITIZEN",
});
assert.strictEqual(citizenSubmitResult.isPermitted, true);
assert.strictEqual(citizenSubmitResult.tier, "CITIZEN_TIER");
console.log("✓ Citizen action 'CITIZEN_FINAL_SUBMIT' confirmed within Citizen Control Zone");

// Test Government Officer actions are permitted in Government Authority Zone
const officerInspectionResult = BoundaryEnforcer.evaluateAction({
  actionType: "OFFICER_FIELD_INSPECTION",
  initiatedBy: "GOVERNMENT_OFFICER",
});
assert.strictEqual(officerInspectionResult.isPermitted, true);
assert.strictEqual(officerInspectionResult.tier, "GOVERNMENT_AUTHORITY_TIER");
console.log("✓ Officer action 'OFFICER_FIELD_INSPECTION' confirmed within Government Authority Zone");

console.log("\n========================================================");
console.log("   ALL DIGITAL MEESEVA OPERATOR TESTS PASSED (100%)     ");
console.log("========================================================\n");
