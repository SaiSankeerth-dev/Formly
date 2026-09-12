/** Shared contracts for the citizen-controlled official-portal agent. */
export type SupportLevel = "FULL_ASSIST" | "PARTIAL_ASSIST" | "GUIDED" | "UNSUPPORTED";
export type PageType = "LOGIN" | "DASHBOARD" | "SERVICE_SELECTION" | "APPLICATION_FORM" | "DOCUMENT_UPLOAD" | "REVIEW" | "PAYMENT" | "OTP" | "CAPTCHA" | "DECLARATION" | "SUCCESS" | "ERROR" | "UNKNOWN";
export type AgentState = "EMPTY" | "CONNECTING" | "READY" | "USER_INPUT_REQUIRED" | "USER_CONFIRMATION_REQUIRED" | "PROCESSING" | "SUCCESS" | "ERROR" | "UNSUPPORTED" | "UNKNOWN";
export type SafeAction =
  | { type: "READ_PAGE" }
  | { type: "HIGHLIGHT_ELEMENT"; elementId: string }
  | { type: "FILL_FIELD"; elementId: string; value: string; source: string; confidence: number }
  | { type: "SELECT_OPTION"; elementId: string; value: string; source: string; confidence: number }
  | { type: "CHECK_BOX"; elementId: string; checked: boolean }
  | { type: "UPLOAD_FILE"; elementId: string; documentId: string }
  | { type: "SCROLL"; direction: "UP" | "DOWN" }
  | { type: "OPEN_SECTION"; elementId: string }
  | { type: "WAIT"; milliseconds: number }
  | { type: "VALIDATE" }
  | { type: "REQUEST_USER_INPUT"; question: string; elementId?: string }
  | { type: "REQUEST_CONFIRMATION"; message: string; elementId?: string };
export interface PageField { id: string; tag: "input" | "select" | "textarea" | "button"; type: string; label: string; required: boolean; options?: string[]; attributes: Record<string, string>; }
export interface PageModel { pageType: PageType; url: string; title: string; fields: PageField[]; documents: Array<{ id: string; label: string; instruction: string }>; validationMessages: string[]; sensitiveSignals: Array<"OTP" | "CAPTCHA" | "PAYMENT" | "DECLARATION">; observedAt: string; }
export interface BrowserSession { sessionId: string; userId: string; serviceId: string; officialDomain: string; currentUrl: string; currentPageType: PageType; state: AgentState; startedAt: string; lastActivity: string; agentStatus: string; completedSteps?: string[]; pendingActions?: SafeAction[]; errors?: string[]; confirmations?: string[]; }
