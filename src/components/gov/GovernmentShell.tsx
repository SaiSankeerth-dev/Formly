"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  FileText,
  CheckSquare,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Radio,
  GitPullRequest,
  Workflow,
  History,
  BarChart3,
  Clock,
  FolderGit2,
  Settings,
  Headphones,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  ExternalLink,
  Building,
} from "lucide-react";
import { useGov } from "@/lib/store/gov-store";
import { toast } from "sonner";
import { StateEmblem } from "@/components/ui/StateEmblem";

interface GovernmentShellProps {
  children: React.ReactNode;
}

export function GovernmentShell({ children }: GovernmentShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login" || pathname === "/government/login" || pathname === "/gov/login";

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#0A1128]">{children}</div>;
  }

  const { currentUser, stats, applications } = useGov();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
        setProfileMenuOpen(false);
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

  const navItems = [
    {
      label: "Dashboard",
      href: `${prefix}/dashboard`,
      icon: LayoutDashboard,
      activeMatch: (p: string) =>
        p === `${prefix}/dashboard` || p === `${prefix}` || p === "/gov" || p === "/government",
    },
    {
      label: "Applications",
      href: `${prefix}/applications`,
      icon: FileText,
      activeMatch: (p: string) =>
        p === `${prefix}/applications` || p.startsWith(`${prefix}/applications/`) || p.startsWith(`${prefix}/workspace`),
    },
    {
      label: "My Queue",
      href: `${prefix}/queue`,
      icon: CheckSquare,
      badge: stats.myQueue || (stats.needsReview > 0 ? stats.needsReview : undefined),
      badgeColor: "bg-rose-600 text-white",
      activeMatch: (p: string) => p.startsWith(`${prefix}/queue`),
    },
    {
      label: "Exceptions",
      href: `${prefix}/exceptions`,
      icon: AlertTriangle,
      badge: stats.exceptions > 0 ? stats.exceptions : undefined,
      badgeColor: "bg-rose-600 text-white",
      activeMatch: (p: string) => p.startsWith(`${prefix}/exceptions`),
    },
    {
      label: "Audit",
      href: `${prefix}/audit`,
      icon: History,
      activeMatch: (p: string) => p.startsWith(`${prefix}/audit`),
    },
  ];

  const secondaryNavItems = [
    {
      label: "Settings",
      href: `${prefix}/settings`,
      icon: Settings,
      activeMatch: (p: string) => p.startsWith(`${prefix}/settings`),
    },
  ];

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

  const userInitials = currentUser.name
    ? currentUser.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "GO";

  const SidebarContent = (
    <div className="flex flex-col justify-between h-full p-4 select-none relative overflow-hidden">
      {/* Top Brand Header */}
      <div className="space-y-6 relative z-10">
        <Link href={`${prefix}/dashboard`} className="flex items-center gap-3 px-2 py-1 group">
          {/* Ashoka Lion / State Emblem of India */}
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs group-hover:border-amber-400/50 transition-colors">
            <StateEmblem size={24} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white leading-tight">
                Sarkaar <span className="text-amber-400">Seva</span>
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">
              Government Operations Platform
            </div>
          </div>
        </Link>

        {/* Primary Navigation Items */}
        <nav className="space-y-1.5 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      isActive
                        ? "bg-white/25 text-white"
                        : item.badgeColor || "bg-rose-600 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Divider between Primary and Secondary Nav */}
          <div className="pt-2 pb-1">
            <div className="border-t border-slate-800/80 my-1" />
          </div>

          {/* Settings Nav Item */}
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Tricolor Wave + Parliament Architectural Silhouette & Motto */}
      <div className="relative pt-6 pb-2 mt-auto overflow-hidden">
        {/* Tricolor Ribbon Gradient Wave */}
        <div className="absolute -left-4 -bottom-6 w-48 h-28 pointer-events-none opacity-85">
          <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Saffron Ribbon Curve */}
            <path
              d="M-10 95 C 30 75, 70 50, 150 65 L 150 72 C 70 57, 30 82, -10 100 Z"
              fill="#FF9933"
              fillOpacity="0.85"
            />
            {/* White Ribbon Curve */}
            <path
              d="M-10 100 C 30 82, 70 57, 150 72 L 150 78 C 70 63, 30 88, -10 105 Z"
              fill="#FFFFFF"
              fillOpacity="0.75"
            />
            {/* India Green Ribbon Curve */}
            <path
              d="M-10 105 C 30 88, 70 63, 150 78 L 150 85 C 70 70, 30 95, -10 110 Z"
              fill="#138808"
              fillOpacity="0.85"
            />
          </svg>
        </div>

        {/* Parliament / Sansad Bhavan Architectural Watermark */}
        <div className="absolute right-0 bottom-0 w-36 h-24 text-slate-700/25 pointer-events-none">
          <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <line x1="10" y1="110" x2="190" y2="110" stroke="currentColor" strokeWidth="2" />
            <rect x="25" y="102" width="150" height="8" fill="currentColor" fillOpacity="0.3" />
            {[35, 50, 65, 80, 95, 110, 125, 140, 155].map((cx, i) => (
              <rect key={i} x={cx} y="65" width="5" height="37" fill="currentColor" fillOpacity="0.35" />
            ))}
            <rect x="25" y="58" width="150" height="7" fill="currentColor" fillOpacity="0.4" />
            <path d="M75 58 C75 35, 125 35, 125 58 Z" fill="currentColor" fillOpacity="0.3" />
            <line x1="100" y1="35" x2="100" y2="25" stroke="currentColor" strokeWidth="2" />
            <circle cx="100" cy="23" r="2.5" fill="currentColor" />
          </svg>
        </div>

        {/* Motivational Text Slogan */}
        <div className="relative z-10 pl-2 space-y-0.5 text-slate-400">
          <div className="text-[11px] font-medium leading-tight text-slate-300">Enable</div>
          <div className="text-xs font-bold leading-tight text-white tracking-tight">Efficient Governance</div>
          <div className="text-[11px] font-medium leading-tight text-slate-300">for a Stronger India</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      {/* 1. Left Fixed Sidebar for Desktop (1024px+) */}
      <aside className="hidden lg:flex w-64 bg-[#0A1128] text-white shrink-0 border-r border-slate-800/80 flex-col justify-between sticky top-0 h-screen overflow-y-auto no-scrollbar z-40">
        {SidebarContent}
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
            <div className="flex-1 overflow-y-auto">{SidebarContent}</div>
          </div>
        </div>
      )}

      {/* 3. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Mobile hamburger & Search Bar */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative flex-1">
              <div
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
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
              {(stats.exceptions > 0 || stats.needsReview > 0) && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {stats.exceptions + (stats.dueToday > 0 ? 1 : 0) || 5}
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

              {/* Profile Dropdown Menu (No Citizen Link, No Role Switcher) */}
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
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out of Sarkaar Seva</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

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
      </div>
    </div>
  );
}
