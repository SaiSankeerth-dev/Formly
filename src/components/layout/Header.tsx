"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, User, LogOut, Folder, Settings, Menu } from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { LotusLogo } from "@/components/ui/LotusLogo";

interface HeaderProps {
  onOpenMobileNav?: () => void;
  onOpenCommandPalette?: () => void;
}

export function Header({ onOpenMobileNav, onOpenCommandPalette }: HeaderProps = {}) {
  const router = useRouter();
  const { user, logout } = useSevaSaarthi();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [currentLang, setCurrentLang] = useState("EN");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute initials dynamically from real user name
  const userInitials = React.useMemo(() => {
    if (!user?.name) {
      if (user?.email) return user.email.substring(0, 2).toUpperCase();
      return "CU";
    }
    const parts = user.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user?.name, user?.email]);

  const displayName = user?.name || (user?.email ? user.email.split("@")[0] : "Citizen");

  // Global Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (onOpenCommandPalette) {
          onOpenCommandPalette();
        } else {
          searchInputRef.current?.focus();
        }
      }
      if (e.key === "Escape") {
        setShowUserMenu(false);
        setShowLangMenu(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenCommandPalette]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Dispatches custom event so home or command palette can display matching services
      window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SEARCH", { detail: searchQuery.trim() }));
    }
  };

  return (
    <>
      {/* 1. MOBILE TOP HEADER (< 768px) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="w-9 h-9 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <LotusLogo className="w-7 h-7 shrink-0" />
            <span className="font-black text-slate-900 text-sm tracking-tight truncate">
              Seva Saarthi
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              3
            </span>
          </div>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#2F27CE] font-bold text-xs flex items-center justify-center ring-1 ring-indigo-200"
          >
            {userInitials || <User className="w-4 h-4 text-[#2F27CE]" />}
          </button>
        </div>
      </header>

      {/* 2. DESKTOP HEADER (>= 768px) matching reference image */}
      <header className="hidden md:flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 gap-6">
        {/* Large Service Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 max-w-xl cursor-text"
          onClick={() => {
            if (onOpenCommandPalette) onOpenCommandPalette();
          }}
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search government services (e.g., PAN, income certificate, scholarship...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SEARCH", { detail: e.target.value }));
            }}
            className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F27CE]/20 focus:border-[#2F27CE] focus:bg-white transition-all font-medium"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-md shadow-2xs font-mono">
              Ctrl + K
            </kbd>
          </div>
        </form>

        {/* Right Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language Selector: EN ⌵ */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              <span>{currentLang}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showLangMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLangMenu(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  {[
                    { code: "EN", name: "English" },
                    { code: "HI", name: "हिन्दी" },
                    { code: "TE", name: "తెలుగు" },
                    { code: "TA", name: "தமிழ்" },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setCurrentLang(lang.code);
                        setShowLangMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>{lang.name}</span>
                      {currentLang === lang.code && <span className="text-[#2F27CE] font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notification Bell with Badge (3) matching Reference Image */}
          <button
            className="relative p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors shadow-2xs cursor-pointer"
            title="3 new notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              3
            </span>
          </button>

          {/* User Profile Pill matching Reference Image */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 pr-3 hover:bg-slate-50 rounded-2xl border border-slate-200 bg-white transition-all shadow-2xs cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#2F27CE] font-black text-xs flex items-center justify-center">
                {userInitials || <User className="w-4 h-4 text-[#2F27CE]" />}
              </div>
              <span className="text-xs font-bold text-slate-800 hidden sm:inline truncate max-w-[120px]">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900">{displayName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user?.email || "Citizen Account"}</div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <User className="w-4 h-4 text-slate-400" /> My Profile
                  </Link>
                  <Link
                    href="/documents"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Folder className="w-4 h-4 text-slate-400" /> Your Documents
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
