import { GoogleGenAI } from "@google/genai";
import { verifiedServiceById, VerifiedService } from "@/lib/registry/verified-service-registry";

export type SaarthiIntent =
  | "SERVICE_DISCOVERY"
  | "REQUIREMENT_EXPLANATION"
  | "DOCUMENT_GUIDANCE"
  | "APPLICATION_GUIDANCE"
  | "PORTAL_ERROR_EXPLANATION"
  | "GENERAL_GUIDANCE"
  | "UNKNOWN";

export interface SaarthiChatContext {
  serviceId?: string;
  pageType?: string;
  pagePath?: string;
  safeContextNote?: string;
}

export interface SaarthiMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SaarthiResponse {
  text: string;
  intent: SaarthiIntent;
  serviceId?: string;
  suggestedLink?: {
    label: string;
    url: string;
  };
  modelUsed: string;
}

const SAARTHI_SYSTEM_INSTRUCTION = `You are Saarthi, the AI assistant inside Seva Saarthi.
Help citizens:
- discover government services
- understand service requirements
- explain application steps
- explain document requirements
- explain portal validation errors
- guide users through supported government-service workflows
- explain what Seva Saarthi can automate

Rules:
- never invent government requirements
- never invent official application status
- never invent application numbers
- never claim an application was submitted unless an official portal actually confirms it
- never claim government approval
- never claim eligibility unless sufficient verified information exists
- never ask for passwords
- never ask for OTP values
- never ask for CAPTCHA answers
- never ask for payment credentials
- never bypass CAPTCHA
- never bypass OTP
- never make government decisions
- never approve or reject an application
- never claim to be a government authority
- clearly distinguish AI guidance from official government information
- when information is uncertain, say so
- prefer verified Seva Saarthi service-registry information
- tell the user when they should verify information on the official portal`;

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("GEMINI_NOT_CONFIGURED: Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

function classifyIntent(query: string, reply: string): SaarthiIntent {
  const lower = query.toLowerCase();
  if (lower.includes("error") || lower.includes("failed") || lower.includes("rejected") || lower.includes("invalid")) {
    return "PORTAL_ERROR_EXPLANATION";
  }
  if (lower.includes("document") || lower.includes("aadhaar") || lower.includes("certificate") || lower.includes("photo") || lower.includes("signature")) {
    return "DOCUMENT_GUIDANCE";
  }
  if (lower.includes("how to apply") || lower.includes("step") || lower.includes("process") || lower.includes("track")) {
    return "APPLICATION_GUIDANCE";
  }
  if (lower.includes("eligible") || lower.includes("criteria") || lower.includes("income limit") || lower.includes("age")) {
    return "REQUIREMENT_EXPLANATION";
  }
  if (lower.includes("pan") || lower.includes("scholarship") || lower.includes("scheme") || lower.includes("service") || lower.includes("find")) {
    return "SERVICE_DISCOVERY";
  }
  return "GENERAL_GUIDANCE";
}

export async function generateSaarthiResponse(
  userQuery: string,
  history: SaarthiMessageInput[] = [],
  context?: SaarthiChatContext
): Promise<SaarthiResponse> {
  const ai = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // Build service context if available from verified registry
  let serviceContextPrompt = "";
  let matchedService: VerifiedService | undefined;

  if (context?.serviceId) {
    matchedService = verifiedServiceById(context.serviceId);
  } else {
    // Check if query directly references verified services
    const qLower = userQuery.toLowerCase();
    if (qLower.includes("pan") || qLower.includes("protean") || qLower.includes("tax")) {
      matchedService = verifiedServiceById("pan-application-protean");
    } else if (qLower.includes("scholarship") || qLower.includes("post matric") || qLower.includes("nsp")) {
      matchedService = verifiedServiceById("s001");
    }
  }

  if (matchedService) {
    serviceContextPrompt = `
[VERIFIED SERVICE CONTEXT]
Service ID: ${matchedService.serviceId}
Service Name: ${matchedService.serviceName}
Authority: ${matchedService.authority}
Official Application URL: ${matchedService.officialApplicationUrl}
Official Information URL: ${matchedService.officialInformationUrl}
URL Type: ${matchedService.urlType}
Eligibility: ${matchedService.eligibility}
Required Documents: ${matchedService.requiredDocuments.join(", ") || "Refer to official portal"}
Application Steps: ${matchedService.applicationSteps.join(" -> ") || "Refer to official portal"}
Document Rules: ${matchedService.documentRules.join("; ") || "Refer to official guidelines"}
Support Level: ${matchedService.supportLevel}
Sensitive Steps (Citizen MUST perform manually): ${matchedService.sensitiveSteps.join(", ")}
`;
  }

  const safePagePrompt = context?.pageType || context?.pagePath
    ? `\n[CITIZEN PAGE CONTEXT: Type=${context.pageType || "General"}, Path=${context.pagePath || "/"}]`
    : "";

  const systemInstruction = `${SAARTHI_SYSTEM_INSTRUCTION}
${serviceContextPrompt}
${safePagePrompt}
Always maintain safety, citizen privacy, and never ask for or accept credentials or OTPs.`;

  // Construct conversation turns for Gemini
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  // Add limited recent history (up to last 10 messages)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (msg.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  // Append current user message
  contents.push({ role: "user", parts: [{ text: userQuery }] });

  const result = await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  const responseText = result.text || "";
  if (!responseText) {
    throw new Error("GEMINI_EMPTY_RESPONSE: Model returned no response text.");
  }

  const intent = classifyIntent(userQuery, responseText);

  let suggestedLink: { label: string; url: string } | undefined;
  if (matchedService) {
    suggestedLink = {
      label: `Open Official ${matchedService.serviceName} Portal`,
      url: matchedService.officialApplicationUrl,
    };
  }

  return {
    text: responseText,
    intent,
    serviceId: matchedService?.serviceId,
    suggestedLink,
    modelUsed: modelName,
  };
}
