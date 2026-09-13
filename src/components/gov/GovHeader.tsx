"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  FileText,
  Shield,
  LogOut,
  Building,
} from "lucide-react";

export interface GovHeaderProps {
  currentUser: {
    id: string;
    name: string;
    roleTitle: string;
    office: string;
  };
  stats?: {
    exceptions?: number;
    needsReview?: number;
    dueToday?: number;
  };
  onOpenMobileMenu?: () => void;
  onOpenSearch?: () => void;
  onSignOut?: () => void;
}

export function GovHeader({
  currentUser,
  stats = {},
  onOpenMobileMenu,
  onOpenSearch,
  onSignOut,
}: GovHeaderProps) {
  const pathname = usePathname();
  const prefix = pathname.startsWith("/government") ? "/government" : "/gov";
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const userInitials = currentUser.name
    ? currentUser.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "OF";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger & Search Bar */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Trigger */}
        <div className="relative flex-1">
          <div
            onClick={onOpenSearch}
            className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-400 cursor-pointer transition-all w-full max-w-lg"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate hidden sm:inline">
              Search by Application ID, citizen name, service, or document...
            </span>
            <span className="truncate sm:hidden">Search cases...</span>
            <span className="ml-auto text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-2xs shrink-0">
              Ctrl + K
            </span>
          </div>
        </div>
      </div>

      {/* Right: Notifications & Officer Profile Menu */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Notifications Bell */}
        <button
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {((stats.exceptions || 0) > 0 || (stats.needsReview || 0) > 0) && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              {(stats.exceptions || 0) + ((stats.dueToday || 0) > 0 ? 1 : 0) || 5}
            </span>
          )}
        </button>

        {/* Officer Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {currentUser.roleTitle}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu (Strictly Government Scoped) */}
          {profileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                {/* User Identity Header */}
                <div className="p-3 border-b border-slate-100">
                  <div className="font-bold text-xs text-slate-900">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Desk ID: <span className="text-blue-700 font-semibold">{currentUser.id}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {currentUser.office}
                  </div>
                </div>

                {/* Operational Menu Items */}
                <div className="py-1 space-y-0.5 text-xs">
                  <Link
                    href={`${prefix}/queue`}
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Assigned Work</span>
                  </Link>
                  <Link
                    href={`${prefix}/applications`}
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>All Applications</span>
                  </Link>
                  <Link
                    href={`${prefix}/settings`}
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span>Settings & Workdesk</span>
                  </Link>
                </div>

                {/* Sign Out Action */}
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onSignOut?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out from Desk</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
