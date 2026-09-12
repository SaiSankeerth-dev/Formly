"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Globe,
  Bell,
  Shield,
  Key,
  LogOut,
  Check,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, logout } = useSevaSaarthi();
  const [selectedLanguage, setSelectedLanguage] = useState("English (EN)");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [autofillConsent, setAutofillConsent] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSavePreferences = () => {
    setIsSaved(true);
    toast.success("Settings updated successfully!");
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Settings &amp; Preferences
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your account preferences, language, notification alerts, and DPDP privacy settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Language Preferences */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2F27CE] flex items-center justify-center border border-blue-100">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Language Preference</h2>
              <p className="text-xs text-slate-400">Choose your preferred language for government service guidance</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {[
              "English (EN)",
              "हिन्दी (HI)",
              "తెలుగు (TE)",
              "தமிழ் (TA)",
              "मराठी (MR)",
              "বাংলা (BN)",
              "ಕನ್ನಡ (KN)",
              "ગુજરાતી (GU)",
            ].map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSelectedLanguage(lang);
                  toast.success(`Language set to ${lang}`);
                }}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  selectedLanguage === lang
                    ? "bg-[#2F27CE] text-white border-[#2F27CE] shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications & Reminders */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center border border-indigo-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Notifications &amp; Reminders</h2>
              <p className="text-xs text-slate-400">Control how Seva Saarthi communicates important application alerts</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-slate-800">Email Notifications</div>
                <div className="text-[11px] text-slate-400">Receive application stage updates and document expiry alerts via email</div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-[#2F27CE] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-slate-800">SMS Alerts</div>
                <div className="text-[11px] text-slate-400">Receive critical government acknowledgements and OTP reminders on phone</div>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-4 h-4 text-[#2F27CE] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Privacy & DPDP Compliance */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Data Privacy &amp; Consent</h2>
              <p className="text-xs text-slate-400">In accordance with Section 5 of Digital Personal Data Protection Act, 2023</p>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed space-y-2">
            <p className="font-semibold">
              ✓ Citizen-First Data Minimization:
            </p>
            <p className="text-[11px] text-emerald-800">
              Seva Saarthi never sells or shares your documents with commercial third parties. Your stored profile details are exclusively used by the browser extension to autofill official government portals when you choose to apply.
            </p>
          </div>

          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-800">Browser Agent Autofill Consent</div>
              <div className="text-[11px] text-slate-400">Allow Seva Saarthi browser extension to access verified profile fields on approved government domains</div>
            </div>
            <input
              type="checkbox"
              checked={autofillConsent}
              onChange={(e) => setAutofillConsent(e.target.checked)}
              className="w-4 h-4 text-[#2F27CE] rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Account Security & Sign Out */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Account &amp; Security</h2>
              <p className="text-xs text-slate-400">Current authenticated session: {user?.email || "Citizen"}</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleSavePreferences}
              className="py-2.5 px-6 bg-[#2F27CE] hover:bg-[#261fa8] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>

            <button
              onClick={() => logout()}
              className="py-2.5 px-5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-2xl border border-rose-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Everywhere</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
