import { GoogleGenAI } from "@google/genai";
import { verifiedServiceById, VerifiedService } from "@/lib/registry/verified-service-registry";

export type SaarthiIntent =
  | "SERVICE_DISCOVERY"
  | "REQUIREMENT_EXPLANATION"
  | "DOCUMENT_GUIDANCE"
  | "APPLICATION_GUIDANCE"
  | "PORTAL_ERROR_EXPLANATION"
  | "GENERAL_GUIDANCE"
  | "CHITCHAT"
  | "TASK_ASSISTANCE"
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

const SAARTHI_SYSTEM_INSTRUCTION = `You are Saarthi (सारथी), an intelligent, empathetic, highly knowledgeable, and versatile AI assistant created for Seva Saarthi (India's Citizen Application & Services Platform).

Core Identity & Voice:
- Warm, polite, courteous, and respectful. Use Indian greetings naturally (Namaste, Hello, Hi) when citizens greet you.
- You can freely converse, answer any question, and assist with ANY topic the citizen brings up — whether it is open conversation, greetings, science, mathematics, technology, drafting letters, language translation, creative writing, productivity, or general knowledge.
- You are not limited only to government queries; you can speak or say whatever the user asks, while remaining a helpful, polite, and constructive companion.

Expertise in Indian Public Services:
- You possess comprehensive knowledge of Indian government portals, welfare schemes, certificates, and citizen documentation:
  * Identity & Taxation: PAN Card (New Form 49A, Corrections, Aadhaar-PAN linking via Protean/UTIITSL/e-Filing).
  * Digital Identity: Aadhaar (UIDAI updates, address updates, enrolment centers, mAadhaar).
  * Revenue & Certificates: Income Certificate, Caste Certificate, Domicile/Residence Certificate, Non-Creamy Layer (NCL), EWS Certificate.
  * Education & Welfare: National Scholarship Portal (NSP), Post-Matric/Pre-Matric scholarships, PM-Kisan Samman Nidhi, Ayushman Bharat (AB-PMJAY), EPFO/UAN passbook, DigiLocker integration.
  * Transport & Civic: Driving Licence (Sarathi Parivahan, Learner's Licence test), Voter ID (NVSP / Election Commission), Passport Seva (new/renewal).
- For public service questions:
  * Provide structured, numbered, step-by-step guidance.
  * Mention required documents clearly with accepted alternatives.
  * Mention estimated processing times and official government websites.
  * When uncertain about specific state-level fees or changing rules, advise the citizen to verify on the official state portal.

Safety, Ethics & Privacy:
- Never ask for or record citizen passwords, banking PINs, or live SMS OTPs.
- Respect citizen privacy and encourage safe digital practices.
- Multi-lingual Support: You support English, Hindi, Hinglish, and major Indian languages (Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati, etc.) seamlessly according to the citizen's preference.`;

import fs from "fs";
import path from "path";

function ensureEnvLoaded(): void {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) return;
  try {
    const envFiles = [".env.local", ".env"];
    for (const f of envFiles) {
      const p = path.resolve(process.cwd(), f);
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, "utf-8").split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const idx = trimmed.indexOf("=");
            if (idx > 0) {
              const k = trimmed.substring(0, idx).trim();
              const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
              if (k && !process.env[k]) {
                process.env[k] = v;
              }
            }
          }
        }
      }
    }
  } catch {}
}

export function isGeminiConfigured(): boolean {
  ensureEnvLoaded();
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

export function getGeminiClient(): GoogleGenAI {
  ensureEnvLoaded();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("GEMINI_NOT_CONFIGURED: Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

export function classifyIntent(query: string, reply: string): SaarthiIntent {
  const lower = query.toLowerCase().trim();
  if (
    lower === "hi" ||
    lower === "hello" ||
    lower === "hey" ||
    lower === "namaste" ||
    lower.startsWith("hi ") ||
    lower.startsWith("hello ") ||
    lower.startsWith("hey ")
  ) {
    return "CHITCHAT";
  }
  if (lower.includes("error") || lower.includes("failed") || lower.includes("rejected") || lower.includes("invalid")) {
    return "PORTAL_ERROR_EXPLANATION";
  }
  if (lower.includes("document") || lower.includes("aadhaar") || lower.includes("certificate") || lower.includes("photo") || lower.includes("signature")) {
    return "DOCUMENT_GUIDANCE";
  }
  if (lower.includes("how to apply") || lower.includes("step") || lower.includes("process") || lower.includes("track") || lower.includes("status")) {
    return "APPLICATION_GUIDANCE";
  }
  if (lower.includes("eligible") || lower.includes("criteria") || lower.includes("income limit") || lower.includes("age")) {
    return "REQUIREMENT_EXPLANATION";
  }
  if (lower.includes("pan") || lower.includes("scholarship") || lower.includes("scheme") || lower.includes("service") || lower.includes("find")) {
    return "SERVICE_DISCOVERY";
  }
  if (lower.includes("write") || lower.includes("draft") || lower.includes("calculate") || lower.includes("solve") || lower.includes("translate")) {
    return "TASK_ASSISTANCE";
  }
  return "GENERAL_GUIDANCE";
}

export function generateLocalFallbackResponse(
  userQuery: string,
  context?: SaarthiChatContext
): SaarthiResponse {
  const q = userQuery.toLowerCase().trim();

  // 1. Greetings
  if (
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q === "namaste" ||
    q.startsWith("hi ") ||
    q.startsWith("hello ") ||
    q.startsWith("hey ")
  ) {
    return {
      text: "Namaste! I am Saarthi, your AI assistant. How can I help you today? You can ask me about Indian government schemes, document checklists, application steps, or any general question you'd like to explore!",
      intent: "CHITCHAT",
      modelUsed: "local-fallback",
    };
  }

  // 2. PAN Card
  if (q.includes("pan") || q.includes("protean") || q.includes("tax")) {
    return {
      text: `### How to Apply for a PAN Card (Form 49A)\n\n1. **Official Portals**: Apply through Protean (NSDL) or UTIITSL online portal.\n2. **Documents Required**:\n   - **Identity Proof**: Aadhaar Card, Voter ID, Passport, or Driving Licence.\n   - **Date of Birth Proof**: Aadhaar Card, Birth Certificate, or 10th Class Marksheet.\n   - **Address Proof**: Aadhaar Card, Electricity Bill, Bank Statement, or Passport.\n3. **Application Steps**:\n   - Fill Form 49A online and choose digital e-KYC (using Aadhaar OTP) for instant paperless processing.\n   - Pay the government fee (₹107 for physical delivery in India, ₹72 for e-PAN only).\n   - Receive your 15-digit acknowledgement number to track delivery.\n4. **Delivery**: e-PAN is delivered to your email in 2–3 days; physical card is dispatched by India Post within 7–10 days.`,
      intent: "SERVICE_DISCOVERY",
      serviceId: "pan-application-protean",
      suggestedLink: {
        label: "Open Official Protean PAN Portal",
        url: "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
      },
      modelUsed: "local-fallback",
    };
  }

  // 3. Aadhaar
  if (q.includes("aadhaar") || q.includes("uidai")) {
    return {
      text: `### Aadhaar Services & Updates\n\n- **Online Updates (myAadhaar)**: You can update your Address online through the myAadhaar portal (myaadhaar.uidai.gov.in) using your registered mobile number for OTP verification.\n- **Biometric & Demographic Updates (Name/DOB/Mobile)**: Requires visiting an authorized Aadhaar Seva Kendra (ASK) with valid original documentary proof.\n- **Linking**: Ensure your Aadhaar is linked with your PAN and bank account for DBT (Direct Benefit Transfer) welfare schemes.`,
      intent: "DOCUMENT_GUIDANCE",
      suggestedLink: {
        label: "Visit UIDAI myAadhaar Portal",
        url: "https://myaadhaar.uidai.gov.in/",
      },
      modelUsed: "local-fallback",
    };
  }

  // 4. Caste / Income / Domicile Certificate
  if (q.includes("caste") || q.includes("income") || q.includes("domicile") || q.includes("residence")) {
    return {
      text: `### Revenue Certificates (Income / Caste / Domicile)\n\n1. **Issuing Authority**: Tahsildar / Revenue Department of your respective State Government.\n2. **Common Requirements**:\n   - Identity Proof (Aadhaar / Voter ID)\n   - Address Proof (Ration card / Electricity bill)\n   - Income Proof: Salary slip, Form 16, or Village Revenue Officer (VRO) report.\n   - Caste Proof: Father/Sibling's caste certificate or community school register extract.\n3. **Where to Apply**: Apply through your State's Citizen Service Portal (e.g., MeeSeva in TS/AP, e-District in UP/Delhi, Seva Sindhu in Karnataka).`,
      intent: "DOCUMENT_GUIDANCE",
      modelUsed: "local-fallback",
    };
  }

  // 5. Scholarship
  if (q.includes("scholarship") || q.includes("nsp")) {
    return {
      text: `### National Scholarship Portal (NSP) Guide\n\n1. **Eligibility**: Available for Pre-Matric, Post-Matric, and Higher Education students under Central & State schemes.\n2. **Required Documents**:\n   - Aadhaar Card / Aadhaar Enrolment Slip\n   - Current Academic Bonafide Certificate & Marksheets\n   - Valid Income Certificate (issued by competent revenue authority)\n   - Bank Account Passbook (Aadhaar-seeded)\n   - Caste / Category Certificate (if applicable)\n3. **Application**: Register via scholarship.gov.in and complete One-Time Registration (OTR).`,
      intent: "SERVICE_DISCOVERY",
      serviceId: "s001",
      suggestedLink: {
        label: "Visit National Scholarship Portal (NSP)",
        url: "https://scholarships.gov.in/",
      },
      modelUsed: "local-fallback",
    };
  }

  // 6. Default Fallback
  return {
    text: `Namaste! I am here to assist you. You asked: "${userQuery}".\n\nI can help you explore government services, verify required documents for certificates (such as PAN, Aadhaar, Income, Caste, or Scholarships), explain application procedures, or assist with any general questions. How may I guide you next?`,
    intent: "GENERAL_GUIDANCE",
    modelUsed: "local-fallback",
  };
}

export async function generateSaarthiResponse(
  userQuery: string,
  history: SaarthiMessageInput[] = [],
  context?: SaarthiChatContext
): Promise<SaarthiResponse> {
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

  // If Gemini is configured, try calling real Gemini API
  if (isGeminiConfigured()) {
    try {
      const ai = getGeminiClient();

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
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      });

      const responseText = result.text || "";
      if (responseText && responseText.trim().length > 0) {
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
    } catch (apiErr: any) {
      console.warn("[generateSaarthiResponse] Gemini API call warning:", apiErr?.message || apiErr);
    }
  }

  // Graceful fallback if Gemini API is temporarily unavailable or returned empty text
  return generateLocalFallbackResponse(userQuery, context);
}
