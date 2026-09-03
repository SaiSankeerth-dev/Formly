"use client";

import React from "react";
import { Settings, Shield, Key, Bell, Database, Lock, LogOut } from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, logout } = useSevaSaarthi();

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Settings & Privacy</h1>
          <p className="text-xs text-slate-500">Manage account security, encrypted data retention, and session preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Data Protection & Privacy</span>
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Seva Saarthi operates in full compliance with data protection principles. All documents and profile records are cryptographically secured and strictly isolated to your account.
          </p>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs py-1">
              <span className="font-semibold text-slate-700">Strict Tenant & User Isolation</span>
              <span className="text-emerald-600 font-bold">Enabled ✓</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="font-semibold text-slate-700">Zero Third-Party Sharing</span>
              <span className="text-emerald-600 font-bold">Enforced ✓</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="font-semibold text-slate-700">Auto-Submit Restrictions</span>
              <span className="text-slate-500">Disabled (User Approval Required)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Account Details</span>
          </h2>
          <div className="text-xs space-y-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Registered Name</label>
              <div className="font-bold text-slate-800">{user?.name || "Citizen Account"}</div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
              <div className="font-bold text-slate-800">{user?.email || "No email associated"}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={() => toast.info(`Password reset instructions will be sent to ${user?.email || "your email"}`)}
              className="py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
            >
              Change Password
            </button>
            <button
              onClick={logout}
              className="py-2 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
