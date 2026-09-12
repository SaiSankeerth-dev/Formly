"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Users,
  FileText,
  Settings,
  ArrowRight,
  Check,
  Headphones,
  AlertCircle,
  Loader2,
  X,
  Building2,
  HelpCircle,
} from "lucide-react";
import { LotusLogo } from "@/components/ui/LotusLogo";
import { StateEmblem } from "@/components/ui/StateEmblem";
import { toast } from "sonner";

export function GovernmentLoginView() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Close help modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowHelpModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !password.trim()) {
      setErrorMessage("Please enter both your Employee ID and password.");
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/gov/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeId.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          document.cookie = `FORMLY_GOV_SESSION=${data.token}; path=/; max-age=28800; SameSite=Lax`;
          document.cookie = `formly_gov_session=${data.token}; path=/; max-age=28800; SameSite=Lax`;
        }
        toast.success(`Welcome back, ${data.user?.name || "Officer"}!`);
        window.location.href = "/gov/dashboard";
      } else {
        if (res.status === 403) {
          setErrorMessage(data.error || "You are not authorized to access Sarkaar Seva.");
        } else if (res.status === 401) {
          setErrorMessage("Employee ID or password is incorrect.");
        } else {
          setErrorMessage(data.error || "We couldn't sign you in right now. Please try again.");
        }
        toast.error(data.error || "Authentication failed");
      }
    } catch {
      setErrorMessage("We couldn't sign you in right now. Please try again.");
      toast.error("Network error during authentication");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-slate-900 flex flex-col justify-between items-center py-6 px-4 sm:px-8 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Flowing Tricolor Ribbons */}
      <div className="absolute -top-24 -right-24 w-96 h-96 pointer-events-none opacity-40 z-0">
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M50 0 C150 120 280 200 400 240" stroke="#FF9933" strokeWidth="24" strokeLinecap="round" opacity="0.6" />
          <path d="M100 0 C190 140 310 230 400 280" stroke="#CBD5E1" strokeWidth="20" strokeLinecap="round" opacity="0.4" />
          <path d="M150 0 C230 160 340 260 400 320" stroke="#138808" strokeWidth="24" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>

      <div className="absolute -bottom-24 -left-24 w-96 h-96 pointer-events-none opacity-40 z-0">
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M0 160 C120 200 250 280 350 400" stroke="#FF9933" strokeWidth="24" strokeLinecap="round" opacity="0.5" />
          <path d="M0 210 C100 250 220 320 300 400" stroke="#CBD5E1" strokeWidth="20" strokeLinecap="round" opacity="0.4" />
          <path d="M0 260 C80 290 190 350 250 400" stroke="#138808" strokeWidth="24" strokeLinecap="round" opacity="0.6" />
        </svg>
      </div>

      {/* 1. TOP HEADER BAR */}
      <header className="w-full max-w-6xl flex items-center justify-between py-2 px-2 sm:px-4 mb-4 z-10">
        {/* Top-Left: Seva Saarthi Citizen Brand Context */}
        <div className="flex items-center gap-3">
          <LotusLogo size={36} className="shrink-0 drop-shadow-xs" />
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
              Seva Saarthi
            </div>
            <div className="text-[11px] font-semibold text-slate-500 leading-tight">
              One Form. A Smarter India.
            </div>
          </div>
        </div>

        {/* Top-Right: Government Access Indicator */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white/90 border border-slate-200/90 rounded-full shadow-2xs backdrop-blur-xs">
          <div className="w-7 h-7 rounded-full bg-blue-50 text-[#2F27CE] flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-[11px] font-bold text-slate-900 leading-tight">
              Government Access
            </div>
            <div className="text-[10px] font-semibold text-slate-500 leading-tight">
              Authorized Personnel Only
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN TWO-COLUMN CARD CONTAINER */}
      <main className="w-full max-w-6xl bg-white border border-slate-200/80 rounded-[32px] shadow-2xl shadow-slate-200/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10">
        {/* LEFT COLUMN: BRAND & TRUST SHOWCASE */}
        <div className="lg:col-span-6 relative flex flex-col justify-between p-8 sm:p-10 bg-gradient-to-br from-[#EBF3FC] via-[#F3F7FD] to-white border-b lg:border-b-0 lg:border-r border-slate-100 overflow-hidden">
          {/* Header Typography */}
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] text-[#1E3A8A] uppercase mb-2">
              GOVERNMENT OPERATIONS PLATFORM
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-[#0A1128]">
              Sarkaar <span className="text-[#2F27CE]">Seva</span>
            </h1>
            <div className="text-sm font-bold text-slate-700 mt-1">
              Government Operations Platform
            </div>
            <p className="text-xs font-medium text-slate-500 mt-2">
              Enable Officers. Streamline Services. Empower Citizens.
            </p>

            {/* 4 Value Statements / Feature Rows */}
            <div className="space-y-3 mt-6">
              {/* Feature 1 */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#2F27CE] flex items-center justify-center shrink-0 shadow-2xs">
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Secure Access</div>
                  <div className="text-[11px] text-slate-500 font-medium">Protected and role-based access</div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#2F27CE] flex items-center justify-center shrink-0 shadow-2xs">
                  <Users className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Efficient Operations</div>
                  <div className="text-[11px] text-slate-500 font-medium">Tools for faster service delivery</div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#2F27CE] flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Audited Actions</div>
                  <div className="text-[11px] text-slate-500 font-medium">Transparent and accountable workflows</div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#2F27CE] flex items-center justify-center shrink-0 shadow-2xs">
                  <Settings className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Better Governance</div>
                  <div className="text-[11px] text-slate-500 font-medium">Technology for a stronger India</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Visual: Civic Building Illustration with Tricolor Flag & Motto Bar */}
          <div className="mt-8 pt-4 relative">
            {/* Cursive Tagline with Flowing Tricolor stroke */}
            <div className="flex flex-col items-end pr-3 mb-1">
              <span className="font-serif italic text-xs sm:text-sm font-semibold text-slate-600 tracking-wide">
                Seva for a Stronger India
              </span>
              <div className="h-0.5 w-24 mt-0.5 flex rounded-full overflow-hidden">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white border-y border-slate-200" />
                <div className="flex-1 bg-[#138808]" />
              </div>
            </div>

            {/* Architectural Vector Facade Illustration */}
            <div className="w-full h-44 sm:h-48 relative rounded-2xl overflow-hidden border border-slate-200/70 bg-gradient-to-b from-sky-100/80 via-blue-50/50 to-amber-50/30 shadow-inner">
              <svg viewBox="0 0 540 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
                <defs>
                  <linearGradient id="skyWash" x1="270" y1="0" x2="270" y2="220" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#DBEAFE" stopOpacity="0.8" />
                    <stop offset="0.6" stopColor="#EFF6FF" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#FEF3C7" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="domeSandstone" x1="270" y1="20" x2="270" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#D97706" />
                    <stop offset="0.5" stopColor="#F59E0B" />
                    <stop offset="1" stopColor="#B45309" />
                  </linearGradient>
                  <linearGradient id="buildingStone" x1="270" y1="80" x2="270" y2="190" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDE68A" />
                    <stop offset="0.7" stopColor="#F59E0B" stopOpacity="0.8" />
                    <stop offset="1" stopColor="#D97706" />
                  </linearGradient>
                  <linearGradient id="treeGreen1" x1="60" y1="90" x2="60" y2="190" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#15803D" />
                    <stop offset="1" stopColor="#166534" />
                  </linearGradient>
                  <linearGradient id="treeGreen2" x1="480" y1="90" x2="480" y2="190" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#15803D" />
                    <stop offset="1" stopColor="#166534" />
                  </linearGradient>
                </defs>

                {/* Sky */}
                <rect width="540" height="220" fill="url(#skyWash)" />

                {/* Left Lush Trees */}
                <ellipse cx="40" cy="140" rx="35" ry="45" fill="url(#treeGreen1)" opacity="0.9" />
                <ellipse cx="70" cy="130" rx="40" ry="50" fill="url(#treeGreen1)" opacity="0.95" />
                <ellipse cx="100" cy="145" rx="30" ry="40" fill="url(#treeGreen1)" opacity="0.85" />

                {/* Right Lush Trees */}
                <ellipse cx="440" cy="145" rx="30" ry="40" fill="url(#treeGreen2)" opacity="0.85" />
                <ellipse cx="470" cy="130" rx="40" ry="50" fill="url(#treeGreen2)" opacity="0.95" />
                <ellipse cx="500" cy="140" rx="35" ry="45" fill="url(#treeGreen2)" opacity="0.9" />

                {/* Ground / Road Forecourt */}
                <rect x="0" y="180" width="540" height="40" fill="#CBD5E1" opacity="0.8" />
                <line x1="0" y1="180" x2="540" y2="180" stroke="#94A3B8" strokeWidth="2" />

                {/* Central Secretariat Wings */}
                <rect x="90" y="125" width="360" height="55" rx="2" fill="url(#buildingStone)" stroke="#B45309" strokeWidth="1" />
                {/* Wing Windows / Colonnade Rows */}
                {[105, 120, 135, 150, 165, 180, 195, 210, 330, 345, 360, 375, 390, 405, 420, 435].map((x, i) => (
                  <rect key={i} x={x} y="138" width="8" height="24" rx="2" fill="#78350F" opacity="0.75" />
                ))}

                {/* Central Palace Portico / Colonnade */}
                <rect x="215" y="110" width="110" height="70" fill="#FCD34D" stroke="#B45309" strokeWidth="1.5" />
                {/* Portico Columns */}
                {[225, 240, 255, 270, 285, 300, 315].map((cx, i) => (
                  <rect key={i} x={cx - 3} y="122" width="6" height="58" rx="1" fill="#FEF08A" stroke="#B45309" strokeWidth="0.8" />
                ))}

                {/* Central Classical Pediment Triangle */}
                <polygon points="210,110 330,110 270,85" fill="#F59E0B" stroke="#92400E" strokeWidth="1.5" />

                {/* Central Dome Drum & Arch Windows */}
                <rect x="235" y="65" width="70" height="22" rx="2" fill="#D97706" stroke="#78350F" strokeWidth="1" />
                {[242, 252, 262, 272, 282, 292].map((wx, i) => (
                  <rect key={i} x={wx} y="70" width="6" height="12" rx="1.5" fill="#451A03" />
                ))}

                {/* Main Dome Arch */}
                <path d="M235 65 C235 30, 305 30, 305 65 Z" fill="url(#domeSandstone)" stroke="#78350F" strokeWidth="1.5" />

                {/* Cupola Finial & Spike */}
                <rect x="266" y="24" width="8" height="8" rx="1" fill="#FDE68A" stroke="#78350F" strokeWidth="1" />
                <line x1="270" y1="24" x2="270" y2="4" stroke="#475569" strokeWidth="2" />

                {/* Indian National Flag Waving On Top */}
                <g transform="translate(270, 4)">
                  {/* Saffron Stripe */}
                  <path d="M0 0 C8 -2, 16 2, 26 0 L26 6 C16 8, 8 4, 0 6 Z" fill="#FF9933" />
                  {/* White Stripe */}
                  <path d="M0 6 C8 4, 16 8, 26 6 L26 12 C16 14, 8 10, 0 12 Z" fill="#FFFFFF" />
                  {/* Ashoka Chakra */}
                  <circle cx="13" cy="9" r="2.2" fill="none" stroke="#000080" strokeWidth="0.6" />
                  <circle cx="13" cy="9" r="0.6" fill="#000080" />
                  {/* Green Stripe */}
                  <path d="M0 12 C8 10, 16 14, 26 12 L26 18 C16 20, 8 16, 0 18 Z" fill="#138808" />
                </g>

                {/* Subtle Ashoka Chakra watermark in the sky */}
                <circle cx="270" cy="50" r="14" stroke="#FDE68A" strokeWidth="0.8" strokeDasharray="2 2" fill="none" opacity="0.4" />
              </svg>
            </div>

            {/* Bottom Dark Blue Motto Bar */}
            <div className="w-full bg-[#1E3A8A] text-white rounded-xl py-2.5 px-4 flex items-center justify-between text-[10px] sm:text-[11px] font-semibold mt-3 shadow-md">
              <div className="flex items-center gap-2">
                <StateEmblem size={18} className="text-amber-400 shrink-0" />
                <span className="tracking-wide">Digital Governance &nbsp;•&nbsp; Efficient Services &nbsp;•&nbsp; Empowered Citizens</span>
              </div>
              <span className="hidden sm:inline text-amber-300/90 text-[10px] uppercase tracking-wider font-mono">CBDT RPC</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL SAKRAAR SEVA LOGIN FORM */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Top Blue Brand Accent Pill */}
            <div className="w-8 h-1 bg-[#2F27CE] rounded-full mb-6" />

            {/* Title & Subheading */}
            <h2 className="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight leading-tight">
              Sarkaar Seva
            </h2>
            <div className="text-base font-bold text-slate-600 mt-0.5">
              Government Portal
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Sign in to your authorized workspace.
            </p>

            {/* Sanitized Error Banner */}
            {errorMessage && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 font-medium animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Field 1: Employee / Officer ID */}
              <div>
                <label
                  htmlFor="employeeId"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Employee / Officer ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="employeeId"
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Enter your employee ID"
                    disabled={isLoggingIn}
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#2F27CE] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isLoggingIn}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#2F27CE] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden p-1 rounded-md"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Right-Aligned Link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs font-semibold text-[#2F27CE] hover:text-[#251FB5] transition-colors focus:outline-hidden"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn || !employeeId.trim() || !password.trim()}
                className="w-full py-3.5 bg-[#2F27CE] hover:bg-[#251FB5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Security Notice Card */}
            <div className="mt-5 p-3.5 bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Secure authorized access
                </div>
                <div className="text-[11px] text-slate-500">
                  Your session is protected.
                </div>
              </div>
            </div>

            {/* Support Help Section */}
            <div className="mt-5 flex items-center gap-2.5 pt-2 text-xs">
              <Headphones className="w-4 h-4 text-slate-800 shrink-0" />
              <div>
                <span className="font-bold text-slate-800">Need access help? </span>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-[#2F27CE] hover:underline font-semibold focus:outline-hidden"
                >
                  Contact your administrator
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel Footer */}
          <footer className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span>© 2026 Seva Saarthi</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => toast.info("Sarkaar Seva enforces zero-trust data protection policies.")}
                className="hover:text-slate-600 transition-colors"
              >
                Privacy
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => toast.info("Authorized government personnel operational terms apply.")}
                className="hover:text-slate-600 transition-colors"
              >
                Terms
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => toast.info("Encrypted with SHA-512 and HMAC session security.")}
                className="hover:text-slate-600 transition-colors"
              >
                Security
              </button>
            </div>
            <span className="font-mono">v2.0.0</span>
          </footer>
        </div>
      </main>

      {/* Accessible Administrator Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2F27CE] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-xl"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Departmental Credential & Access Support
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                In accordance with government operations security standards, password resets and account provisioning are managed centrally by your departmental System Administrator.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5">
              <div className="font-bold text-slate-800">Regional Processing Cell (RPC) Helpdesk:</div>
              <div className="text-slate-600">
                Desk Intercom: <span className="font-mono font-semibold text-blue-700">Ext. 4091 / 4092</span>
              </div>
              <div className="text-slate-600">
                Official Email: <span className="font-mono font-semibold text-blue-700">admin-rpc@incometax.gov.in</span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                Operating hours: 09:00 AM – 06:00 PM IST (Mon–Sat)
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
