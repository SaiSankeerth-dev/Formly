import { pgQuery } from "./pg-db";

export interface AIExplanationRequest {
  applicationId: string;
  decisionId: string;
  reason: string;
  affectedField?: string;
  type: "RETURN" | "REJECT";
  serviceName?: string;
  applicantName?: string;
}

export interface AIExplanationResult {
  explanation: string;
  recommendedActions: string[];
  category?: string;
}

interface IssueCategory {
  code: string;
  title: string;
  generate: (context: {
    serviceName: string;
    affectedField: string;
    reason: string;
    isReturn: boolean;
  }) => { explanation: string; actions: string[] };
}

const ISSUE_CATEGORIES: IssueCategory[] = [
  {
    code: "IMAGE_QUALITY",
    title: "Document Image Quality & Legibility",
    generate: ({ serviceName, affectedField, reason, isReturn }) => ({
      explanation: isReturn
        ? `During our verification for your ${serviceName}, the reviewing officer noted that your ${affectedField} is unclear or blurred ("${reason}"). Official guidelines require high-contrast, fully readable scans so that government verifiers and automated security readers can authenticate the credentials.`
        : `Your application for ${serviceName} could not be approved because the submitted ${affectedField} did not meet legibility requirements ("${reason}").`,
      actions: [
        `Re-scan your ${affectedField} in a well-lit area without camera flash, glare, or cast shadows`,
        "Ensure all 4 corners of the original document are visible within the frame",
        "Export the file in high resolution (minimum 300 DPI) and under the 200 KB standard limit",
        "Verify that text, seals, and issuing officer signatures are clearly legible before re-uploading",
      ],
    }),
  },
  {
    code: "PHOTO_SPEC",
    title: "Photograph & Signature Specifications",
    generate: ({ serviceName, affectedField, reason, isReturn }) => ({
      explanation: isReturn
        ? `The reviewing officer for your ${serviceName} noted an issue with your ${affectedField} ("${reason}"). Standard government portal specifications require a recent color passport photograph (3.5 cm x 2.5 cm) on a plain white or light background, and a signature signed in dark blue or black ink on plain paper.`
        : `Your application for ${serviceName} was rejected due to non-compliant photograph or signature specifications ("${reason}").`,
      actions: [
        "Take a fresh passport photo looking straight into the camera with neutral expression and ears visible",
        "Ensure the background is pure white or off-white with no patterns or shadows",
        "Sign on plain unruled white paper using a dark blue or black pen, crop tightly around the signature, and upload",
      ],
    }),
  },
  {
    code: "DATA_MISMATCH",
    title: "Demographic Data Discrepancy",
    generate: ({ serviceName, affectedField, reason, isReturn }) => ({
      explanation: isReturn
        ? `A demographic discrepancy was identified in your ${serviceName} submission ("${reason}"). Government data-matching cross-references your entered details with foundational registers (UIDAI Aadhaar, Matriculation, or Civil Registration). The name or date of birth must match character-for-character.`
        : `Your application for ${serviceName} could not be processed due to a verified data conflict between your submitted records and government master databases ("${reason}").`,
      actions: [
        `Compare the spelling of your ${affectedField} on your Aadhaar card with your educational certificates`,
        "If you have recently changed your name or updated your Aadhaar, provide the official Gazette notification or update slip",
        "Ensure your date of birth is entered in the standard DD/MM/YYYY format exactly as recorded on your birth certificate",
      ],
    }),
  },
  {
    code: "RECENCY_VALIDITY",
    title: "Document Recency & Authority Validity",
    generate: ({ serviceName, affectedField, reason, isReturn }) => ({
      explanation: isReturn
        ? `Your submitted ${affectedField} for ${serviceName} requires an updated certificate ("${reason}"). Government compliance policies stipulate that address utility bills must be dated within the last 3 months, and income or caste certificates must belong to the active financial year issued by a competent Revenue authority (Tehsildar/SDM).`
        : `Your application for ${serviceName} was not accepted because the validity period of the supporting document has expired ("${reason}").`,
      actions: [
        "Obtain a utility bill (electricity, water, piped gas) or bank passbook statement issued within the last 90 days",
        "Check that the issuing authority's digital signature or official seal and dispatch number are intact",
        "Submit the current financial year's valid certificate",
      ],
    }),
  },
];

function classifyReason(reason: string, affectedField?: string): IssueCategory {
  const text = `${reason} ${affectedField || ""}`.toLowerCase();

  if (
    text.includes("blur") ||
    text.includes("cropped") ||
    text.includes("cut") ||
    text.includes("unreadable") ||
    text.includes("low resolution") ||
    text.includes("dark") ||
    text.includes("glare") ||
    text.includes("clarity")
  ) {
    return ISSUE_CATEGORIES[0]; // IMAGE_QUALITY
  }

  if (
    text.includes("photo") ||
    text.includes("picture") ||
    text.includes("signature") ||
    text.includes("sign") ||
    text.includes("dimension") ||
    text.includes("background")
  ) {
    return ISSUE_CATEGORIES[1]; // PHOTO_SPEC
  }

  if (
    text.includes("mismatch") ||
    text.includes("conflict") ||
    text.includes("spelling") ||
    text.includes("name") ||
    text.includes("dob") ||
    text.includes("birth") ||
    text.includes("gender")
  ) {
    return ISSUE_CATEGORIES[2]; // DATA_MISMATCH
  }

  if (
    text.includes("expired") ||
    text.includes("old") ||
    text.includes("validity") ||
    text.includes("month") ||
    text.includes("dated") ||
    text.includes("authority") ||
    text.includes("tehsildar") ||
    text.includes("seal")
  ) {
    return ISSUE_CATEGORIES[3]; // RECENCY_VALIDITY
  }

  // Default fallback
  return {
    code: "GENERAL_REVIEW",
    title: "Administrative Verification",
    generate: ({ serviceName, affectedField, reason, isReturn }) => ({
      explanation: isReturn
        ? `We have reviewed your application for ${serviceName} and noted an item requiring your attention: "${reason}". Please review your ${affectedField || "submitted details"} and provide the requested update so we can proceed with your application.`
        : `Your application for ${serviceName} could not be processed at this time due to: "${reason}". Please review the service eligibility guidelines or re-apply with corrected documentation.`,
      actions: [
        `Review the details in your application relating to ${affectedField || "this step"}`,
        "Ensure all uploaded documents match official government prerequisites",
        "Resubmit your updated details through your citizen dashboard tracker",
      ],
    }),
  };
}

/**
 * AI Explanation Pipeline
 * Generates citizen-friendly, actionable explanations for officer decisions
 * with structured prompt orchestration (service knowledge + case facts + policy boundaries).
 */
export async function generateAIExplanation(request: AIExplanationRequest): Promise<AIExplanationResult> {
  const { reason, affectedField, type } = request;
  const isReturn = type === "RETURN";
  const serviceName = request.serviceName || "Government Public Service (PAN / Citizen Scheme)";
  const fieldName = affectedField || "submitted documentation";

  // Optional: If GEMINI_API_KEY is available in production, call Google Gemini with structured prompt
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const prompt = `
You are the Seva Saarthi Citizen AI Assistant, an empathetic, non-authoritative government guidance agent.
The reviewing officer has marked a citizen's application with the following action:
- Action Type: ${isReturn ? "RETURN FOR CORRECTION" : "REJECTION"}
- Government Service: ${serviceName}
- Affected Field / Document: ${fieldName}
- Official Officer Note: "${reason}"

POLICY BOUNDARIES (MANDATORY):
1. You are strictly non-authoritative and advisory. You CANNOT guarantee approval, override statutory rules, or waive official requirements.
2. Tone must be reassuring, highly respectful, clear, and actionable in plain Indian English.
3. Provide a clear 2-3 sentence explanation translating official bureaucratic remarks into plain language.
4. Provide exactly 3 or 4 concrete, numbered remediation steps.

Respond with valid JSON only in this exact format:
{
  "explanation": "...",
  "recommendedActions": ["step 1", "step 2", "step 3"]
}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.explanation && Array.isArray(parsed.recommendedActions)) {
            return {
              explanation: parsed.explanation,
              recommendedActions: parsed.recommendedActions,
              category: "LLM_SYNTHESIZED",
            };
          }
        }
      }
    } catch (llmErr) {
      // Graceful fallback to deterministic domain orchestrator
      console.warn("[AI Pipeline] External LLM call skipped or timed out, using domain prompt synthesizer");
    }
  }

  // Deterministic Domain Prompt Orchestrator
  const category = classifyReason(reason, affectedField);
  const synthesized = category.generate({
    serviceName,
    affectedField: fieldName,
    reason,
    isReturn,
  });

  return {
    explanation: synthesized.explanation,
    recommendedActions: synthesized.actions,
    category: category.code,
  };
}

/**
 * Orchestrates the AI explanation and saves it to the database.
 */
export async function triggerAIExplanationPipeline(
  applicationId: string,
  decisionId: string,
  reason: string,
  affectedField?: string,
  type: "RETURN" | "REJECT" = "RETURN"
): Promise<void> {
  try {
    // Attempt to enrich context from authoritative database
    let serviceName = "Permanent Account Number (PAN) Card";
    let applicantName = "Citizen Applicant";

    try {
      const rows = await pgQuery(
        `SELECT a.id, a.service_id, a.user_id, s.name as service_name
         FROM applications a
         LEFT JOIN services s ON a.service_id = s.id
         WHERE a.id = $1 OR a.application_number = $1 LIMIT 1`,
        [applicationId]
      );
      if (rows && rows.length > 0) {
        if (rows[0].service_name) serviceName = rows[0].service_name;
      }
    } catch {
      // Continue with default service name
    }

    const result = await generateAIExplanation({
      applicationId,
      decisionId,
      reason,
      affectedField,
      type,
      serviceName,
      applicantName,
    });

    const assistanceType = type === "RETURN" ? "RETURN_EXPLANATION" : "REJECTION_EXPLANATION";

    await pgQuery(
      `INSERT INTO ai_case_assistance (
        application_id, decision_id, assistance_type, source_reason, explanation, recommended_actions, review_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED_FOR_DISPLAY')`,
      [
        applicationId,
        decisionId,
        assistanceType,
        reason,
        result.explanation,
        JSON.stringify(result.recommendedActions),
      ]
    );
  } catch (error) {
    console.error("[AI Pipeline Error]", error);
    // We don't throw here to avoid blocking the main officer action
  }
}
