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

export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_OTP_ATTEMPTS = 5;

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
      message: "Unable to send OTP (SMS service provider not configured in Supabase).",
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
      message: "Too many attempts. Please wait 60 seconds before trying again.",
      isBlockedProvider: false,
    };
  }

  // 3. OTP Expired
  if (
    errorString.includes("expired") ||
    errorString.includes("otp_expired") ||
    errorString.includes("token has expired")
  ) {
    return {
      state: "expired",
      message: "OTP expired. Please request a new verification code.",
      isBlockedProvider: false,
    };
  }

  // 4. Invalid OTP Code
  if (
    errorString.includes("invalid") ||
    errorString.includes("bad_code") ||
    errorString.includes("invalid_grant") ||
    errorString.includes("token is invalid") ||
    errorString.includes("incorrect")
  ) {
    return {
      state: "invalid",
      message: "Invalid OTP. Please check the 6-digit code and try again.",
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
      message: "Unable to connect to authentication server. Please check your network connection.",
      isBlockedProvider: false,
    };
  }

  // Default clean fallbacks
  if (context === "send") {
    return {
      state: "network_error",
      message: "Unable to send OTP. Please verify your phone number and try again.",
      isBlockedProvider: false,
    };
  }

  return {
    state: "invalid",
    message: "Unable to verify OTP. Please check the code and try again.",
    isBlockedProvider: false,
  };
}
