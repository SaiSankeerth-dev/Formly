"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Bell, ChevronDown, User, LogOut, CheckCircle, Zap, Menu, Check } from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { AutofillAssistant } from "@/components/assistant/AutofillAssistant";

interface HeaderProps {
  onOpenMobileNav?: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps = {}) {
  const { user, profileStrength, logout, unreadNotificationsCount } = useSevaSaarthi();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Dynamic greeting based on current hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name ? user.name.split(" ")[0] : "Citizen";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "CS";

  return (
    <>
      {/* 1. MOBILE TOP HEADER (< 768px screens) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100">
        {/* Top Bar: Hamburger, Logo, Notifications, Avatar */}
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left: Hamburger & Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onOpenMobileNav}
              aria-label="Open navigation menu"
              className="w-10 h-10 -ml-1 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center transition-colors shrink-0 min-w-[40px] min-h-[40px]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-xs shrink-0">
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </div>
              <span className="font-bold text-slate-900 text-base tracking-tight truncate">
                Seva Saarthi
              </span>
            </Link>
          </div>

          {/* Right: Notifications & User Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>

            {/* User Profile Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User account menu"
                className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-slate-100"
              >
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </button>

              {/* Mobile User Menu Dropdown */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                      <div className="text-[11px] text-slate-500">{user?.email}</div>
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
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Greeting Bar */}
        <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100/80 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5 min-w-0">
              <span className="truncate">{greeting}, {firstName}</span>
              <span className="text-base shrink-0">👋</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-500 truncate">
              Here&apos;s your application overview
            </p>
          </div>
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-[11px] font-bold shadow-xs hover:opacity-95 transition-opacity"
          >
            <Zap className="w-3 h-3" />
            <span>Assistant</span>
          </button>
        </div>
      </header>

      {/* 2. DESKTOP HEADER (100% preserved layout on md: screens and above) */}
      <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {greeting}, {firstName} <span className="text-2xl">👋</span>
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
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {unreadNotificationsCount}
              </span>
            )}
          </Link>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200/60 transition-all"
            >
              {user?.avatar ? (
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-tr from-amber-400 to-indigo-500 p-0.5 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover rounded-[10px]"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm shadow-indigo-100">
                  {initials}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.name || "Citizen Account"}
                </div>
                <div className="text-[10px] font-medium text-slate-500">
                  {user?.email || "Citizen User"}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                    <div className="text-[11px] text-slate-500">{user?.email}</div>
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
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
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
