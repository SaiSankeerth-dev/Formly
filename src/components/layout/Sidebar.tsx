"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Folder,
  User,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { LotusLogo } from "@/components/ui/LotusLogo";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainNavItems: NavItem[] = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "My Applications", href: "/applications", icon: FileText },
    { label: "Documents", href: "/documents", icon: Folder },
    { label: "Profile", href: "/profile", icon: User },
  ];

  const secondaryNavItems: NavItem[] = [
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const isNavActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    if (href === "/documents") {
      return pathname === "/documents" || pathname === "/vault";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "hidden md:flex bg-white border-r border-slate-100 flex-col justify-between h-screen sticky top-0 px-4 py-5 select-none z-30 shrink-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20 px-3" : "w-64 lg:w-[268px]"
      )}
    >
      <div>
        {/* Brand Logo & Tagline */}
        <div className="flex items-center justify-between px-2 mb-6">
          <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
            <LotusLogo className="w-9 h-9 shrink-0 group-hover:scale-105 transition-transform" />
            {!isCollapsed && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <div className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                  Seva Saarthi
                </div>
                <div className="text-[11px] font-medium text-slate-400 leading-tight">
                  One Form. A Smarter India.
                </div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 items-center justify-center transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Navigation Links */}
        <nav className="space-y-1.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-semibold text-xs transition-all duration-200",
                  active
                    ? "bg-[#2F27CE] text-white shadow-md shadow-indigo-200/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                  isCollapsed && "justify-center px-0"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-slate-500")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          {/* Minimal Divider matching reference */}
          <div className="my-3 border-t border-slate-100" />

          {/* Secondary Links: Settings, Help & Support */}
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-semibold text-xs transition-all duration-200",
                  active
                    ? "bg-[#2F27CE] text-white shadow-md shadow-indigo-200/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                  isCollapsed && "justify-center px-0"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-slate-500")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 pt-3">
        {/* Empowering Citizens Stronger India Card matching Reference Image */}
        {!isCollapsed && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#EEF4FF] via-[#E8EEFF] to-[#DFE9FE] border border-blue-100/80 p-4 shadow-xs">
            {/* Background Tricolor Wave & India Gate Graphic */}
            <div className="relative z-10 space-y-1">
              <h4 className="text-xs font-black text-slate-900 leading-snug">
                Empowering<br />Citizens<br />Stronger India
              </h4>
              <p className="text-[10px] font-medium text-slate-500">
                Simple. Secure. Smarter.
              </p>
            </div>

            {/* Subtle Abstract Wave SVG */}
            <svg
              className="absolute right-0 bottom-0 w-28 h-24 pointer-events-none opacity-80"
              viewBox="0 0 120 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 10 90 C 40 70 60 50 120 40 L 120 100 L 10 100 Z"
                fill="#3B82F6"
                fillOpacity="0.15"
              />
              <path
                d="M 20 85 C 50 75 75 55 120 50"
                stroke="#F97316"
                strokeWidth="3"
                strokeLinecap="round"
                fillOpacity="0.8"
              />
              <path
                d="M 15 92 C 45 82 70 62 120 57"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M 10 99 C 40 89 65 69 120 64"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Silhouette of India Gate */}
              <g fill="#93C5FD" fillOpacity="0.5" transform="translate(70, 30) scale(0.6)">
                <rect x="10" y="20" width="30" height="35" rx="2" />
                <path d="M 10 20 L 25 10 L 40 20 Z" />
                <path d="M 18 55 C 18 35 32 35 32 55 Z" fill="#FFFFFF" fillOpacity="0.9" />
              </g>
            </svg>
          </div>
        )}

        {/* Digital India Flag Footer */}
        <div className={cn("pt-2 flex items-center justify-between text-[10px] text-slate-400", isCollapsed && "justify-center")}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-[2px] overflow-hidden flex flex-col border border-slate-200 shrink-0">
              <div className="h-1 bg-[#FF9933]" />
              <div className="h-1 bg-white flex items-center justify-center">
                <div className="w-0.5 h-0.5 rounded-full bg-[#000080]" />
              </div>
              <div className="h-1 bg-[#128807]" />
            </div>
            {!isCollapsed && (
              <div className="leading-tight">
                <div className="font-bold text-slate-700">A Digital India Initiative</div>
                <div>For a Brighter Tomorrow</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNavDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "My Applications", href: "/applications", icon: FileText },
    { label: "Documents", href: "/documents", icon: Folder },
    { label: "Profile", href: "/profile", icon: User },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const isNavActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    if (href === "/documents") {
      return pathname === "/documents" || pathname === "/vault";
    }
    return pathname.startsWith(href);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-[110] flex flex-col justify-between p-5 transition-transform duration-300 ease-in-out md:hidden overflow-y-auto select-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div>
          <div className="flex items-center gap-3 px-1 mb-6">
            <LotusLogo className="w-8 h-8 shrink-0" />
            <div>
              <div className="text-base font-black tracking-tight text-slate-900">Seva Saarthi</div>
              <div className="text-[10px] font-medium text-slate-400">One Form. A Smarter India.</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 rounded-2xl font-semibold text-xs transition-all",
                    active
                      ? "bg-[#2F27CE] text-white shadow-md shadow-indigo-200/50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Icon className={cn("w-4 h-4", active ? "text-white" : "text-slate-400")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🇮🇳</span>
            <span>A Digital India Initiative</span>
          </div>
          <span>v2.0.0</span>
        </div>
      </aside>
    </>
  );
}
