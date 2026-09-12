/**
 * Seva Saarthi — official government application browser assistant
 * Core Domain Types & Interfaces
 */

export type ServiceCategory =
  | "Identity"
  | "Certificates"
  | "Welfare"
  | "Land/revenue"
  | "Civil supplies"
  | "Transport"
  | "Municipal"
  | "Employment"
  | "Business";

export type BoundaryTier =
  | "ASSISTANT_TIER"          // AI: Teach, explain, guide, prepare, validate, suggest
  | "CITIZEN_TIER"            // Citizen: Sensitive data, consent, declaration, payment, final submit
  | "GOVERNMENT_AUTHORITY_TIER"; // Official Govt: Verification, inquiry, statutory approval/rejection, issuance

export interface EligibilityCriterion {
  id: string;
  label: string;
  description: string;
  isMandatory: boolean;
  questionForCitizen?: string;
  options?: string[];
  eligibleOptions?: string[];
  disqualifyingOptions?: string[];
  defaultValue?: string | boolean;
}

export interface ServiceDocumentRequirement {
  id: string;
  documentType: string;
  label: string;
  description: string;
  isMandatory: boolean;
  acceptableProofs: string[];
  maxFileSizeBytes: number;
  safetyMarginFactor: number;
  allowedFormats: string[]; // ["pdf", "jpg", "jpeg", "png"]
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  pdfPageLimit?: number;
  procurementGuide: {
    issuingAuthority: string;
    turnaroundTime: string;
    procurementSteps: string[];
  };
}

export interface ServiceFieldDefinition {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "radio" | "textarea" | "file";
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  isRequired: boolean;
  isSensitive: boolean; // Flags boundary (Aadhaar OTP, Bank PIN, Password)
  operatorTip: string;  // practical spoken guidance for the citizen
  whyItMatters: string; // Government portal statutory reason
  exampleValue: string;
  validationRegex?: string;
  validationErrorMessage?: string;
  crossCheckField?: string; // e.g. cross check with document type or another field
}

export interface ServiceProcessStep {
  stepNumber: number;
  title: string;
  description: string;
  screenSummary: string;
  operatorInstruction: string;
  citizenActionRequired: string;
  boundaryTier: BoundaryTier;
  officialPortalUrl?: string;
}

export interface ServiceFeeStructure {
  officialFee: number;
  currency: string;
  isFree: boolean;
  feeBreakdown: {
    item: string;
    amount: number;
  }[];
  paymentModes: string[];
  operatorAdvisory: string;
}

export interface ServiceValidationRule {
  id: string;
  name: string;
  description: string;
  severity: "ERROR" | "WARNING";
  checkType: "DOCUMENT_MATCH" | "CROSS_FIELD" | "QUALITY_CHECK" | "ELIGIBILITY";
  remediationAdvice: string;
}

export interface StructuredGovernmentService {
  id: string;
  schemeId?: string;
  aliases?: string[];
  service: string;
  shortCode: string;
  category: ServiceCategory;
  authority: string;
  applicationRoute: string;
  officialPortalName: string;
  portalDomain: string;
  officialLinks: {
    label: string;
    url: string;
    domain: string;
    purpose: string;
  }[];
  description: string;
  eligibility: EligibilityCriterion[];
  requiredDocuments: ServiceDocumentRequirement[];
  fields: ServiceFieldDefinition[];
  photoRules: {
    required: boolean;
    maxSizeBytes: number;
    dimensions: string; // e.g. "3.5cm x 4.5cm (min 300x400 px)"
    background: string;
    allowedFormats: string[];
    operatorGuidance: string;
  };
  signatureRules: {
    required: boolean;
    maxSizeBytes: number;
    dimensions: string;
    inkColor: string;
    allowedFormats: string[];
    operatorGuidance: string;
  };
  fileRules: {
    defaultMaxSizeBytes: number;
    safetyTargetBytes: number;
    compressionAllowed: boolean;
    ocrVerificationEnabled: boolean;
  };
  fees: ServiceFeeStructure;
  steps: ServiceProcessStep[];
  validationRules: ServiceValidationRule[];
  commonErrors: {
    error: string;
    prevention: string;
  }[];
  supportLevel?: "FULL" | "PARTIAL" | "GUIDED" | "UNSUPPORTED";
  lastVerified?: string;
}

// -------------------------------------------------------------
// Agent Request & Response Types
// -------------------------------------------------------------

export interface ServiceFinderResult {
  query: string;
  matchedServices: {
    service: StructuredGovernmentService;
    relevanceScore: number; // 0 - 100
    matchedKeywords: string[];
    explanation: string;
  }[];
  suggestedCategory?: ServiceCategory;
}

export interface EligibilityEvaluationResult {
  serviceId: string;
  serviceName: string;
  isEligible: boolean;
  status: "ELIGIBLE" | "CONDITIONALLY_ELIGIBLE" | "NEEDS_MORE_INFO" | "NOT_ELIGIBLE";
  score: number; // 0 - 100
  operatorExplanation: string;
  satisfiedCriteria: string[];
  unmetCriteria: string[];
  pendingQuestions: {
    criterionId: string;
    question: string;
    options?: string[];
  }[];
}

export interface RequirementAuditResult {
  serviceId: string;
  totalRequired: number;
  availableCount: number;
  missingCount: number;
  readyForApplication: boolean;
  documents: {
    requirement: ServiceDocumentRequirement;
    isAvailable: boolean;
    vaultDocumentId?: string;
    status: "READY" | "OPTIMIZATION_NEEDED" | "MISSING";
    optimizationNote?: string;
  }[];
  operatorProcurementPlan: string[];
}

export interface FormFieldGuidance {
  field: ServiceFieldDefinition;
  stepIndex: number;
  totalSteps: number;
  operatorDialogue: string;
  suggestedValueFromVault?: string;
  isValid: boolean;
  validationError?: string;
  boundaryNotice?: string;
}

export interface DocumentPreparationAudit {
  fileName: string;
  fileSizeBytes: number;
  targetSizeBytes: number;
  isCompliant: boolean;
  actionsPerformed: string[];
  preparedFileSizeBytes?: number;
  readabilityScore: number;
  qualityStatus: "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "REQUIRES_RETAKE";
  operatorAdvice: string;
}

export interface ValidationReport {
  serviceId: string;
  canProceedToSubmit: boolean;
  errorCount: number;
  warningCount: number;
  passedCount: number;
  checks: {
    ruleId: string;
    ruleName: string;
    severity: "ERROR" | "WARNING" | "PASS";
    message: string;
    fieldId?: string;
    actionNeeded?: string;
  }[];
  operatorFinalChecklist: string[];
}

export interface SubmissionGuidance {
  serviceId: string;
  serviceName: string;
  officialSubmissionUrl: string;
  operatorWalkthrough: string[];
  postSubmissionTimeline: {
    timelineDays: string;
    inspectingOfficer: string;
    expectedStatusProgression: string[];
  };
  acknowledgementGuide: {
    identifierName: string; // e.g. "Application Number", "Ack Slip No", "Token ID"
    formatExample: string;
    storageAdvice: string;
  };
}

export interface PaymentAdvisory {
  serviceId: string;
  officialFee: number;
  currency: string;
  operatorWarning: string;
  acceptedModes: string[];
  paymentStepByStep: string[];
  receiptInstructions: string;
}
