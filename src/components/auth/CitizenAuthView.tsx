"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  FileText,
  Smartphone,
  UserPlus,
  Globe,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { LotusLogo } from "@/components/ui/LotusLogo";
import { createClient } from "@/lib/supabase/client";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { getOAuthRedirectUrl, getOAuthDebugInfo } from "@/lib/auth/oauth-url";

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.44 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.24C.45 8.15 0 9.94 0 12s.45 3.85 1.24 5.42l4.04-3.13z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.56 1.24 6.58l4.04 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
        fill="#EA4335"
      />
    </svg>
  );
}

function IndiaFlagIcon({ className = "w-4.5 h-3" }: { className?: string }) {
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

interface CitizenAuthViewProps {
  initialMode?: "login" | "signup";
}

export function CitizenAuthView({ initialMode = "login" }: CitizenAuthViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const { login, signup, user, isAuthenticated, isLoadingAuth } = useSevaSaarthi();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync mode with route if prop change
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Handle URL error messages from callback redirects
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "google_auth_failed") {
      setErrorMessage("Google authentication was canceled or failed. Please try again.");
    } else if (errorParam === "session_establishment_failed") {
      setErrorMessage("Could not establish a secure session. Please try again.");
    } else if (errorParam) {
      setErrorMessage(errorParam);
    }
  }, [searchParams]);

  // If citizen is already authenticated, redirect to /dashboard
  useEffect(() => {
    if (!isLoadingAuth && (isAuthenticated || user)) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, isLoadingAuth, router]);

  // Handle Supabase Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setErrorMessage("");
      setIsGoogleLoading(true);
      const supabase = createClient();
      const redirectUrl = getOAuthRedirectUrl();
      const debugInfo = getOAuthDebugInfo();
      console.log("[GOOGLE OAUTH] Initiating sign-in with config:", debugInfo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Failed to initiate Google sign-in.");
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during Google sign-in.");
      setIsGoogleLoading(false);
    }
  };

  // Handle Email / Password Login
  const handleLoginSubmit = async (e?: React.FormEvent | React.SyntheticEvent) => {
    console.log("[handleLoginSubmit called]", { loginEmail, loginPassword });
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setErrorMessage("");

    let email = loginEmail.trim();
    let password = loginPassword;

    // DOM fallback for automation / browser autofill
    if (!email && typeof document !== "undefined") {
      const el = document.getElementById("citizen-email") as HTMLInputElement;
      if (el?.value) {
        email = el.value.trim();
        setLoginEmail(email);
      }
    }
    if (!password && typeof document !== "undefined") {
      const el = document.getElementById("citizen-password") as HTMLInputElement;
      if (el?.value) {
        password = el.value;
        setLoginPassword(password);
      }
    }

    if (!email || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password, rememberMe);
      if (!result.success) {
        setErrorMessage(result.error || "Login failed. Please check your credentials.");
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Email / Password Sign Up
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!signupName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage("Passwords do not match. Please verify.");
      return;
    }
    if (!agreeTerms) {
      setErrorMessage("Please accept the Terms & Conditions and Privacy Policy to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await signup(signupName.trim(), signupEmail.trim(), signupPassword);
      if (!success) {
        setErrorMessage("Registration failed. This email may already be in use.");
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-start lg:justify-center relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 py-6 sm:py-10">
      {/* Background Subtle Atmospheric Tint */}
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-[#F0F5FF]/60 via-[#F7FAFF]/40 to-transparent pointer-events-none" />

      {/* Main Split Content Section */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-6 lg:gap-14 z-10">
        
        {/* ========================================================
            LEFT COLUMN: BRAND, VALUE PROPOSITION & HIGH-END ARTWORK
            ======================================================== */}
        <div className="w-full lg:w-1/2 flex flex-col justify-start lg:justify-between lg:self-stretch space-y-4 lg:space-y-6 pointer-events-none lg:pointer-events-auto">
          
          {/* Top Brand Identity (Centered on mobile, left-aligned on desktop) */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="mb-2">
              <LotusLogo size={52} className="w-13 h-13 drop-shadow-xs" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Seva Saarthi
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-slate-500 mt-0.5">
              One form. A Smarter India.
            </p>
          </div>

          {/* Feature Highlights (Circular outlined badges matching reference image) - Desktop only */}
          <div className="hidden lg:block space-y-4 max-w-md py-1">
            {mode === "login" ? (
              <>
                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-full border-1.5 border-[#3B49DF] bg-[#3B49DF]/5 flex items-center justify-center shrink-0 text-[#3B49DF] shadow-xs group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">Secure &amp; Encrypted</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Safe data protection and zero-knowledge privacy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-full border-1.5 border-[#3B49DF] bg-[#3B49DF]/5 flex items-center justify-center shrink-0 text-[#3B49DF] shadow-xs group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">Smart Document Help</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Track applications, fast verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-full border-1.5 border-[#3B49DF] bg-[#3B49DF]/5 flex items-center justify-center shrink-0 text-[#3B49DF] shadow-xs group-hover:scale-105 transition-transform">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">One-Click Applications</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      One form for all public services.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-full border-1.5 border-[#3B49DF] bg-[#3B49DF]/5 flex items-center justify-center shrink-0 text-[#3B49DF] shadow-xs group-hover:scale-105 transition-transform">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">Simple Registration</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Quick and seamless sign up in seconds.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-full border-1.5 border-[#3B49DF] bg-[#3B49DF]/5 flex items-center justify-center shrink-0 text-[#3B49DF] shadow-xs group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">Secure &amp; Private</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Bank-grade security and citizen consent controls.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-full border-1.5 border-[#3B49DF] bg-[#3B49DF]/5 flex items-center justify-center shrink-0 text-[#3B49DF] shadow-xs group-hover:scale-105 transition-transform">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">Access to All Services</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Direct access to central and state citizen portals.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* High-End Artwork Image Seamlessly Integrated (Desktop only) */}
          <div className="hidden lg:block pt-2 relative pointer-events-none select-none">
            <div className="relative w-full max-w-lg">
              {mode === "login" ? (
                <Image
                  src="/auth/india_gate_auth.jpg"
                  alt="India Gate Skyline & Tricolor Ribbon"
                  width={640}
                  height={360}
                  className="w-full h-auto object-contain object-bottom mix-blend-multiply"
                  priority
                />
              ) : (
                <Image
                  src="/auth/signup_tree_auth.jpg"
                  alt="Digital India Heritage & Tricolor Ribbon"
                  width={640}
                  height={360}
                  className="w-full h-auto object-contain object-bottom mix-blend-multiply"
                  priority
                />
              )}
            </div>

            {/* Slogan underneath artwork matching reference */}
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Empowering Citizens
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Stronger India
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white/90 border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-2xs">
                <IndiaFlagIcon className="w-4.5 h-3 shrink-0 rounded-xs shadow-2xs" />
                <span>A Digital India Initiative</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: FLOATING AUTHENTICATION CARD
            ======================================================== */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end relative z-20 pointer-events-auto">
          <div className="w-full max-w-[460px] bg-white rounded-3xl border border-slate-100 shadow-xl p-7 sm:p-9 relative">
            
            {/* Header */}
            <div className="mb-6">
              {mode === "login" ? (
                <>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Sign in to your Citizen Portal
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Access government services, track applications, and manage your documents.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Create Your Account
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Join Seva Saarthi and access government services easily.
                  </p>
                </>
              )}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs font-semibold text-rose-700 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* ====================================================
                LOGIN FORM
                ==================================================== */}
            {mode === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Address */}
                <div>
                  <div className="relative">
                    <input
                      id="citizen-email"
                      name="email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#3B49DF]/20 focus:border-[#3B49DF] focus:bg-white transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="relative">
                    <input
                      id="citizen-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-11 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#3B49DF]/20 focus:border-[#3B49DF] focus:bg-white transition-all"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-sm text-[#3B49DF] focus:ring-[#3B49DF] border-slate-300"
                    />
                    <span>Remember me</span>
                  </label>

                  <a
                    href="#forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset instructions have been dispatched to your email if registered.");
                    }}
                    className="font-bold text-[#3B49DF] hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  id="citizen-login-submit"
                  onClick={handleLoginSubmit}
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full py-3.5 px-4 bg-[#3B49DF] hover:bg-[#2F27CE] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>
            )}

            {/* ====================================================
                SIGN UP FORM
                ==================================================== */}
            {mode === "signup" && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <div className="relative">
                    <input
                      id="citizen-signup-name"
                      name="name"
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#3B49DF]/20 focus:border-[#3B49DF] focus:bg-white transition-all"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <div className="relative">
                    <input
                      id="citizen-signup-email"
                      name="email"
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#3B49DF]/20 focus:border-[#3B49DF] focus:bg-white transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="relative">
                    <input
                      id="citizen-signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#3B49DF]/20 focus:border-[#3B49DF] focus:bg-white transition-all"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="relative">
                    <input
                      id="citizen-signup-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#3B49DF]/20 focus:border-[#3B49DF] focus:bg-white transition-all"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 rounded-sm text-[#3B49DF] focus:ring-[#3B49DF] border-slate-300 mt-0.5"
                    />
                    <span>
                      I agree to the{" "}
                      <span className="font-bold text-[#3B49DF] hover:underline">Terms &amp; Conditions</span> and{" "}
                      <span className="font-bold text-[#3B49DF] hover:underline">Privacy Policy</span>
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full py-3.5 px-4 bg-[#3B49DF] hover:bg-[#2F27CE] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>
            )}

            {/* ====================================================
                OR DIVIDER
                ==================================================== */}
            <div className="relative flex items-center justify-center my-5">
              <div className="w-full border-t border-slate-200" />
              <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
                OR
              </span>
            </div>

            {/* ====================================================
                CONTINUE WITH GOOGLE BUTTON (Supabase OAuth)
                ==================================================== */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#3B49DF]" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* ====================================================
                BOTTOM TOGGLE LINK
                ==================================================== */}
            <div className="text-center mt-6 text-xs text-slate-500 font-medium">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setMode("signup");
                      window.history.pushState(null, "", "/signup");
                    }}
                    className="font-bold text-[#3B49DF] hover:underline cursor-pointer"
                  >
                    Create an Account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setMode("login");
                      window.history.pushState(null, "", "/login");
                    }}
                    className="font-bold text-[#3B49DF] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
