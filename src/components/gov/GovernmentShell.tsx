"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useGov } from "@/lib/store/gov-store";
import { toast } from "sonner";
import { StateEmblem } from "@/components/ui/StateEmblem";
import { GOV_PRIMARY_NAV } from "@/lib/navigation/governmentNavigation";
import { GovHeader } from "./GovHeader";
import { GovNavigation } from "./GovNavigation";
import { GovFooter } from "./GovFooter";

interface GovernmentShellProps {
  children: React.ReactNode;
}

export function GovernmentShell({ children }: GovernmentShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login" || pathname === "/government/login" || pathname === "/gov/login";

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#F8FAFC]">{children}</div>;
  }

  const { currentUser, stats, applications } = useGov();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut for search: Ctrl + K or Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/gov/auth/logout", { method: "POST" });
      toast.info("Signed out from Sarkaar Seva Operations Console");
      window.location.href = "/gov/login";
    } catch {
      window.location.href = "/gov/login";
    }
  };

  const isGovernmentPath = pathname.startsWith("/government");
  const prefix = isGovernmentPath ? "/government" : "/gov";
  const getAppWorkspaceUrl = (id: string) => `${prefix}/workspace/${id}`;

  // Quick search filter for matching applications
  const searchResults = searchQuery.trim()
    ? applications.filter(
        (a) =>
          a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.applicantPhone.includes(searchQuery)
      )
    : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      {/* 1. Left Fixed Sidebar for Desktop (1024px+) */}
      <aside className="hidden lg:flex w-64 bg-[#0A1128] text-white shrink-0 border-r border-slate-800/80 flex-col justify-between sticky top-0 h-screen overflow-y-auto no-scrollbar z-40">
        <GovNavigation stats={stats} />
      </aside>

      {/* 2. Mobile Drawer for Small Screens */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#0A1128] text-white h-full z-10 flex flex-col shadow-2xl">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                  <StateEmblem size={20} className="text-amber-400" />
                </div>
                <div>
                  <span className="font-black text-white text-base tracking-tight">
                    Sarkaar <span className="text-amber-400">Seva</span>
                  </span>
                  <div className="text-[10px] text-slate-400 leading-none">Gov Operations</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <GovNavigation stats={stats} onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <GovHeader
          currentUser={currentUser}
          stats={stats}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSearch={() => {
            setSearchOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }}
          onSignOut={handleSignOut}
        />

        {/* Global Search Modal Overlay */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setSearchOpen(false)} />
            <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search application ID (e.g. PAN-2026-0001), citizen, phone, or stage..."
                  className="w-full text-sm bg-transparent outline-none text-slate-900 placeholder-slate-400"
                  autoFocus
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg text-xs"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {searchResults.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Matching Applications ({searchResults.length})
                    </div>
                    {searchResults.map((app) => (
                      <Link
                        key={app.id}
                        href={getAppWorkspaceUrl(app.id)}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/60 border border-transparent hover:border-blue-100 transition-all group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700 text-xs">{app.id}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {app.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">
                            {app.applicantName} • {app.serviceName}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                          Open Workspace →
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No applications or citizens found matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="p-4 text-xs text-slate-400 space-y-2">
                    <div className="font-bold text-slate-600">Quick Navigation Suggestions:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {applications.slice(0, 4).map((app) => (
                        <Link
                          key={app.id}
                          href={getAppWorkspaceUrl(app.id)}
                          onClick={() => setSearchOpen(false)}
                          className="p-2.5 bg-slate-50 hover:bg-blue-50 rounded-xl font-mono text-blue-700 font-bold text-xs truncate"
                        >
                          {app.id} ({app.applicantName})
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto space-y-6">
          {children}
        </main>
        <GovFooter />
      </div>
    </div>
  );
}
