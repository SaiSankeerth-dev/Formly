/**
 * Seva Saarthi — specialized government application agents
 * 
 * Recreates the assistance work of a senior, helpful MeeSeva operator:
 * 1. Service Finder: Natural language understanding of citizen needs -> identifies service.
 * 2. Eligibility Guide: Evaluates criteria, asks clarifying questions.
 * 3. Requirement Agent: Dynamic document audit (ready vs missing vs alternative proofs).
 * 4. Form Guide: Interactive field-by-field guidance without inventing citizen answers.
 * 5. Document Agent: Checks format, size, dimensions, PDF pages, readability; connects to document preparation.
 * 6. Validation Agent: Pre-submission sanity engine detecting mismatches, blur, size before submission.
 * 7. Submission Guide: Guides official portal submission and acknowledgement slip handling.
 * 8. Payment Guide: Explains legitimate government treasury fees and warns against intermediary markups.
 */

import {
  StructuredGovernmentService,
  ServiceFinderResult,
  EligibilityEvaluationResult,
  RequirementAuditResult,
  FormFieldGuidance,
  DocumentPreparationAudit,
  ValidationReport,
  SubmissionGuidance,
  PaymentAdvisory,
  ServiceCategory,
} from "@/types/meeseva";
import {
  STRUCTURED_GOVERNMENT_SERVICES,
  getStructuredServiceById,
} from "@/lib/knowledge/meeseva-service-registry";
import {
  getDocumentProfile,
  formatBytes,
} from "@/lib/documents/document-profiles";
import { BoundaryEnforcer } from "@/lib/agents/boundary-enforcer";

// -------------------------------------------------------------
// Document Type Normalization & Alias Matching Helpers
// -------------------------------------------------------------
export function normalizeDocumentType(type: string): string {
  if (!type) return "OTHER";
  const t = type.toUpperCase().replace(/[\s\-_]+/g, "_");
  if (["AADHAAR", "AADHAAR_CARD", "UIDAI", "E_AADHAAR", "MASKED_AADHAAR", "AADHAAR_LETTER"].includes(t)) return "AADHAAR";
  if (["INCOME_PROOF", "INCOME_CERTIFICATE", "SALARY_SLIP", "FORM_16", "INCOME_AFFIDAVIT"].includes(t)) return "INCOME_PROOF";
  if (["PHOTO", "PHOTOGRAPH", "PASSPORT_PHOTO", "PASSPORT_SIZE_PHOTO"].includes(t)) return "PHOTO";
  if (["SIGNATURE", "SIGN", "APPLICANT_SIGNATURE"].includes(t)) return "SIGNATURE";
  if (["RATION_CARD", "FOOD_SECURITY_CARD", "FSC", "EPDS_CARD", "HOUSEHOLD_CARD"].includes(t)) return "RATION_CARD";
  if (["CASTE_CERTIFICATE", "FAMILY_CASTE_PROOF", "CASTE_PROOF", "COMMUNITY_CERTIFICATE"].includes(t)) return "CASTE_CERTIFICATE";
  if (["DOMICILE_CERTIFICATE", "RESIDENCE_CERTIFICATE", "RESIDENCE_PROOF", "NATIVITY_CERTIFICATE", "ADDRESS_PROOF"].includes(t)) return "RESIDENCE_PROOF";
  if (["PREVIOUS_MARKSHEET", "MARKSHEET", "SSC_MEMO", "QUALIFYING_MARKSHEET"].includes(t)) return "MARKSHEET";
  if (["BANK_PASSBOOK", "PASSBOOK", "BANK_ACCOUNT_PROOF", "CANCELLED_CHEQUE"].includes(t)) return "BANK_PASSBOOK";
  if (["SALE_DEED", "REGISTERED_SALE_DEED", "DEED", "TITLE_DEED"].includes(t)) return "SALE_DEED";
  if (["PATTADAR_PASSBOOK", "PATTADAR_PASSBOOK_COPY", "E_PATTADAR_PASSBOOK"].includes(t)) return "PATTADAR_PASSBOOK";
  if (["PROPERTY_TAX_RECEIPT", "TAX_RECEIPT", "MUNICIPAL_TAX_RECEIPT"].includes(t)) return "PROPERTY_TAX_RECEIPT";
  if (["BONAFIDE_CERTIFICATE", "STUDY_CERTIFICATE", "COLLEGE_BONAFIDE"].includes(t)) return "BONAFIDE_CERTIFICATE";
  if (["HOSPITAL_BIRTH_REPORT", "BIRTH_REPORT", "DISCHARGE_SUMMARY"].includes(t)) return "HOSPITAL_BIRTH_REPORT";
  if (["LEARNER_LICENCE_COPY", "LLR_COPY", "LLR"].includes(t)) return "LEARNER_LICENCE_COPY";
  return t;
}

export function areDocumentTypesMatching(typeA: string, typeB: string): boolean {
  if (!typeA || !typeB) return false;
  if (typeA.toUpperCase() === typeB.toUpperCase()) return true;
  const normA = normalizeDocumentType(typeA);
  const normB = normalizeDocumentType(typeB);
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  return false;
}

// =========================================================================
// AGENT 1: SERVICE FINDER
// =========================================================================
export class ServiceFinderAgent {
  public static findServices(query: string): ServiceFinderResult {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        query,
        matchedServices: STRUCTURED_GOVERNMENT_SERVICES.map((s) => ({
          service: s,
          relevanceScore: 50,
          matchedKeywords: ["all"],
          explanation: `Browse ${s.service} under ${s.category}.`,
        })),
      };
    }

    // Comprehensive keyword mapping covering all services and citizen colloquial terms
    const synonymMap: Record<string, string[]> = {
      income: ["income", "annual income", "salary", "poverty", "fee reimbursement", "income certificate", "mro", "tahsildar"],
      pan: ["pan", "pan card", "income tax pan", "e-pan", "tin", "nsdl", "protean", "49a", "tax identity"],
      aadhaar: ["aadhaar", "uidai", "aadhaar card", "update address", "address update", "myaadhaar", "demographic update", "change address"],
      voter: ["voter", "voter id", "epic", "election", "voter card", "form 6", "vote", "constituency", "electoral"],
      passport: ["passport", "passport seva", "psk", "tatkaal", "rpo", "travel document", "fresh passport"],
      caste: ["caste", "community", "bc", "sc", "st", "obc", "reservation", "sub-caste", "caste certificate"],
      residence: ["residence", "domicile", "nativity", "local candidate", "residence certificate", "local status", "stay certificate"],
      ews: ["ews", "economically weaker", "10% quota", "ews certificate", "general reservation", "10 percent"],
      birth: ["birth", "birth certificate", "dob certificate", "janma", "newborn", "birth registration", "born"],
      scholarship: ["scholarship", "epass", "post-matric", "tuition", "fee reimbursement", "vidya", "nsp", "scholarships", "s001"],
      pension: ["pension", "aasara", "old age", "widow", "divyang", "disability pension", "social security", "senior citizen"],
      farmer: ["farmer", "pm kisan", "kisan", "crop", "agriculture", "landholding", "pattadar", "rythu", "6000"],
      land: ["land", "mutation", "dharani", "pahani", "ror", "1b", "passbook", "survey", "acres", "plot", "khasra", "patta"],
      ration: ["ration", "ration card", "food security", "fsc", "epds", "rice", "add member", "wife", "child", "quota"],
      driving: ["driving", "driving licence", "driving license", "driver", "llr", "dl", "learner", "bike", "car", "rto", "sarathi", "parivahan"],
      trade: ["trade", "shop", "trade licence", "trade license", "ghmc", "store", "commercial", "ptin", "permit"],
      property: ["property", "property tax", "house tax", "ptin", "assessment", "building tax", "door number", "ghmc tax"],
      business: ["msme", "udyam", "startup", "company", "small business", "loan", "nic code", "enterprise"],
      employment: ["employment", "job", "unemployed", "jobseeker", "exchange", "qualification", "seniority", "s005"],
    };

    // Support tokens of length >= 2 (so dl, rc, tc match!)
    const qTokens = q.split(/\s+/).filter((w) => w.length >= 2);

    const matches = STRUCTURED_GOVERNMENT_SERVICES.map((service) => {
      let score = 0;
      const matchedKeywords: string[] = [];

      const titleLower = service.service.toLowerCase();
      const idLower = service.id.toLowerCase();
      const descLower = service.description.toLowerCase();
      const codeLower = service.shortCode.toLowerCase();
      const aliasesLower = (service.aliases || []).map((a) => a.toLowerCase());

      // 1. Exact or Full phrase match in title, ID, shortCode, or aliases
      if (titleLower.includes(q)) {
        score += 85;
        matchedKeywords.push(q);
      }
      if (idLower.includes(q)) {
        score += 80;
        matchedKeywords.push(q);
      }
      if (codeLower === q || codeLower.includes(q)) {
        score += 80;
        matchedKeywords.push(service.shortCode);
      }
      if (aliasesLower.some((a) => a === q || q.includes(a))) {
        score += 70;
        matchedKeywords.push(q);
      }

      // 2. Token overlap in title, ID, and shortCode
      for (const token of qTokens) {
        const tokenRegex = new RegExp(`\\b${token}\\b`, "i");
        if (tokenRegex.test(titleLower)) {
          score += 30;
          matchedKeywords.push(token);
        }
        if (tokenRegex.test(idLower.replace(/-/g, " "))) {
          score += 35;
          matchedKeywords.push(token);
        }
        if (tokenRegex.test(descLower)) {
          score += 10;
        }
      }

      // 3. Category match
      if (service.category.toLowerCase().includes(q) || qTokens.some((t) => service.category.toLowerCase().includes(t))) {
        score += 20;
      }

      // 4. Synonym / Intent Map match
      const idWords = idLower.replace(/-/g, " ");
      for (const [key, synonyms] of Object.entries(synonymMap)) {
        const queryMatchesSynonym = synonyms.some((syn) => {
          const synRegex = new RegExp(`\\b${syn}\\b`, "i");
          return synRegex.test(q) || q.includes(syn);
        });

        if (queryMatchesSynonym) {
          const keyRegex = new RegExp(`\\b${key}\\b`, "i");
          if (keyRegex.test(idWords) || keyRegex.test(titleLower) || aliasesLower.some((a) => keyRegex.test(a))) {
            score += 65;
            matchedKeywords.push(key);
          } else if (descLower.includes(key)) {
            score += 15;
          }
        }
      }

      // 5. Explicit Disambiguation Rules
      // Income vs PAN vs Tax
      if (q.includes("income") && !q.includes("pan") && !q.includes("tax")) {
        if (idLower.includes("income")) score += 40;
        if (idLower.includes("pan")) score -= 70;
      }
      if (q.includes("pan") && idLower.includes("pan")) {
        score += 50;
      }
      // Aadhaar update vs PAN
      if (q.includes("aadhaar") && !q.includes("pan")) {
        if (idLower.includes("aadhaar")) score += 60;
        if (idLower.includes("pan")) score -= 50;
      }
      // Voter vs PAN
      if (q.includes("voter") || q.includes("epic")) {
        if (idLower.includes("voter")) score += 80;
        if (idLower.includes("pan")) score -= 60;
      }
      // Passport vs PAN
      if (q.includes("passport")) {
        if (idLower.includes("passport")) score += 80;
        if (idLower.includes("pan")) score -= 60;
      }
      // Birth Certificate vs Income/Caste Certificate
      if (q.includes("birth")) {
        if (idLower.includes("birth")) score += 80;
        if (idLower.includes("income") || idLower.includes("caste")) score -= 60;
      }
      // EWS vs Income Certificate
      if (q.includes("ews") || q.includes("weaker")) {
        if (idLower.includes("ews")) score += 80;
        if (idLower.includes("income-certificate")) score -= 40;
      }
      // Residence vs Income
      if (q.includes("residence") || q.includes("domicile") || q.includes("nativity")) {
        if (idLower.includes("residence")) score += 80;
        if (idLower.includes("income-certificate")) score -= 40;
      }
      // Scholarship vs Caste/Income
      if (q.includes("scholarship") || q.includes("epass")) {
        if (idLower.includes("scholarship")) score += 80;
        if (idLower.includes("caste") || idLower.includes("income")) score -= 30;
      }
      // Pension vs others
      if (q.includes("pension") || q.includes("aasara")) {
        if (idLower.includes("pension") || idLower.includes("aasara")) score += 80;
        if (idLower.includes("pan")) score -= 60;
      }
      // Land Pahani vs Land Mutation
      if (q.includes("pahani") || q.includes("1b") || q.includes("record")) {
        if (idLower.includes("pahani")) score += 60;
      }
      if (q.includes("mutation") && idLower.includes("mutation")) {
        score += 60;
        if (idLower.includes("pahani")) score -= 30;
      }
      // LLR (Learner) vs DL (Permanent)
      if (q.includes("llr") || q.includes("learner")) {
        if (idLower.includes("llr")) score += 70;
        if (idLower.includes("permanent")) score -= 40;
      }
      if (q.includes("renew") || q.includes("permanent") || (q.includes("dl") && !q.includes("llr"))) {
        if (idLower.includes("permanent")) score += 60;
      }
      // Trade licence vs driving licence
      if (q.includes("trade") && idLower.includes("trade")) {
        score += 70;
        if (idLower.includes("driving")) score -= 60;
      }
      if (q.includes("driving") && idLower.includes("driving")) {
        score += 70;
        if (idLower.includes("trade")) score -= 60;
      }
      // Property tax vs trade licence
      if (q.includes("property") || q.includes("house tax")) {
        if (idLower.includes("property-tax")) score += 80;
        if (idLower.includes("trade")) score -= 40;
      }

      const clampedScore = Math.min(100, Math.max(0, score));

      return {
        service,
        relevanceScore: clampedScore,
        matchedKeywords: Array.from(new Set(matchedKeywords)),
        explanation:
          clampedScore > 60
            ? `Direct match for "${query}" under ${service.authority}.`
            : clampedScore > 30
            ? `Recommended based on terms related to ${service.category}.`
            : `Available government service under ${service.category}.`,
      };
    });

    // Filter and sort by score descending
    const sorted = matches
      .filter((m) => m.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const topCategory = sorted[0]?.service.category;

    return {
      query,
      matchedServices: sorted.length > 0 ? sorted : matches.slice(0, 3),
      suggestedCategory: topCategory,
    };
  }
}

// =========================================================================
// AGENT 2: ELIGIBILITY GUIDE
// =========================================================================
export class EligibilityGuideAgent {
  public static evaluateEligibility(
    serviceId: string,
    answers: Record<string, string | boolean | number> = {},
    citizenProfile: Record<string, any> = {}
  ): EligibilityEvaluationResult {
    const service = getStructuredServiceById(serviceId);
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found.`);
    }

    const satisfiedCriteria: string[] = [];
    const unmetCriteria: string[] = [];
    const pendingQuestions: EligibilityEvaluationResult["pendingQuestions"] = [];

    for (const crit of service.eligibility) {
      // Check answers, then fallback to citizenProfile
      let citizenAns = answers[crit.id] ?? citizenProfile[crit.id];

      // Profile attribute mappings if direct crit.id was not found
      if (citizenAns === undefined || citizenAns === "") {
        if (crit.id.includes("income") && citizenProfile.annual_income !== undefined) {
          citizenAns = citizenProfile.annual_income;
        } else if (crit.id.includes("age") && citizenProfile.age !== undefined) {
          citizenAns = citizenProfile.age;
        } else if (crit.id.includes("residence") && citizenProfile.state !== undefined) {
          citizenAns = citizenProfile.state.toLowerCase() === "telangana";
        }
      }

      if (citizenAns === undefined || citizenAns === "") {
        pendingQuestions.push({
          criterionId: crit.id,
          question: crit.questionForCitizen || `Do you satisfy: ${crit.label}?`,
          options: crit.options,
        });
      } else {
        let isMet = false;
        const ansStr = String(citizenAns).toLowerCase().trim();
        const isNegativeCriterion = crit.id.includes("existing") || crit.id.includes("disqualif");

        if (crit.disqualifyingOptions?.some((opt) => opt.toLowerCase() === ansStr)) {
          isMet = false;
        } else if (crit.eligibleOptions?.some((opt) => opt.toLowerCase() === ansStr)) {
          isMet = true;
        } else if (isNegativeCriterion) {
          // For negative criteria (e.g. "Do you already have a PAN?"):
          // Answering false, "No", or "No, this is my first PAN" satisfies the requirement!
          if (citizenAns === false || ansStr === "no" || ansStr.startsWith("no")) {
            isMet = true;
          } else if (citizenAns === true || ansStr === "yes" || ansStr.startsWith("yes")) {
            isMet = false;
          } else {
            isMet = true;
          }
        } else if (citizenAns === true || ansStr === "yes" || ansStr.startsWith("yes")) {
          isMet = true;
        } else if (citizenAns === false || ansStr === "no" || ansStr.startsWith("no")) {
          isMet = false;
        } else if (typeof citizenAns === "number") {
          // Numeric evaluation (income threshold, age requirement)
          if (crit.id.includes("income") || crit.description.includes("₹")) {
            const cap = crit.description.includes("8,00,000") || crit.description.includes("8 Lakh")
              ? 800000
              : 250000;
            isMet = citizenAns <= cap;
          } else if (crit.id.includes("age")) {
            const minAge = crit.description.includes("57+") ? 57 : 18;
            isMet = citizenAns >= minAge;
          } else {
            isMet = true;
          }
        } else if (
          ansStr.includes("not eligible") ||
          ansStr.includes("outside state") ||
          ansStr.includes("reprint") ||
          ansStr.includes("under 14") ||
          ansStr.includes("missing") ||
          ansStr.includes("tenant farmer") ||
          ansStr.includes("not allowed") ||
          ansStr.includes("already possess") ||
          ansStr.includes("already have")
        ) {
          isMet = false;
        } else {
          isMet = true;
        }

        if (isMet) {
          satisfiedCriteria.push(crit.label);
        } else {
          unmetCriteria.push(crit.label);
        }
      }
    }

    let status: EligibilityEvaluationResult["status"] = "ELIGIBLE";
    let score = 100;

    if (unmetCriteria.length > 0) {
      status = "NOT_ELIGIBLE";
      score = Math.max(0, 100 - unmetCriteria.length * 40);
    } else if (pendingQuestions.length > 0) {
      status = "NEEDS_MORE_INFO";
      score = Math.round((satisfiedCriteria.length / service.eligibility.length) * 100);
    }

    let operatorExplanation = "";
    if (status === "ELIGIBLE") {
      operatorExplanation = `✓ Great news! Based on your answers, you fulfill all ${service.eligibility.length} statutory requirements to apply for ${service.service}.`;
    } else if (status === "NEEDS_MORE_INFO") {
      operatorExplanation = `Seva Saarthi needs ${pendingQuestions.length} quick details to confirm your eligibility before filling the official application.`;
    } else {
      operatorExplanation = `⚠️ You may not meet the mandatory criteria for ${service.service} due to: ${unmetCriteria.join(", ")}.`;
    }

    return {
      serviceId: service.id,
      serviceName: service.service,
      isEligible: status === "ELIGIBLE",
      status,
      score,
      operatorExplanation,
      satisfiedCriteria,
      unmetCriteria,
      pendingQuestions,
    };
  }
}

// =========================================================================
// AGENT 3: REQUIREMENT AGENT
// =========================================================================
export class RequirementAgent {
  public static auditDocuments(
    serviceId: string,
    vaultDocuments: { type: string; fileName: string; sizeBytes?: number }[] = []
  ): RequirementAuditResult {
    const service = getStructuredServiceById(serviceId);
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found.`);
    }

    const docs = service.requiredDocuments.map((req) => {
      // Match using normalized document aliases
      const matchingVaultDoc = vaultDocuments.find((d) =>
        areDocumentTypesMatching(d.type, req.documentType)
      );

      const isAvailable = !!matchingVaultDoc;
      let status: "READY" | "OPTIMIZATION_NEEDED" | "MISSING" = "MISSING";
      let optimizationNote: string | undefined;

      if (isAvailable && matchingVaultDoc) {
        const size = matchingVaultDoc.sizeBytes || 0;
        if (size > req.maxFileSizeBytes) {
          status = "OPTIMIZATION_NEEDED";
          optimizationNote = `File size (${formatBytes(size)}) exceeds official ${formatBytes(req.maxFileSizeBytes)} limit. Needs auto-compression.`;
        } else {
          status = "READY";
        }
      }

      return {
        requirement: req,
        isAvailable,
        vaultDocumentId: matchingVaultDoc?.fileName,
        status,
        optimizationNote,
      };
    });

    const totalRequired = docs.filter((d) => d.requirement.isMandatory).length;
    const availableCount = docs.filter((d) => d.requirement.isMandatory && d.isAvailable).length;
    const missingCount = totalRequired - availableCount;

    const operatorProcurementPlan: string[] = [];
    docs
      .filter((d) => !d.isAvailable && d.requirement.isMandatory)
      .forEach((d) => {
        operatorProcurementPlan.push(
          `To procure ${d.requirement.label}: ${d.requirement.procurementGuide.procurementSteps[0]} (${d.requirement.procurementGuide.turnaroundTime})`
        );
      });

    return {
      serviceId: service.id,
      totalRequired,
      availableCount,
      missingCount,
      readyForApplication: missingCount === 0,
      documents: docs,
      operatorProcurementPlan,
    };
  }
}

// =========================================================================
// AGENT 4: FORM GUIDE (Interactive Field-by-Field Guidance)
// =========================================================================
export class FormGuideAgent {
  public static getFieldGuidance(
    serviceId: string,
    fieldIndex: number,
    currentValue: string = ""
  ): FormFieldGuidance {
    const service = getStructuredServiceById(serviceId);
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found.`);
    }

    const field = service.fields[fieldIndex];
    if (!field) {
      throw new Error(`Field index ${fieldIndex} out of range for service ${serviceId}.`);
    }

    let isValid = true;
    let validationError: string | undefined;

    if (field.isRequired && !currentValue.trim()) {
      isValid = false;
      validationError = `${field.label} is required by the official portal.`;
    } else if (field.validationRegex && currentValue.trim()) {
      const reg = new RegExp(field.validationRegex);
      if (!reg.test(currentValue.trim())) {
        isValid = false;
        validationError = field.validationErrorMessage || `Invalid format for ${field.label}.`;
      }
    }

    let boundaryNotice: string | undefined;
    if (field.isSensitive) {
      boundaryNotice = "Citizen Control Zone: This is sensitive authentication data. Seva Saarthi never stores this value or transmits it outside the official portal.";
    }

    const operatorDialogue = currentValue.trim()
      ? isValid
        ? `✓ Looks good! ${field.label} matches expected government standards.`
        : `⚠️ Operator Advice: ${field.operatorTip}`
      : `Seva Saarthi Advice: ${field.operatorTip}`;

    return {
      field,
      stepIndex: fieldIndex + 1,
      totalSteps: service.fields.length,
      operatorDialogue,
      isValid,
      validationError,
      boundaryNotice,
    };
  }
}

// =========================================================================
// AGENT 5: DOCUMENT AGENT (Integrates with Smart Auto-Compression)
// =========================================================================
export class DocumentAgent {
  public static auditAndPrepareAdvice(
    serviceId: string,
    documentType: string,
    fileName: string,
    fileSizeBytes: number,
    dimensions?: { width: number; height: number },
    pageCount?: number
  ): DocumentPreparationAudit {
    const service = getStructuredServiceById(serviceId);
    const matchedReq = service?.requiredDocuments.find((req) =>
      areDocumentTypesMatching(req.documentType, documentType)
    );

    // Prefer service's own defined document rule; fallback to getDocumentProfile
    const profile = getDocumentProfile(serviceId, documentType);
    const maxBytes = matchedReq?.maxFileSizeBytes || profile.rules.maxFileSizeBytes;
    const marginFactor = matchedReq?.safetyMarginFactor || profile.rules.safetyMarginFactor || 0.9;
    const targetBytes = Math.floor(maxBytes * marginFactor);
    const allowedFormats = matchedReq?.allowedFormats || profile.rules.allowedExtensions || ["pdf", "jpg", "jpeg"];
    const minWidth = matchedReq?.minWidth || profile.rules.minWidth;
    const minHeight = matchedReq?.minHeight || profile.rules.minHeight;
    const maxWidth = matchedReq?.maxWidth || profile.rules.maxWidth;
    const pdfPageLimit = matchedReq?.pdfPageLimit || profile.rules.pdfPageLimit;

    const actionsPerformed: string[] = [];
    let isCompliant = true;
    let readabilityScore = 95;
    let qualityStatus: DocumentPreparationAudit["qualityStatus"] = "EXCELLENT";

    // 1. File extension / format check
    const dotIdx = fileName.lastIndexOf(".");
    const ext = dotIdx !== -1 ? fileName.slice(dotIdx + 1).toLowerCase() : "";
    if (ext && allowedFormats.length > 0 && !allowedFormats.includes(ext)) {
      isCompliant = false;
      readabilityScore -= 30;
      actionsPerformed.push(
        `Format '.${ext}' is not accepted. Official portal requires: ${allowedFormats.join(", ").toUpperCase()}.`
      );
    }

    // 2. File size check
    if (fileSizeBytes > maxBytes) {
      isCompliant = false;
      actionsPerformed.push(
        `File size (${formatBytes(fileSizeBytes)}) exceeds ${formatBytes(maxBytes)} portal ceiling.`
      );
      actionsPerformed.push(
        `Targeting auto-compression to ${formatBytes(targetBytes)} with 90% safety margin factor.`
      );
    } else {
      actionsPerformed.push(`File size (${formatBytes(fileSizeBytes)}) is safely within the ${formatBytes(maxBytes)} portal limit.`);
    }

    // 3. Dimensions check
    if (dimensions) {
      if (minWidth && dimensions.width < minWidth) {
        isCompliant = false;
        readabilityScore -= 25;
        actionsPerformed.push(`Image width (${dimensions.width}px) is below recommended ${minWidth}px.`);
      }
      if (minHeight && dimensions.height < minHeight) {
        isCompliant = false;
        readabilityScore -= 25;
        actionsPerformed.push(`Image height (${dimensions.height}px) is below recommended ${minHeight}px.`);
      }
      if (maxWidth && dimensions.width > maxWidth) {
        actionsPerformed.push(`Image width (${dimensions.width}px) will be scaled down to ${maxWidth}px.`);
      }
    }

    // 4. PDF Page Count check
    if (pageCount && pdfPageLimit && pageCount > pdfPageLimit) {
      isCompliant = false;
      readabilityScore -= 20;
      actionsPerformed.push(`Document has ${pageCount} pages, exceeding the maximum allowed limit of ${pdfPageLimit} pages.`);
    }

    if (readabilityScore < 50) {
      qualityStatus = "REQUIRES_RETAKE";
    } else if (readabilityScore < 70) {
      qualityStatus = "ACCEPTABLE";
    } else if (readabilityScore < 85) {
      qualityStatus = "GOOD";
    }

    const serviceName = service?.service || profile.serviceName;
    const operatorAdvice = isCompliant
      ? `This document is 100% compliant with ${serviceName} specifications. Safe to upload directly.`
      : `Seva Saarthi Action: Let the Smart Preparer optimize this file automatically. It will compress to ${formatBytes(targetBytes)} while preserving crisp readability.`;

    return {
      fileName,
      fileSizeBytes,
      targetSizeBytes: targetBytes,
      isCompliant,
      actionsPerformed,
      preparedFileSizeBytes: isCompliant ? fileSizeBytes : targetBytes,
      readabilityScore,
      qualityStatus,
      operatorAdvice,
    };
  }
}

// =========================================================================
// AGENT 6: VALIDATION AGENT (Pre-Submission Cross-Field Sanity)
// =========================================================================
export class ValidationAgent {
  public static runPreSubmissionCheck(
    serviceId: string,
    formData: Record<string, string>,
    vaultDocs: {
      type: string;
      fileName: string;
      sizeBytes?: number;
      extractedText?: string;
      extractedDob?: string;
      extractedName?: string;
      isBlurry?: boolean;
    }[] = [],
    citizenProfile: Record<string, any> = {}
  ): ValidationReport {
    const service = getStructuredServiceById(serviceId);
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found.`);
    }

    const checks: ValidationReport["checks"] = [];
    let errorCount = 0;
    let warningCount = 0;
    let passedCount = 0;

    // 1. Check mandatory fields
    for (const field of service.fields) {
      const val = formData[field.id]?.trim() || "";
      if (field.isRequired && !val) {
        errorCount++;
        checks.push({
          ruleId: `req-field-${field.id}`,
          ruleName: `Mandatory Field: ${field.label}`,
          severity: "ERROR",
          message: `${field.label} must not be blank before official submission.`,
          fieldId: field.id,
          actionNeeded: `Fill ${field.label} following operator tip: "${field.operatorTip}".`,
        });
      } else if (val && field.validationRegex) {
        const r = new RegExp(field.validationRegex);
        if (!r.test(val)) {
          errorCount++;
          checks.push({
            ruleId: `val-field-${field.id}`,
            ruleName: `Format Validation: ${field.label}`,
            severity: "ERROR",
            message: field.validationErrorMessage || `Invalid format for ${field.label}.`,
            fieldId: field.id,
            actionNeeded: `Correct format to match example: ${field.exampleValue}.`,
          });
        } else {
          passedCount++;
          checks.push({
            ruleId: `pass-field-${field.id}`,
            ruleName: `${field.label} Verification`,
            severity: "PASS",
            message: `Field ${field.label} is valid.`,
          });
        }
      } else if (val) {
        passedCount++;
      }
    }

    // 2. Check mandatory documents (using normalized document type aliases)
    for (const req of service.requiredDocuments) {
      const found = vaultDocs.find((d) =>
        areDocumentTypesMatching(d.type, req.documentType)
      );

      if (req.isMandatory && !found) {
        errorCount++;
        checks.push({
          ruleId: `missing-doc-${req.id}`,
          ruleName: `Required Document: ${req.label}`,
          severity: "ERROR",
          message: `Missing ${req.label}. Application will be rejected immediately without this attachment.`,
          actionNeeded: `Upload ${req.label} (${req.acceptableProofs.join(" or ")}).`,
        });
      } else if (found && found.sizeBytes && found.sizeBytes > req.maxFileSizeBytes) {
        errorCount++;
        checks.push({
          ruleId: `oversize-doc-${req.id}`,
          ruleName: `File Size Limit: ${req.label}`,
          severity: "ERROR",
          message: `${found.fileName} is ${formatBytes(found.sizeBytes)}, exceeding portal limit of ${formatBytes(req.maxFileSizeBytes)}.`,
          actionNeeded: `Run Smart Auto-Compressor on ${found.fileName} to bring under ${formatBytes(req.maxFileSizeBytes * req.safetyMarginFactor)}.`,
        });
      } else if (found) {
        passedCount++;
        checks.push({
          ruleId: `doc-ok-${req.id}`,
          ruleName: `${req.label} Attached`,
          severity: "PASS",
          message: `${req.label} verified within size limits.`,
        });
      }
    }

    // 3. Cross-Field Concordance Check: Date of Birth
    const formDob = formData["dob"]?.trim();
    const docWithDob = vaultDocs.find((d) => d.extractedDob);
    const expectedDob = docWithDob?.extractedDob || citizenProfile.dob;

    if (formDob && expectedDob) {
      const normFormDob = formDob.replace(/[^0-9]/g, "");
      const normExpDob = String(expectedDob).replace(/[^0-9]/g, "");
      if (normFormDob !== normExpDob) {
        errorCount++;
        checks.push({
          ruleId: "val-dob-concordance",
          ruleName: "DOB Document Match",
          severity: "ERROR",
          message: `Date of Birth in form (${formDob}) does not match document record (${expectedDob}).`,
          fieldId: "dob",
          actionNeeded: "Correct Date of Birth to match your identity document character-for-character.",
        });
      } else {
        passedCount++;
        checks.push({
          ruleId: "pass-dob-match",
          ruleName: "DOB Concordance Verified",
          severity: "PASS",
          message: "Date of Birth matches identity document records.",
        });
      }
    }

    // 4. Cross-Field Concordance Check: Full Name
    const formName = (formData["full_name"] || formData["applicant_name"] || formData["student_name"])?.trim().toLowerCase();
    const docWithName = vaultDocs.find((d) => d.extractedName);
    const expectedName = (docWithName?.extractedName || citizenProfile.fullName || citizenProfile.name)?.trim().toLowerCase();

    if (formName && expectedName && formName !== expectedName) {
      warningCount++;
      checks.push({
        ruleId: "val-name-concordance",
        ruleName: "Name Spelling Alignment",
        severity: "WARNING",
        message: `Name entered (${formName}) has minor variation from profile record (${expectedName}).`,
        actionNeeded: "Ensure spelling strictly matches Aadhaar to avoid scrutiny officer delay.",
      });
    }

    // 5. Image Quality & Blur Check
    const blurryPhoto = vaultDocs.find(
      (d) => normalizeDocumentType(d.type) === "PHOTO" && d.isBlurry
    );
    if (blurryPhoto) {
      errorCount++;
      checks.push({
        ruleId: "val-photo-blur",
        ruleName: "Photo Quality & Readability",
        severity: "ERROR",
        message: "Your uploaded photograph appears blurry or low-resolution.",
        actionNeeded: "Retake photo facing plain white wall in bright lighting.",
      });
    }

    const operatorFinalChecklist = [
      "All demographic fields match the spelling on your Aadhaar card.",
      "Uploaded documents are strictly under government portal file size boundaries.",
      "You have your Aadhaar-linked mobile ready to receive OTP for digital signature.",
      "No intermediary or middleman charges apply. Only official government treasury fee is required.",
    ];

    return {
      serviceId: service.id,
      canProceedToSubmit: errorCount === 0,
      errorCount,
      warningCount,
      passedCount,
      checks,
      operatorFinalChecklist,
    };
  }
}

// =========================================================================
// AGENT 7: SUBMISSION GUIDE
// =========================================================================
export class SubmissionGuideAgent {
  public static getSubmissionGuidance(serviceId: string): SubmissionGuidance {
    const service = getStructuredServiceById(serviceId);
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found.`);
    }

    const operatorWalkthrough = [
      `1. Open the official government portal: ${service.officialPortalName} (${service.portalDomain}).`,
      `2. Verify that the URL begins with HTTPS and ends with an official government domain.`,
      `3. Review all auto-filled fields on the portal's final preview screen.`,
      `4. Check the statutory citizen declaration box. (Citizen must check this personally).`,
      `5. Click the final 'Submit / Proceed to Payment' button.`,
      `6. Save the official Acknowledgement Slip or Application Token ID immediately as a PDF.`,
    ];

    return {
      serviceId: service.id,
      serviceName: service.service,
      officialSubmissionUrl: service.officialLinks[0]?.url || `https://${service.portalDomain}`,
      operatorWalkthrough,
      postSubmissionTimeline: {
        timelineDays: service.category === "Certificates" ? "7 - 14 Working Days" : "15 - 30 Calendar Days",
        inspectingOfficer: service.authority,
        expectedStatusProgression: [
          "SUBMITTED",
          "OFFICER_ASSIGNED",
          "FIELD_INSPECTION / DEMOGRAPHIC_VERIFICATION",
          "APPROVED_AND_DIGITALLY_SIGNED",
          "DELIVERED_OR_READY_FOR_DOWNLOAD",
        ],
      },
      acknowledgementGuide: {
        identifierName: "Application Number / Token ID",
        formatExample: `${service.shortCode}-2026-XXXX`,
        storageAdvice: "Always download the PDF Acknowledgement Slip. Use the Application Number to track status directly on the portal without paying any operator for updates.",
      },
    };
  }
}

// =========================================================================
// AGENT 8: PAYMENT GUIDE (Transparent Fees & Anti-Middleman Advisory)
// =========================================================================
export class PaymentGuideAgent {
  public static getPaymentAdvisory(serviceId: string): PaymentAdvisory {
    const service = getStructuredServiceById(serviceId);
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found.`);
    }

    const fee = service.fees;

    const operatorWarning = fee.isFree
      ? `IMPORTANT ADVISORY: ${service.service} is 100% FREE OF COST under statutory government guidelines. Any operator or website charging you money is an unauthorized intermediary.`
      : `OFFICIAL STATUTORY FEE: ₹${fee.officialFee} is the exact government treasury charge for ${service.service}. Seva Saarthi assistance is completely free. Never pay additional "agent processing" or "convenience" charges.`;

    const paymentStepByStep = fee.isFree
      ? ["No payment required.", "Direct submission to government department."]
      : [
          `1. On the official payment page, select your preferred banking mode: UPI (Google Pay, PhonePe, Paytm), Debit Card, or NetBanking.`,
          `2. Verify that the payee name reads '${service.authority}' or the state cyber treasury gateway.`,
          `3. Pay the exact statutory amount: ₹${fee.officialFee}.`,
          `4. Do not click 'Back' or refresh while the gateway is processing.`,
          `5. Download the Treasury Challan or Payment Receipt containing the Cyber Transaction Number (CIN / UTR).`,
        ];

    return {
      serviceId: service.id,
      officialFee: fee.officialFee,
      currency: fee.currency,
      operatorWarning,
      acceptedModes: fee.paymentModes.length > 0 ? fee.paymentModes : ["Free Service (No Payment)"],
      paymentStepByStep,
      receiptInstructions:
        "Retain your Cyber Treasury Challan receipt. In case of any technical gateway timeout, quotes of this Challan / UTR reference number will prompt automatic reconciliation within 24 hours.",
    };
  }
}
