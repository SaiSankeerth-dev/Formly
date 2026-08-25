"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Bell, ChevronDown, User, LogOut, CheckCircle, Zap, Sparkles } from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { AutofillAssistant } from "@/components/assistant/AutofillAssistant";

export function Header() {
  const { user, profileStrength, stats } = useSevaSaarthi();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Dynamic greeting based on current hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name.split(" ")[0] || "Rahul";

  return (
    <>
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {greeting}, {firstName} <span className="text-2xl animate-pulse">👋</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Here&apos;s your application overview
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Quick Autofill Assistant Action */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl text-xs font-bold shadow-sm shadow-indigo-200 transition-all hover:scale-102"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Autofill Assistant</span>
          </button>

          {/* Profile Strength Indicator */}
          <Link
            href="/profile"
            className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-2xl transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="w-28">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                <span>Strength</span>
                <span className="text-emerald-600 font-bold">{profileStrength}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${profileStrength}%` }}
                />
              </div>
            </div>
          </Link>

          {/* Notification Bell */}
          <Link
            href="/notifications"
            className="relative p-2.5 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              3
            </span>
          </Link>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200/60 transition-all"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-tr from-amber-400 to-indigo-500 p-0.5 shadow-sm">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">{user.name}</div>
                <div className="text-[10px] font-medium text-slate-500">{user.role}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{user.name}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 text-slate-400" /> My Profile
                </Link>
                <Link
                  href="/vault"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <CheckCircle className="w-4 h-4 text-slate-400" /> Document Vault
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setIsAssistantOpen(true);
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  <Zap className="w-4 h-4" /> Autofill Assistant
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    window.location.reload();
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Assistant Modal */}
      {isAssistantOpen && (
        <AutofillAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
      )}
    </>
  );
}
