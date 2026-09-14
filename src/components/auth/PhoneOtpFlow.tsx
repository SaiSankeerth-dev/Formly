"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeIndianPhoneNumber,
  mapOtpErrorToUserMessage,
  sendSupabaseOtpWithFallback,
  verifySupabaseOtpWithFallback,
  OtpState,
  RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
  maskPhoneNumber,
  maskEmail,
} from "@/lib/auth/phone-auth";
import { TruecallerQrModal } from "@/components/auth/TruecallerQrModal";

function TruecallerIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.82 15.65c-1.22-.05-2.42-.25-3.55-.61-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.55 6.55 8.35 5.35 8.3 4.13c-.04-.63-.56-1.13-1.2-1.13H3.94c-.69 0-1.26.58-1.23 1.27.47 7.79 6.7 14.02 14.49 14.49.69.03 1.27-.54 1.27-1.23v-3.16c0-.64-.5-1.16-1.13-1.2z" />
    </svg>
  );
}

function IndiaFlagIcon({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="5.33" fill="#FF9933" rx="1" />
      <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
      <rect y="10.67" width="24" height="5.33" fill="#138808" rx="1" />
      <circle cx="12" cy="8" r="2.2" stroke="#000080" strokeWidth="0.6" fill="none" />
      <circle cx="12" cy="8" r="0.5" fill="#000080" />
    </svg>
  );
}

export interface PhoneOtpFlowProps {
  mode?: "login" | "2fa" | "onboarding" | "profile";
  initialPhone?: string;
  initialEmail?: string;
  initialStep?: 1 | 2;
  maskedDisplay?: string;
  onSuccess?: (phoneOrEmail: string, session?: any) => void;
  onCancel?: () => void;
  isAlreadyVerified?: boolean;
  onChangePhone?: (phone: string) => void;
}

export function PhoneOtpFlow({
  mode = "onboarding",
  initialPhone = "",
  initialEmail = "",
  initialStep,
  maskedDisplay,
  onSuccess,
  onCancel,
  isAlreadyVerified = false,
  onChangePhone,
}: PhoneOtpFlowProps) {
  // Step 1: Phone input; Step 2: 6-digit OTP entry
  const startStep = initialStep ?? (mode === "2fa" ? 2 : 1);
  const [step, setStep] = useState<1 | 2>(startStep);
  const [rawPhone, setRawPhone] = useState(initialPhone);
  const [normalizedPhone, setNormalizedPhone] = useState(
    initialPhone.startsWith("+91")
      ? initialPhone
      : initialPhone
      ? `+91${initialPhone.replace(/\D/g, "").slice(-10)}`
      : ""
  );
  const [activePhoneForAuth, setActivePhoneForAuth] = useState<string>(
    initialPhone.startsWith("+91")
      ? initialPhone
      : initialPhone
      ? `+91${initialPhone.replace(/\D/g, "").slice(-10)}`
      : ""
  );
  const [displayPhone, setDisplayPhone] = useState(
    maskedDisplay ||
      (initialPhone
        ? maskPhoneNumber(initialPhone)
        : initialEmail
        ? maskEmail(initialEmail)
        : "")
  );

  // 6 discrete OTP boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpDigitsRef = useRef<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // State machine
  const [otpState, setOtpState] = useState<OtpState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBlockedProvider, setIsBlockedProvider] = useState(false);

  // Rate limiting & cooldown
  const [countdown, setCountdown] = useState<number>(0);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // Truecaller Verification State
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isTruecallerActive, setIsTruecallerActive] = useState(false);
  const [truecallerRequestId, setTruecallerRequestId] = useState("");
  const [truecallerDeepLink, setTruecallerDeepLink] = useState("");
  const [showDesktopQr, setShowDesktopQr] = useState(false);
  const pollTimerRef = useRef<any>(null);

  const stopTruecallerPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsTruecallerActive(false);
    setShowDesktopQr(false);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        window.innerWidth < 768;
      setIsMobileDevice(isMobile);
    }
  }, []);

  // Cooldown timer interval
  useEffect(() => {
    let timer: any = null;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  // Handle Truecaller 1-Tap initiation
  const handleStartTruecaller = async () => {
    stopTruecallerPolling();
    setStatusMessage("");

    const reqId = `tc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const appKey =
      process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY ||
      "oeg7153917a018fd54deeb4e899d4a324e54a";
    const appName = "SevaSaarthi";

    const deepLink = `truecallersdk://truesdk/web_verify?type=btmsheet&requestNonce=${encodeURIComponent(
      reqId
    )}&partnerKey=${encodeURIComponent(appKey)}&partnerName=${encodeURIComponent(
      appName
    )}&lang=en&title=login`;

    setTruecallerRequestId(reqId);
    setTruecallerDeepLink(deepLink);
    setIsTruecallerActive(true);

    // Register pending request on server
    try {
      await fetch("/api/auth/truecaller/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: reqId, meta: { mode } }),
      });
    } catch (err) {
      console.warn("[TRUECALLER] Init register note:", err);
    }

    if (isMobileDevice) {
      // On mobile: trigger Truecaller 1-tap consent bottomsheet
      window.location.href = deepLink;
    } else {
      // On desktop: display QR code modal
      setShowDesktopQr(true);
    }

    // Start polling loop every 1.5 seconds
    let elapsed = 0;
    pollTimerRef.current = setInterval(async () => {
      elapsed += 1500;
      if (elapsed > 3 * 60 * 1000) {
        stopTruecallerPolling();
        setStatusMessage("Truecaller verification timed out. Please retry or use SMS OTP.");
        return;
      }

      try {
        const pollRes = await fetch(`/api/auth/truecaller/poll?requestId=${encodeURIComponent(reqId)}`);
        if (!pollRes.ok) return;

        const pollData = await pollRes.json();
        if (pollData.status === "verified") {
          stopTruecallerPolling();
          setOtpState("verified");
          setStatusMessage("Truecaller verification successful! Redirecting...");

          if (onSuccess) {
            onSuccess(pollData.user?.phone || "", pollData.user);
          }

          const target = pollData.redirectTo || (mode === "profile" ? "/profile" : "/dashboard");
          setTimeout(() => {
            window.location.href = target;
          }, 300);
        } else if (pollData.status === "failed") {
          stopTruecallerPolling();
          setStatusMessage(pollData.error || "Truecaller verification was rejected. Please try SMS OTP.");
        } else if (pollData.status === "expired") {
          stopTruecallerPolling();
          setStatusMessage("Verification session expired. Please try again.");
        }
      } catch (pollErr) {
        console.warn("[TRUECALLER_POLL] Interval note:", pollErr);
      }
    }, 1500);
  };


  // Sync initial phone
  useEffect(() => {
    if (initialPhone && !rawPhone) {
      setRawPhone(initialPhone);
      if (onChangePhone) onChangePhone(initialPhone);
    }
  }, [initialPhone, rawPhone, onChangePhone]);

  // Focus first OTP box on entering Step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // STEP 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    // Input validation & E.164 normalization for India
    const validation = normalizeIndianPhoneNumber(rawPhone);
    if (!validation.valid) {
      setOtpState("invalid");
      setStatusMessage(validation.error || "Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (countdown > 0) {
      setStatusMessage(`Please wait ${countdown} seconds before requesting another code.`);
      return;
    }

    if (attemptCount >= MAX_OTP_ATTEMPTS) {
      setOtpState("rate_limited");
      setStatusMessage("Too many attempts. Please wait 60 seconds before trying again.");
      setCountdown(RESEND_COOLDOWN_SECONDS);
      return;
    }

    setNormalizedPhone(validation.e164);
    setDisplayPhone(validation.formatted);
    setOtpState("sending");
    setStatusMessage("");
    setIsBlockedProvider(false);

    try {
      const supabase = createClient();

      let res: any;
      let acceptedPhone = validation.e164;

      if (mode === "onboarding" || mode === "profile") {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          res = await supabase.auth.updateUser({ phone: validation.e164 });
        } else {
          const sendResult = await sendSupabaseOtpWithFallback(supabase, validation);
          res = sendResult;
          acceptedPhone = sendResult.acceptedPhone;
        }
      } else {
        // Direct Phone Login (Option A)
        const sendResult = await sendSupabaseOtpWithFallback(supabase, validation);
        res = sendResult;
        acceptedPhone = sendResult.acceptedPhone;
      }

      if (res.error) {
        const mapped = mapOtpErrorToUserMessage(res.error, "send");
        setOtpState(mapped.state);
        setStatusMessage(mapped.message);
        setIsBlockedProvider(mapped.isBlockedProvider);
        if (mapped.isBlockedProvider) {
          console.warn("[PHONE_AUTH] BLOCKED_PROVIDER_CONFIGURATION: SMS provider not configured in Supabase project.");
        }
        return;
      }

      // Success: advance to Step 2 with 60s cooldown timer
      setActivePhoneForAuth(acceptedPhone);
      setOtpState("sent");
      setStatusMessage("OTP sent. Please enter the 6-digit code received on your mobile.");
      setCountdown(RESEND_COOLDOWN_SECONDS);
      setAttemptCount((prev) => prev + 1);
      setStep(2);
    } catch (err: any) {
      const mapped = mapOtpErrorToUserMessage(err, "send");
      setOtpState(mapped.state);
      setStatusMessage(mapped.message);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (tokenOrEvent?: React.FormEvent | string) => {
    if (tokenOrEvent && typeof tokenOrEvent !== "string" && typeof tokenOrEvent.preventDefault === "function") {
      tokenOrEvent.preventDefault();
    }

    const token = (
      typeof tokenOrEvent === "string"
        ? tokenOrEvent
        : otpDigitsRef.current.join("").trim() || otpDigits.join("").trim()
    );

    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      setOtpState("invalid");
      setStatusMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setOtpState("verifying");
    setStatusMessage("");

    try {
      const supabase = createClient();
      let res: any;

      const phoneToVerify = activePhoneForAuth || normalizedPhone;
      const altPhone = phoneToVerify.startsWith("+91")
        ? phoneToVerify.replace(/^\+91/, "")
        : `+91${phoneToVerify}`;

      if (initialEmail && (!phoneToVerify || mode === "2fa")) {
        res = await supabase.auth.verifyOtp({
          email: initialEmail,
          token,
          type: "email",
        });
      } else if (mode === "onboarding" || mode === "profile") {
        // Try phone_change verification first for logged-in user
        res = await supabase.auth.verifyOtp({
          phone: phoneToVerify,
          token,
          type: "phone_change",
        });

        // Fallback to type: sms if phone_change was not the registered flow
        if (res.error && (res.error.message?.includes("type") || res.error.message?.includes("token"))) {
          res = await verifySupabaseOtpWithFallback(supabase, phoneToVerify, token, altPhone);
        }
      } else {
        // Standard SMS OTP login
        res = await verifySupabaseOtpWithFallback(supabase, phoneToVerify, token, altPhone);
      }

      if (res.error) {
        const mapped = mapOtpErrorToUserMessage(res.error, "verify");
        setOtpState(mapped.state);
        setStatusMessage(mapped.message);
        return;
      }

      // Supabase verification succeeded!
      setOtpState("verified");
      setStatusMessage("Verification successful! Redirecting...");

      // Update backend database profile using auth.uid() server session
      const canonicalPhone = normalizedPhone || phoneToVerify;
      if (canonicalPhone) {
        try {
          const accessToken = res.data?.session?.access_token;
          await fetch("/api/citizen/phone-verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({ phone: canonicalPhone }),
          });
        } catch (syncErr) {
          console.warn("[PHONE_AUTH] Backend profile sync note:", syncErr);
        }
      }

      // Confirm authoritative Supabase session via getUser() per Part 9
      const { data: verifiedUserData } = await supabase.auth.getUser();
      const verifiedUser = verifiedUserData?.user || res.data?.user;

      if (onSuccess) {
        onSuccess(canonicalPhone || initialEmail, verifiedUser || res.data?.session);
      }
    } catch (err: any) {
      const mapped = mapOtpErrorToUserMessage(err, "verify");
      setOtpState(mapped.state);
      setStatusMessage(mapped.message);
    }
  };

  // Handle individual digit input
  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigitsRef.current];
    updated[index] = char;
    otpDigitsRef.current = updated;
    setOtpDigits(updated);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are entered
    if (char && updated.every((d) => d.length === 1)) {
      const fullToken = updated.join("");
      setTimeout(() => {
        handleVerifyOtp(fullToken);
      }, 50);
    }
  };

  // Handle backspace and navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const updated = [...otpDigitsRef.current];
      if (!updated[index] && index > 0) {
        updated[index - 1] = "";
        otpDigitsRef.current = updated;
        setOtpDigits(updated);
        inputRefs.current[index - 1]?.focus();
      } else {
        updated[index] = "";
        otpDigitsRef.current = updated;
        setOtpDigits(updated);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle pasting 6-digit code
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;

    const updated = ["", "", "", "", "", ""];
    for (let i = 0; i < paste.length; i++) {
      updated[i] = paste[i];
    }
    otpDigitsRef.current = updated;
    setOtpDigits(updated);

    const nextIndex = Math.min(paste.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (paste.length === 6) {
      setTimeout(() => {
        handleVerifyOtp(paste);
      }, 50);
    }
  };

  // If already verified, render clean verified state badge
  if (isAlreadyVerified && otpState !== "sending" && step === 1) {
    return (
      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>{displayPhone || rawPhone || "Phone Number"}</span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-emerald-700">Verified via Supabase Auth</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setOtpState("idle");
            setStatusMessage("");
            setStep(1);
          }}
          className="text-xs font-bold text-[#3B49DF] hover:underline cursor-pointer"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* User-friendly Notification Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
            otpState === "verified" || otpState === "sent"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : otpState === "rate_limited"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {otpState === "verified" || otpState === "sent" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          )}
          <span className="leading-snug">{statusMessage}</span>
        </div>
      )}

      {/* ========================================================
          STEP 1: PHONE NUMBER INPUT
          ======================================================== */}
      {step === 1 && (
        <form onSubmit={handleSendOtp} className="space-y-3.5">
          {/* Prominent Truecaller 1-Tap Verification */}
          <div className="space-y-2">
            <button
              type="button"
              id="citizen-truecaller-btn"
              onClick={handleStartTruecaller}
              disabled={otpState === "sending" || isTruecallerActive}
              className="w-full py-3 px-4 bg-[#0087FF] hover:bg-[#0070D4] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-400/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              <TruecallerIcon className="w-4 h-4 fill-white" />
              <span>1-Tap Verification with Truecaller</span>
            </button>

            {/* Active Truecaller Verification Waiting State */}
            {isTruecallerActive && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0087FF] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0087FF]"></span>
                    </span>
                    <span>Waiting for Truecaller authorization...</span>
                  </div>
                  {!isMobileDevice && (
                    <button
                      type="button"
                      onClick={() => setShowDesktopQr(true)}
                      className="text-xs font-bold text-[#0087FF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Code</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-blue-700 leading-snug">
                  {isMobileDevice
                    ? "Please complete the prompt in your Truecaller app to continue."
                    : "Scan the QR code with your mobile camera or Truecaller app to approve."}
                </p>
                <button
                  type="button"
                  onClick={stopTruecallerPolling}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 self-start cursor-pointer hover:underline"
                >
                  Cancel Truecaller verification
                </button>
              </div>
            )}

            {/* Divider: OR USE SMS OTP */}
            <div className="relative flex items-center justify-center my-3">
              <div className="w-full border-t border-slate-200" />
              <span className="bg-white px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 absolute">
                OR USE SMS OTP
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="citizen-phone-input" className="block text-xs font-bold text-slate-700 mb-1.5">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3B49DF]/20 focus-within:border-[#3B49DF] transition-all overflow-hidden">
              {/* +91 Country Badge */}
              <div className="flex items-center gap-1.5 px-3 bg-slate-100/80 border-r border-slate-200 select-none shrink-0">
                <IndiaFlagIcon className="w-4 h-3" />
                <span className="text-xs font-bold text-slate-700">+91</span>
              </div>
              {/* Phone Input */}
              <input
                id="citizen-phone-input"
                name="phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                required
                value={rawPhone.replace(/\D/g, "").slice(-10)}
                onChange={(e) => {
                  setRawPhone(e.target.value);
                  if (onChangePhone) onChangePhone(e.target.value);
                  if (statusMessage) setStatusMessage("");
                  if (otpState !== "idle") setOtpState("idle");
                }}
                placeholder="98765 43210"
                className="w-full px-3.5 py-2.5 sm:py-3 bg-transparent text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              10-digit Indian mobile number (Aadhaar-linked preferred).
            </p>
          </div>

          {/* Send OTP Button */}
          <button
            type="submit"
            id="citizen-send-otp-btn"
            disabled={otpState === "sending" || countdown > 0}
            className="w-full py-3 px-4 bg-[#3B49DF] hover:bg-[#2F27CE] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {otpState === "sending" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending OTP...</span>
              </>
            ) : countdown > 0 ? (
              <span>Resend available in {countdown}s</span>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                <span>Send OTP</span>
              </>
            )}
          </button>

          {onCancel && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      )}

      {/* ========================================================
          STEP 2: 6-DIGIT OTP VERIFICATION (VIDEO STYLE)
          ======================================================== */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === "2fa" ? "Verify your identity" : "Verify your phone"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                We sent a 6-digit verification code to:{" "}
                <span className="font-bold text-slate-700">
                  {displayPhone || (normalizedPhone ? maskPhoneNumber(normalizedPhone) : (initialEmail ? maskEmail(initialEmail) : "+91 ******1489"))}
                </span>
              </p>
            </div>
            <button
              type="button"
              id="change-phone-btn"
              onClick={() => {
                if (onCancel && mode === "2fa") {
                  onCancel();
                } else {
                  setStep(1);
                  otpDigitsRef.current = ["", "", "", "", "", ""];
                  setOtpDigits(["", "", "", "", "", ""]);
                  setStatusMessage("");
                }
              }}
              className="text-xs font-bold text-[#3B49DF] hover:underline cursor-pointer shrink-0 ml-2"
            >
              {mode === "2fa" ? "Back to Sign In" : "Change phone number"}
            </button>
          </div>

          {/* 6 Discrete Digit Boxes */}
          <div className="flex items-center justify-between gap-2 sm:gap-2.5 on-otp-grid">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                data-testid={`otp-box-${idx}`}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-black bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#3B49DF] focus:ring-2 focus:ring-[#3B49DF]/20 focus:outline-hidden transition-all text-slate-900"
              />
            ))}
          </div>

          {/* Action Buttons */}
          <button
            type="submit"
            id="verify-otp-btn"
            disabled={otpState === "verifying" || otpDigits.join("").length !== 6}
            className="w-full py-3 px-4 bg-[#3B49DF] hover:bg-[#2F27CE] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {otpState === "verifying" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying OTP...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Continue</span>
              </>
            )}
          </button>

          {/* Resend OTP with 45s countdown */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500">Didn&apos;t receive a code?</span>
            <button
              type="button"
              id="resend-otp-btn"
              disabled={countdown > 0 || otpState === "sending"}
              onClick={() => handleSendOtp()}
              className="font-bold text-[#3B49DF] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${otpState === "sending" ? "animate-spin" : ""}`} />
              <span>{countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Desktop QR Modal */}
      <TruecallerQrModal
        isOpen={showDesktopQr}
        onClose={() => setShowDesktopQr(false)}
        requestId={truecallerRequestId}
        deepLink={truecallerDeepLink}
      />
    </div>
  );
}
