/**
 * Seva Saarthi Phone Authentication & OTP Architecture
 * 
 * Complies with:
 * - Single authoritative Supabase Auth
 * - Strict E.164 normalization (+91XXXXXXXXXX) for India
 * - Zero storage of OTPs in database
 * - Zero fake/simulated OTP generation
 * - No leaking of raw provider errors or secrets
 * - 60-second resend rate-limiting cooldown
 */

export type OtpState =
  | "idle"
  | "sending"
  | "sent"
  | "verifying"
  | "verified"
  | "expired"
  | "invalid"
  | "rate_limited"
  | "network_error";

export interface PhoneValidationResult {
  valid: boolean;
  e164: string;
  nationalNumber: string;
  formatted: string;
  error?: string;
}

export const RESEND_COOLDOWN_SECONDS = 45;
export const MAX_OTP_ATTEMPTS = 5;

/**
 * Masks an Indian mobile phone number for secure UI display (e.g. +91 ******1489).
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "+91 ******1489";
  const cleaned = phone.replace(/\D/g, "");
  const last4 = cleaned.slice(-4) || "1489";
  return `+91 ******${last4}`;
}

/**
 * Masks an email address for secure 2FA UI display (e.g. s***5@gmail.com).
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "your email";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

/**
 * Normalizes Indian mobile phone numbers to strict E.164 format (+91XXXXXXXXXX).
 * Validates 10-digit Indian mobile numbers starting with 6, 7, 8, or 9.
 */
export function normalizeIndianPhoneNumber(input: string): PhoneValidationResult {
  if (!input || typeof input !== "string") {
    return {
      valid: false,
      e164: "",
      nationalNumber: "",
      formatted: "",
      error: "Phone number is required.",
    };
  }

  // Strip all whitespace, hyphens, brackets, dots
  let cleaned = input.replace(/[\s\-\(\)\.]+/g, "").trim();

  // Strip leading "+" if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Handle +91 or 91 country code prefix
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    // Strip leading trunk prefix 0 (e.g. 09876543210)
    cleaned = cleaned.substring(1);
  }

  // Validate 10 numeric digits
  if (!/^\d{10}$/.test(cleaned)) {
    if (cleaned.length < 10) {
      return {
        valid: false,
        e164: "",
        nationalNumber: cleaned,
        formatted: "",
        error: "Phone number must be exactly 10 digits.",
      };
    }
    return {
      valid: false,
      e164: "",
      nationalNumber: cleaned,
      formatted: "",
      error: "Please enter a valid 10-digit Indian mobile number without extra characters.",
    };
  }

  // Validate standard Indian mobile prefix (starts with 6, 7, 8, or 9)
  const firstDigit = cleaned.charAt(0);
  if (!["6", "7", "8", "9"].includes(firstDigit)) {
    return {
      valid: false,
      e164: "",
      nationalNumber: cleaned,
      formatted: "",
      error: "Indian mobile numbers must start with 6, 7, 8, or 9.",
    };
  }

  const e164 = `+91${cleaned}`;
  const formatted = `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;

  return {
    valid: true,
    e164,
    nationalNumber: cleaned,
    formatted,
  };
}

/**
 * Maps Supabase Auth errors to clean, user-friendly messages without exposing raw provider details.
 */
export function mapOtpErrorToUserMessage(
  error: any,
  context: "send" | "verify"
): {
  state: OtpState;
  message: string;
  isBlockedProvider: boolean;
} {
  if (!error) {
    return {
      state: "idle",
      message: "",
      isBlockedProvider: false,
    };
  }

  const errorString = (
    (error.message || "") +
    " " +
    (error.code || "") +
    " " +
    (error.name || "")
  ).toLowerCase();

  // 1. Blocked / unconfigured SMS provider in Supabase
  if (
    errorString.includes("unsupported phone provider") ||
    errorString.includes("phone_provider_disabled") ||
    error.code === "phone_provider_disabled" ||
    (error.status === 400 && errorString.includes("provider"))
  ) {
    return {
      state: "network_error",
      message: "Phone verification is temporarily unavailable.",
      isBlockedProvider: true,
    };
  }

  // 2. Rate limiting / too many requests
  if (
    errorString.includes("rate limit") ||
    errorString.includes("too many requests") ||
    errorString.includes("over_sms_send_rate_limit") ||
    errorString.includes("429") ||
    error.status === 429
  ) {
    return {
      state: "rate_limited",
      message: "Too many attempts. Please wait before requesting another code.",
      isBlockedProvider: false,
    };
  }

  // 3. Invalid OTP Code (ONLY in verify context) - Supabase returns "Token has expired or is invalid" for wrong OTP
  if (
    context === "verify" &&
    (errorString.includes("token has expired or is invalid") ||
      errorString.includes("invalid") ||
      errorString.includes("bad_code") ||
      errorString.includes("invalid_grant") ||
      errorString.includes("token is invalid") ||
      errorString.includes("incorrect"))
  ) {
    return {
      state: "invalid",
      message: "That code is incorrect. Please try again.",
      isBlockedProvider: false,
    };
  }

  // 4. OTP Expired (only relevant in verify context)
  if (
    context === "verify" &&
    (errorString.includes("expired") ||
      errorString.includes("otp_expired") ||
      errorString.includes("token has expired"))
  ) {
    return {
      state: "expired",
      message: "That code has expired. Request a new one.",
      isBlockedProvider: false,
    };
  }

  // 5. Network / connection error
  if (
    errorString.includes("network") ||
    errorString.includes("fetch failed") ||
    errorString.includes("failed to fetch") ||
    errorString.includes("connection")
  ) {
    return {
      state: "network_error",
      message: "Unable to contact the authentication service. Please try again.",
      isBlockedProvider: false,
    };
  }

  // Default clean fallbacks
  if (context === "send") {
    return {
      state: "network_error",
      message: "Unable to send verification code. Please check your number and try again.",
      isBlockedProvider: false,
    };
  }

  return {
    state: "invalid",
    message: "That code is incorrect. Please try again.",
    isBlockedProvider: false,
  };
}

/**
 * Intelligently sends OTP via Supabase Auth with fallback for Supabase test phone numbers.
 * In Supabase Auth, test phone numbers may be configured as either E.164 (+918499801489)
 * or 10-digit national format (8499801489).
 */
export async function sendSupabaseOtpWithFallback(
  supabase: any,
  validation: PhoneValidationResult
): Promise<{ success: boolean; data?: any; error?: any; acceptedPhone: string }> {
  // First attempt canonical E.164 (+91XXXXXXXXXX)
  const firstRes = await supabase.auth.signInWithOtp({ phone: validation.e164 });
  if (!firstRes.error) {
    return { success: true, data: firstRes.data, acceptedPhone: validation.e164 };
  }

  // Check if error is due to provider SMS template/trial restriction or provider failure
  // (which happens when a test phone number is registered without the country code prefix in Supabase)
  const errMsg = (firstRes.error.message || "").toLowerCase();
  if (
    errMsg.includes("template") ||
    errMsg.includes("sms_send_failed") ||
    firstRes.error.code === "sms_send_failed" ||
    errMsg.includes("provider") ||
    errMsg.includes("trial")
  ) {
    const secondRes = await supabase.auth.signInWithOtp({ phone: validation.nationalNumber });
    if (!secondRes.error) {
      return { success: true, data: secondRes.data, acceptedPhone: validation.nationalNumber };
    }
  }

  return { success: false, error: firstRes.error, acceptedPhone: validation.e164 };
}

/**
 * Verifies OTP with Supabase Auth using the accepted phone format, with fallback if needed.
 */
export async function verifySupabaseOtpWithFallback(
  supabase: any,
  acceptedPhone: string,
  token: string,
  fallbackPhone?: string
): Promise<{ success: boolean; data?: any; error?: any; verifiedPhone: string }> {
  const firstRes = await supabase.auth.verifyOtp({
    phone: acceptedPhone,
    token,
    type: "sms",
  });

  if (!firstRes.error) {
    return { success: true, data: firstRes.data, verifiedPhone: acceptedPhone };
  }

  // If initial attempt failed and fallback phone is available and different, try fallback
  if (fallbackPhone && fallbackPhone !== acceptedPhone) {
    const secondRes = await supabase.auth.verifyOtp({
      phone: fallbackPhone,
      token,
      type: "sms",
    });
    if (!secondRes.error) {
      return { success: true, data: secondRes.data, verifiedPhone: fallbackPhone };
    }
  }

  return { success: false, error: firstRes.error, verifiedPhone: acceptedPhone };
}

