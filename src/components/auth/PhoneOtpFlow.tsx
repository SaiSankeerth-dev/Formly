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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeIndianPhoneNumber,
  mapOtpErrorToUserMessage,
  OtpState,
  RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
} from "@/lib/auth/phone-auth";

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
  mode?: "login" | "onboarding" | "profile";
  initialPhone?: string;
  onSuccess?: (phone: string, session?: any) => void;
  onCancel?: () => void;
  isAlreadyVerified?: boolean;
}

export function PhoneOtpFlow({
  mode = "onboarding",
  initialPhone = "",
  onSuccess,
  onCancel,
  isAlreadyVerified = false,
}: PhoneOtpFlowProps) {
  // Step 1: Phone input; Step 2: 6-digit OTP entry
  const [step, setStep] = useState<1 | 2>(1);
  const [rawPhone, setRawPhone] = useState(initialPhone);
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");

  // 6 discrete OTP boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // State machine
  const [otpState, setOtpState] = useState<OtpState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBlockedProvider, setIsBlockedProvider] = useState(false);

  // Rate limiting & cooldown
  const [countdown, setCountdown] = useState<number>(0);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // Mobile environment detection for optional Truecaller
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const isTruecallerConfigured = Boolean(process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY);

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

  // Sync initial phone
  useEffect(() => {
    if (initialPhone && !rawPhone) {
      setRawPhone(initialPhone);
    }
  }, [initialPhone, rawPhone]);

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

      // For logged-in citizens in onboarding or profile: updateUser links the phone to current user
      let res: any;
      if (mode === "onboarding" || mode === "profile") {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          res = await supabase.auth.updateUser({ phone: validation.e164 });
        } else {
          res = await supabase.auth.signInWithOtp({ phone: validation.e164 });
        }
      } else {
        // Direct Phone Login (Option A)
        res = await supabase.auth.signInWithOtp({ phone: validation.e164 });
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
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const token = otpDigits.join("").trim();
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

      if (mode === "onboarding" || mode === "profile") {
        // Try phone_change verification first for logged-in user
        res = await supabase.auth.verifyOtp({
          phone: normalizedPhone,
          token,
          type: "phone_change",
        });

        // Fallback to type: sms if phone_change was not the registered flow
        if (res.error && (res.error.message?.includes("type") || res.error.message?.includes("token"))) {
          res = await supabase.auth.verifyOtp({
            phone: normalizedPhone,
            token,
            type: "sms",
          });
        }
      } else {
        // Standard SMS OTP login
        res = await supabase.auth.verifyOtp({
          phone: normalizedPhone,
          token,
          type: "sms",
        });
      }

      if (res.error) {
        const mapped = mapOtpErrorToUserMessage(res.error, "verify");
        setOtpState(mapped.state);
        setStatusMessage(mapped.message);
        return;
      }

      // Supabase verification succeeded!
      setOtpState("verified");
      setStatusMessage("Phone number verified successfully!");

      // Update backend database profile using auth.uid() server session
      try {
        await fetch("/api/citizen/phone-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone }),
        });
      } catch (syncErr) {
        console.warn("[PHONE_AUTH] Backend profile sync note:", syncErr);
      }

      if (onSuccess) {
        onSuccess(normalizedPhone, res.data?.session || res.data?.user);
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
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are entered
    if (char && index === 5 && newDigits.every((d) => d.length === 1)) {
      setTimeout(() => {
        handleVerifyOtp();
      }, 50);
    }
  };

  // Handle backspace and navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = "";
        setOtpDigits(newDigits);
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

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = paste[i] || "";
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(paste.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (paste.length === 6) {
      setTimeout(() => {
        handleVerifyOtp();
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                required
                value={rawPhone.replace(/\D/g, "").slice(-10)}
                onChange={(e) => {
                  setRawPhone(e.target.value);
                  if (statusMessage) setStatusMessage("");
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

          {/* Optional Mobile-First Truecaller (Only on mobile device if configured) */}
          {isMobileDevice && isTruecallerConfigured && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusMessage("Connecting to Truecaller verified profile...");
                }}
                className="w-full py-2.5 px-4 bg-[#0087FF] hover:bg-[#0070D4] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue with Truecaller</span>
              </button>
            </div>
          )}

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
          STEP 2: 6-DIGIT OTP VERIFICATION
          ======================================================== */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-800">
                Enter verification code
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sent to <span className="font-bold text-slate-700">{displayPhone || normalizedPhone}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtpDigits(["", "", "", "", "", ""]);
                setStatusMessage("");
              }}
              className="text-xs font-bold text-[#3B49DF] hover:underline cursor-pointer"
            >
              Change Number
            </button>
          </div>

          {/* 6 Discrete Digit Boxes */}
          <div className="flex items-center justify-between gap-2 sm:gap-2.5 on-otp-grid">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
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
                <span>Verify OTP</span>
              </>
            )}
          </button>

          {/* Resend OTP with 60s cooldown */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500">Didn&apos;t receive the code?</span>
            <button
              type="button"
              disabled={countdown > 0 || otpState === "sending"}
              onClick={() => handleSendOtp()}
              className="font-bold text-[#3B49DF] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${otpState === "sending" ? "animate-spin" : ""}`} />
              <span>{countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
