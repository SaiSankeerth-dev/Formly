"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between items-center py-6 px-4 sm:px-8 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Flowing Tricolor Ribbons */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] pointer-events-none z-0 overflow-hidden">
        <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-65">
          <path d="M180 -40 C260 120 380 220 540 280" stroke="#FF9933" strokeWidth="44" strokeLinecap="round" opacity="0.8" />
          <path d="M220 -40 C300 130 410 240 540 320" stroke="#FFFFFF" strokeWidth="38" strokeLinecap="round" opacity="0.9" />
          <path d="M260 -40 C340 140 440 260 540 360" stroke="#138808" strokeWidth="44" strokeLinecap="round" opacity="0.75" />
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 w-[550px] h-[550px] pointer-events-none z-0 overflow-hidden">
        <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-65">
          <path d="M-40 260 C80 300 180 370 240 540" stroke="#FF9933" strokeWidth="44" strokeLinecap="round" opacity="0.75" />
          <path d="M-40 300 C90 330 190 410 280 540" stroke="#FFFFFF" strokeWidth="38" strokeLinecap="round" opacity="0.9" />
          <path d="M-40 340 C100 360 200 450 320 540" stroke="#138808" strokeWidth="44" strokeLinecap="round" opacity="0.8" />
        </svg>
      </div>

      {/* 1. TOP HEADER BAR */}
      <header className="w-full max-w-6xl flex items-center justify-between py-2 px-2 sm:px-4 mb-4 z-10">
        {/* Top-Left: Dedicated Sarkaar Seva Government Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1E3A8A] shadow-xs">
            <StateEmblem size={24} className="text-[#1E3A8A]" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
              Sarkaar <span className="text-[#2F27CE]">Seva</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 leading-tight">
              Government Operations Platform
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
        <div className="lg:col-span-6 relative flex flex-col justify-between bg-gradient-to-br from-[#EBF3FC] via-[#F3F7FD] to-white border-b lg:border-b-0 lg:border-r border-slate-100 overflow-hidden">
          {/* Header Typography & Features */}
          <div className="p-8 sm:p-10 pb-4">
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

            {/* 4 Value Statements & Floating Script */}
            <div className="relative mt-6">
              <div className="space-y-3.5 max-w-[280px] sm:max-w-[310px]">
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

              {/* Floating Seva for a Stronger India Handwritten Script with Tricolor Strokes */}
              <div className="absolute right-0 bottom-2 pointer-events-none select-none">
                <img
                  src="/gov/seva-script-transparent.png"
                  alt="Seva for a Stronger India"
                  className="w-28 sm:w-32 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Bottom Visual: Rashtrapati Bhavan Photographic Illustration with Motto Bar */}
          <div className="mt-4 w-full">
            <div className="w-full overflow-hidden">
              <img
                src="/gov/gov-palace-exact.png"
                alt="Rashtrapati Bhavan - Government of India"
                className="w-full h-auto object-cover object-top block"
              />
            </div>

            {/* Bottom Royal Blue Motto Bar */}
            <div className="w-full bg-[#1E58B8] text-white py-3 px-5 sm:px-6 flex items-center gap-3 text-[11px] sm:text-xs font-semibold shadow-inner">
              <StateEmblem size={20} className="text-white shrink-0" />
              <span className="tracking-wide">
                Digital Governance &nbsp;|&nbsp; Efficient Services &nbsp;|&nbsp; Empowered Citizens
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL SARKAAR SEVA LOGIN FORM */}
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden p-1 rounded-md cursor-pointer"
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
                  className="text-xs font-semibold text-[#2F27CE] hover:text-[#251FB5] transition-colors focus:outline-hidden cursor-pointer"
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
                  className="text-[#2F27CE] hover:underline font-semibold focus:outline-hidden cursor-pointer"
                >
                  Contact your administrator
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel Footer */}
          <footer className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span>© 2026 Sarkaar Seva</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => toast.info("Sarkaar Seva enforces zero-trust data protection policies.")}
                className="hover:text-slate-600 transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => toast.info("Authorized government personnel operational terms apply.")}
                className="hover:text-slate-600 transition-colors cursor-pointer"
              >
                Terms
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => toast.info("Encrypted with SHA-512 and HMAC session security.")}
                className="hover:text-slate-600 transition-colors cursor-pointer"
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
                className="p-1 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
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

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-900">Quick Demo Access:</span>
                <div className="font-mono text-[11px] text-blue-800 mt-0.5">
                  ID: OFF-PAN-7042 &bull; Pass: 1234567890
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmployeeId("OFF-PAN-7042");
                  setPassword("1234567890");
                  setShowHelpModal(false);
                }}
                className="px-3 py-1.5 bg-[#2F27CE] hover:bg-[#251FB5] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Fill Demo
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
