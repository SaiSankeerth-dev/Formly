/**
 * Seva Saarthi — Strict Boundary Enforcement Engine
 * 
 * Enforces strict division of responsibility across three tiers:
 * 1. ASSISTANT_TIER (Seva Saarthi AI):
 *    - Explain, guide, prepare, validate, compare, resize, compress, extract, highlight errors, suggest, navigate.
 *    - PROHIBITED from: Submitting sensitive credentials, signing legal declarations, executing payments,
 *      pretending an official application is legally submitted/approved.
 * 
 * 2. CITIZEN_TIER (Individual Citizen):
 *    - Controls sensitive information entry (Aadhaar OTP, passwords, bank credentials),
 *      consents, statutory legal declarations, payment authorization, and final click to submit.
 * 
 * 3. GOVERNMENT_AUTHORITY_TIER (Official Department / Statutory Authority / Officers):
 *    - Statutory inquiry, demographic cross-matching, document inspection,
 *      issuance of official digital certificate / sanction / rejection.
 */

import { BoundaryTier } from "@/types/service-assistant";

export interface BoundaryCheckAction {
  actionType:
    | "AI_GUIDE_FIELD"
    | "AI_COMPRESS_DOCUMENT"
    | "AI_VALIDATE_INPUT"
    | "AI_SUGGEST_VALUE"
    | "AI_AUTONOMOUS_SUBMIT"     // FORBIDDEN FOR AI
    | "AI_EXECUTE_PAYMENT"        // FORBIDDEN FOR AI
    | "AI_STATUTORY_APPROVAL"     // FORBIDDEN FOR AI
    | "CITIZEN_ENTER_SENSITIVE"
    | "CITIZEN_SIGN_DECLARATION"
    | "CITIZEN_AUTHORIZE_PAYMENT"
    | "CITIZEN_FINAL_SUBMIT"
    | "OFFICER_FIELD_INSPECTION"
    | "OFFICER_STATUTORY_DECISION";
  initiatedBy: "AI_ASSISTANT" | "CITIZEN" | "GOVERNMENT_OFFICER";
  context?: string;
}

export interface BoundaryEnforcementResult {
  isPermitted: boolean;
  tier: BoundaryTier;
  violationMessage?: string;
  remediationAdvice: string;
}

export class BoundaryEnforcer {
  /**
   * Evaluates whether an intended action adheres strictly to Product Rules & Ethical AI Boundaries.
   */
  public static evaluateAction(action: BoundaryCheckAction): BoundaryEnforcementResult {
    // 1. AI Assistant boundaries
    if (action.initiatedBy === "AI_ASSISTANT") {
      if (action.actionType === "AI_AUTONOMOUS_SUBMIT") {
        return {
          isPermitted: false,
          tier: "ASSISTANT_TIER",
          violationMessage: "Boundary Violation: AI Assistant cannot autonomously submit official government applications without citizen consent and review.",
          remediationAdvice: "Citizen must review summary, enter any required OTP, and click the final submission button themselves.",
        };
      }

      if (action.actionType === "AI_EXECUTE_PAYMENT") {
        return {
          isPermitted: false,
          tier: "ASSISTANT_TIER",
          violationMessage: "Boundary Violation: AI Assistant cannot initiate or deduct financial payments.",
          remediationAdvice: "Direct citizen to the official Government Treasury gateway (UPI/NetBanking) to authorize payment directly.",
        };
      }

      if (action.actionType === "AI_STATUTORY_APPROVAL") {
        return {
          isPermitted: false,
          tier: "ASSISTANT_TIER",
          violationMessage: "Boundary Violation: Seva Saarthi is an assistant, NOT the government authority. Only designated Revenue/Department officers can approve or issue certificates.",
          remediationAdvice: "State clearly that official statutory approval rests solely with the competent Government Officer (e.g. Tahsildar / RTO).",
        };
      }

      return {
        isPermitted: true,
        tier: "ASSISTANT_TIER",
        remediationAdvice: "Assistant safely performs guidance, preparation, validation, or navigation assistance.",
      };
    }

    // 2. Citizen boundaries
    if (action.initiatedBy === "CITIZEN") {
      return {
        isPermitted: true,
        tier: "CITIZEN_TIER",
        remediationAdvice: "Citizen exercises rightful ownership over sensitive data, declarations, payment, and final application submission.",
      };
    }

    // 3. Government Officer boundaries
    if (action.initiatedBy === "GOVERNMENT_OFFICER") {
      return {
        isPermitted: true,
        tier: "GOVERNMENT_AUTHORITY_TIER",
        remediationAdvice: "Competent authority exercises statutory inquiry, verification, and determination.",
      };
    }

    return {
      isPermitted: false,
      tier: "ASSISTANT_TIER",
      violationMessage: "Unknown actor or action initiated.",
      remediationAdvice: "Ensure requests originate from recognized system actors.",
    };
  }

  /**
   * Returns human-readable summary badges for UI display.
   */
  public static getTierMetadata(tier: BoundaryTier) {
    switch (tier) {
      case "ASSISTANT_TIER":
        return {
          name: "Seva Saarthi AI Assistant",
          tag: "AI Guidance & Prep",
          color: "bg-blue-50 text-blue-700 border-blue-200",
          scope: "Teaches, validates, resizes, explains fields, highlights discrepancies. Zero statutory authority.",
        };
      case "CITIZEN_TIER":
        return {
          name: "Citizen Control Zone",
          tag: "Citizen Exclusive",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          scope: "You retain 100% control over sensitive OTPs, identity confirmations, payments, and final declarations.",
        };
      case "GOVERNMENT_AUTHORITY_TIER":
        return {
          name: "Official Government Authority",
          tag: "Statutory Officer",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          scope: "Department Officers (Tahsildar, RTO, Civil Supplies) verify evidence and issue official certificates.",
        };
    }
  }
}
