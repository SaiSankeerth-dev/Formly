"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FileText,
  Bot,
  User,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { LotusLogo } from "@/components/ui/LotusLogo";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { createClient } from "@/utils/supabase/client";

export default function CitizenLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useSevaSaarthi();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGovAccount, setIsGovAccount] = useState(false);
  const [hasErrorShake, setHasErrorShake] = useState(false);

  // Policy Modal state
  const [activeModal, setActiveModal] = useState<"privacy" | "terms" | "support" | null>(null);

  // Handle URL error query parameters (e.g. from OAuth redirect or session failures)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_failed" || errorParam === "google_not_configured") {
      setErrorMessage("Google sign-in couldn't be completed.");
    } else if (errorParam === "profile_error") {
      setErrorMessage("We couldn't load your profile. Please try again.");
    } else if (errorParam === "disabled") {
      setErrorMessage("Your account is currently unavailable. Please contact support.");
    }
  }, [searchParams]);

  const triggerErrorShake = () => {
    setHasErrorShake(true);
    setTimeout(() => setHasErrorShake(false), 500);
  };

  const validateEmailFormat = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsGovAccount(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Email address is required.");
      triggerErrorShake();
      return;
    }

    if (!validateEmailFormat(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      triggerErrorShake();
      return;
    }

    if (!password) {
      setErrorMessage("Password is required.");
      triggerErrorShake();
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(trimmedEmail, password, rememberMe);
      if (res.success) {
        // Redirection handled by store based on profile status
        return;
      }

      if (res.isGovernment) {
        setErrorMessage(res.error || "This account belongs to the government portal.");
        setIsGovAccount(true);
      } else {
        setErrorMessage(res.error || "Email or password is incorrect.");
      }
      triggerErrorShake();
    } catch {
      setErrorMessage("We couldn't sign you in right now. Please try again.");
      triggerErrorShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading || isGoogleLoading) return;
    setIsGoogleLoading(true);
    setErrorMessage("");

    try {
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("[Google OAuth] Supabase signInWithOAuth error:", error.message);
        setErrorMessage("Google sign-in couldn't be completed.");
        setIsGoogleLoading(false);
        triggerErrorShake();
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      console.error("[Google OAuth] Failed to initiate Google sign-in:", err?.message || err);
      setErrorMessage("Google sign-in couldn't be completed.");
      setIsGoogleLoading(false);
      triggerErrorShake();
    }
  };

  return (
    <main className="min-h-screen bg-[#FBFBFE] flex flex-col justify-between relative overflow-hidden font-sans select-none selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background Subtle Gradient & Glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(67,59,255,0.06),rgba(251,251,254,0))]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-100/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-100/30 blur-3xl"
        aria-hidden="true"
      />

      {/* Sweeping Tricolor Arch Ribbon (Left to Center along bottom, matching reference design) */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full max-w-[820px] h-[160px] sm:h-[220px] z-0 overflow-visible opacity-90 hidden sm:block"
        viewBox="0 0 800 220"
        fill="none"
        aria-hidden="true"
      >
        {/* Saffron upper wave */}
        <path
          d="M -30 200 Q 180 70 460 130 T 820 90"
          stroke="#FF9933"
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* White middle wave */}
        <path
          d="M -30 213 Q 180 83 460 143 T 820 103"
          stroke="#FFFFFF"
          strokeWidth="10"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.07))"
        />
        {/* Green lower wave */}
        <path
          d="M -30 226 Q 180 96 460 156 T 820 116"
          stroke="#138808"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </svg>

      {/* Minimal Monument Skyline Silhouette (India Gate, Rashtrapati Bhavan, Trees along bottom horizon) */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full lg:w-[62%] h-20 sm:h-28 z-0 overflow-hidden opacity-30 select-none hidden sm:block"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 800 90"
          className="w-full h-full text-indigo-900 fill-current"
          preserveAspectRatio="none"
        >
          {/* Trees left */}
          <circle cx="20" cy="74" r="14" />
          <circle cx="38" cy="70" r="16" />
          <circle cx="56" cy="75" r="12" />
          <circle cx="76" cy="77" r="9" />

          {/* Left Bhavan Dome */}
          <rect x="95" cy="62" width="46" height="26" rx="2" />
          <path d="M 104 62 C 104 48 132 48 132 62 Z" />
          <line x1="118" y1="48" x2="118" y2="40" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="118" cy="38" r="2.5" />

          {/* Foliage & lamp post */}
          <circle cx="160" cy="73" r="12" />
          <circle cx="178" cy="69" r="15" />
          <line x1="205" y1="56" x2="205" y2="88" stroke="currentColor" strokeWidth="2" />
          <circle cx="205" cy="54" r="3" />
          <circle cx="225" cy="74" r="11" />

          {/* India Gate Silhouette Center */}
          <path d="M 280 88 L 280 44 L 288 42 L 288 34 L 352 34 L 352 42 L 360 44 L 360 88 L 340 88 L 340 64 C 340 52 300 52 300 64 L 300 88 Z" />
          <rect x="292" y="28" width="56" height="6" rx="1.5" />
          <rect x="300" y="22" width="40" height="6" rx="1" />
          <rect x="308" y="18" width="24" height="4" rx="1" />

          {/* Trees right of India Gate */}
          <circle cx="410" cy="70" r="14" />
          <circle cx="430" cy="73" r="11" />
          <line x1="450" y1="56" x2="450" y2="88" stroke="currentColor" strokeWidth="2" />
          <circle cx="450" cy="54" r="3" />

          {/* Right Secretariat Dome */}
          <rect x="480" cy="62" width="46" height="26" rx="2" />
          <path d="M 489 62 C 489 48 517 48 517 62 Z" />
          <line x1="503" y1="48" x2="503" y2="40" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="503" cy="38" r="2.5" />

          {/* Right foliage */}
          <circle cx="550" cy="73" r="13" />
          <circle cx="570" cy="69" r="15" />
          <circle cx="592" cy="75" r="12" />
          <circle cx="615" cy="77" r="9" />
          <circle cx="640" cy="71" r="14" />
          <circle cx="665" cy="75" r="11" />
          <circle cx="690" cy="73" r="13" />
          <circle cx="720" cy="75" r="12" />
          <circle cx="750" cy="72" r="14" />

          {/* Ground base line */}
          <rect x="0" y="87" width="800" height="3" />
        </svg>
      </div>

      {/* Main Two-Column Centered Layout */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: BRANDING, VALUE PROPOSITIONS & INDIA CALLOUT                 */}
          {/* ========================================================================= */}
          <section className="lg:col-span-7 flex flex-col justify-between space-y-7 lg:pr-8">
            
            {/* Top Brand Wordmark (Exact Dashboard Logo) */}
            <div className="flex items-center gap-3.5 group">
              <LotusLogo size={42} className="w-10 h-10 shrink-0 drop-shadow-xs transition-transform duration-200 group-hover:scale-105" />
              <div>
                <div className="text-2xl font-black tracking-tight text-slate-900 leading-tight">
                  Seva Saarthi
                </div>
                <div className="text-xs font-medium text-slate-500 tracking-normal">
                  One Form. A Smarter India.
                </div>
              </div>
            </div>

            {/* Hero Heading & Tagline */}
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] text-[#2F27CE] border border-indigo-100/90 text-xs font-bold shadow-xs">
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Citizen Portal</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-slate-900 leading-[1.12]">
                Your Gateway to{" "}
                <span className="text-[#2F27CE] inline-block">Government Services</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
                Discover services, prepare documents, and complete official applications with intelligent guidance.
              </p>
            </div>

            {/* Compact Benefits & "Towards a Smarter India" Flourish */}
            <div className="hidden lg:flex items-center justify-between gap-6 max-w-xl pt-1">
              {/* Stacked Benefits */}
              <div className="space-y-3 flex-1">
                {/* Benefit 1 */}
                <div className="p-3.5 rounded-2xl bg-white/85 backdrop-blur-xs border border-slate-200/70 shadow-xs flex items-center gap-3.5 transition-all hover:border-indigo-200 hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50/90 text-[#2F27CE] border border-indigo-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">Simple &amp; Secure</div>
                    <div className="text-[11px] text-slate-500 leading-normal mt-0.5">Keep your information protected</div>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="p-3.5 rounded-2xl bg-white/85 backdrop-blur-xs border border-slate-200/70 shadow-xs flex items-center gap-3.5 transition-all hover:border-indigo-200 hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50/90 text-[#2F27CE] border border-indigo-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">Smart Document Help</div>
                    <div className="text-[11px] text-slate-500 leading-normal mt-0.5">Prepare files to portal requirements</div>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="p-3.5 rounded-2xl bg-white/85 backdrop-blur-xs border border-slate-200/70 shadow-xs flex items-center gap-3.5 transition-all hover:border-indigo-200 hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50/90 text-[#2F27CE] border border-indigo-100 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">One Intelligent Assistant</div>
                    <div className="text-[11px] text-slate-500 leading-normal mt-0.5">Get help across supported government services</div>
                  </div>
                </div>
              </div>

              {/* Hand-lettering Aesthetic Callout with Tricolor Underline */}
              <div className="flex flex-col items-center -rotate-6 select-none shrink-0 pl-2 pr-4 self-center" aria-hidden="true">
                <span
                  className="italic text-base xl:text-lg font-semibold text-slate-600 tracking-wide"
                  style={{ fontFamily: "'Caveat', 'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive, sans-serif" }}
                >
                  Towards a Smarter India
                </span>
                <svg className="w-32 h-2.5 mt-0.5" viewBox="0 0 130 10" fill="none">
                  <path d="M 2 5 Q 65 10 128 3" stroke="url(#tricolorGrad)" strokeWidth="2.8" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="tricolorGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF9933" />
                      <stop offset="50%" stopColor="#CBD5E1" />
                      <stop offset="100%" stopColor="#138808" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: LOGIN CARD                                                  */}
          {/* ========================================================================= */}
          <section className="lg:col-span-5 w-full flex justify-center">
            <div
              className={`w-full max-w-[460px] bg-white rounded-[28px] border border-slate-200/80 p-7 sm:p-9 shadow-xl shadow-indigo-100/40 transition-transform duration-200 ${
                hasErrorShake ? "animate-shake" : ""
              }`}
            >
              {/* Card Header */}
              <div className="mb-6 text-center sm:text-left">
                <h2 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Sign in to your Seva Saarthi account
                </p>
              </div>

              {/* Accessible Error Announcement */}
              {errorMessage && (
                <div
                  role="alert"
                  aria-live="polite"
                  className={`mb-5 p-3.5 rounded-2xl flex flex-col gap-2.5 text-xs ${
                    isGovAccount
                      ? "bg-amber-50 border border-amber-200 text-amber-900"
                      : "bg-rose-50 border border-rose-200 text-rose-700 font-medium"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertCircle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isGovAccount ? "text-amber-600" : "text-rose-500"
                        }`}
                        aria-hidden="true"
                      />
                      <span className={isGovAccount ? "font-semibold text-slate-900" : ""}>
                        {errorMessage}
                      </span>
                    </div>
                    {errorMessage.includes("Google sign-in couldn't be completed") && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage("");
                          handleGoogleSignIn();
                        }}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                  {isGovAccount && (
                    <Link
                      href="/gov/login"
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors shadow-xs"
                    >
                      <span>Go to Government Portal</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="citizen-email"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="citizen-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      disabled={isLoading || isGoogleLoading}
                      className="w-full pl-10 pr-3.5 py-3 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#2F27CE] focus:border-transparent transition-all disabled:opacity-50"
                    />
                    <Mail
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="citizen-password"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="citizen-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading || isGoogleLoading}
                      className="w-full pl-10 pr-11 py-3 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#2F27CE] focus:border-transparent transition-all disabled:opacity-50"
                    />
                    <Lock
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading || isGoogleLoading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-[#2F27CE]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox (Real Session Duration Support) */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading || isGoogleLoading}
                      className="w-4 h-4 rounded text-[#2F27CE] focus:ring-[#2F27CE] border-slate-300 transition-colors"
                    />
                    <span className="text-slate-600 font-semibold">Remember me</span>
                  </label>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full h-12 bg-[#2F27CE] hover:bg-[#261FA8] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200/60 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#2F27CE]"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative my-5 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" aria-hidden="true" />
                <span className="bg-white px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase absolute">
                  OR
                </span>
              </div>

              {/* REAL Google Sign-In Option */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
                aria-label="Continue with Google sign-in"
                className="w-full h-[52px] rounded-[14px] bg-white hover:bg-slate-50/90 active:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 font-bold text-xs sm:text-sm transition-all duration-150 shadow-xs hover:shadow-sm flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                {isGoogleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    {/* Official Multi-Color Google G Icon */}
                    <svg
                      className="w-5 h-5 shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Create Account Link */}
              <div className="text-center mt-5 text-xs text-slate-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-bold text-[#2F27CE] hover:underline focus:outline-hidden focus:ring-2 focus:ring-[#2F27CE] rounded-xs"
                >
                  Create an Account
                </Link>
              </div>

              {/* Security Badge Card (No Fake Claims) */}
              <div className="mt-5 p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-[#2F27CE] shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Secure &amp; Private</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    Your Seva Saarthi account and documents are protected.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FOOTER: DIGITAL INDIA INITIATIVE + PRIVACY, TERMS, SUPPORT & VERSION       */}
      {/* ========================================================================= */}
      <footer className="relative z-10 py-5 px-6 border-t border-slate-200/50 bg-white/40 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          {/* Digital India Micro Banner (Matching Reference Design) */}
          <div className="flex items-center gap-2.5">
            <svg
              className="w-6 h-4 rounded-xs shadow-xs border border-slate-200/60 shrink-0"
              viewBox="0 0 24 16"
              aria-hidden="true"
            >
              <rect width="24" height="5.33" fill="#FF9933" />
              <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
              <rect y="10.66" width="24" height="5.33" fill="#138808" />
              <circle cx="12" cy="8" r="2" fill="#000080" />
            </svg>
            <div>
              <div className="text-[11px] font-bold text-slate-800 leading-tight">Digital India Initiative</div>
              <div className="text-[10px] font-medium text-slate-400 leading-tight">Empowering a Digital Tomorrow</div>
            </div>
          </div>

          {/* Policy & Support Links */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <button
              onClick={() => setActiveModal("privacy")}
              className="hover:text-[#2F27CE] font-medium transition-colors focus:outline-hidden focus:underline cursor-pointer"
            >
              Privacy
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setActiveModal("terms")}
              className="hover:text-[#2F27CE] font-medium transition-colors focus:outline-hidden focus:underline cursor-pointer"
            >
              Terms
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setActiveModal("support")}
              className="hover:text-[#2F27CE] font-medium transition-colors focus:outline-hidden focus:underline cursor-pointer"
            >
              Help &amp; Support
            </button>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[11px] text-slate-400">v2.0.0</span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* ACCESSIBLE MODALS FOR POLICY & SUPPORT (No Dead Links)                     */}
      {/* ========================================================================= */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <LotusLogo size={28} className="w-7 h-7" />
                <span className="font-bold text-slate-900">
                  {activeModal === "privacy" && "Privacy Policy"}
                  {activeModal === "terms" && "Terms of Service"}
                  {activeModal === "support" && "Help & Support"}
                </span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              {activeModal === "privacy" && (
                <>
                  <p>
                    Seva Saarthi protects your personal documents and details using strict citizen-side isolation. We do not sell or monetize personal identification data.
                  </p>
                  <p>
                    Uploaded documents are stored in private storage vaults accessible only through verified session credentials. You retain complete control over confirmed application data.
                  </p>
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-[#2F27CE] font-bold hover:underline pt-2"
                  >
                    <span>Read full legal privacy document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}

              {activeModal === "terms" && (
                <>
                  <p>
                    Seva Saarthi is an intelligent guidance assistant for government service applications. It helps prepare, check, and autofill required fields.
                  </p>
                  <p>
                    Seva Saarthi is not itself a statutory authority. Official approvals, verifications, and issuances are administered exclusively by designated government departments.
                  </p>
                  <Link
                    href="/terms"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-[#2F27CE] font-bold hover:underline pt-2"
                  >
                    <span>Read complete terms of service</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}

              {activeModal === "support" && (
                <>
                  <p>
                    For citizen support regarding service checklists, document formatting, or login issues:
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-900">Email Citizen Desk</div>
                    <div className="text-[#2F27CE] font-medium">support@sevasaarthi.gov.in</div>
                  </div>
                  <Link
                    href="/support"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-[#2F27CE] font-bold hover:underline pt-2"
                  >
                    <span>Open full support center</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-shake {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
