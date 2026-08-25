"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  FileCheck2,
  FolderOpen,
  User,
  ListTodo,
  Bell,
  Settings,
  HelpCircle,
  Headphones,
  Check,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { stats, checklistSummary, resetToPreset } = useSevaSaarthi();

  const navItems: NavItem[] = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Discover", href: "/discover", icon: Compass, badge: "New", badgeColor: "bg-emerald-100 text-emerald-700" },
    { label: "My Applications", href: "/checklist", icon: FileCheck2, badge: `${checklistSummary.percentageComplete}%` },
    { label: "Documents", href: "/vault", icon: FolderOpen, badge: stats.totalDocuments },
    { label: "Profile", href: "/profile", icon: User },
    { label: "Tasks & Reminders", href: "/tasks", icon: ListTodo, badge: stats.pendingTasks > 0 ? stats.pendingTasks : undefined, badgeColor: "bg-amber-100 text-amber-800" },
    { label: "Notifications", href: "/notifications", icon: Bell, badge: 3, badgeColor: "bg-rose-500 text-white" },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between h-screen sticky top-0 px-4 py-6 select-none z-30">
      {/* Brand Logo & Tagline */}
      <div>
        <Link href="/dashboard" className="flex items-center gap-3 px-2 mb-8 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <Check className="w-6 h-6 text-white stroke-[3]" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Seva Saarthi
            </div>
            <div className="text-[11px] font-medium text-slate-500 leading-tight">
              Your Government<br />Application Assistant
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/") ||
              (item.href === "/vault" && pathname === "/documents");

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-semibold rounded-full",
                      isActive
                        ? "bg-white/20 text-white"
                        : item.badgeColor || "bg-slate-100 text-slate-600"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Help Card & Demo Switcher */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between hover:bg-slate-100/80 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">Need help?</div>
              <div className="text-[10px] text-slate-500">Book a quick call with our expert</div>
            </div>
          </div>
          <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-sm">›</span>
        </div>

        {/* Demo Switcher Pill */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/70 rounded-xl p-2.5 text-[11px]">
          <div className="flex items-center justify-between text-indigo-900 font-semibold mb-1.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" /> Demo View:
            </span>
            <button
              onClick={() => resetToPreset("default")}
              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
              title="Reset state"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => resetToPreset("first_run")}
              className="py-1 px-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-md text-[10px] font-medium text-slate-700 text-center transition-colors"
            >
              Empty
            </button>
            <button
              onClick={() => resetToPreset("default")}
              className="py-1 px-1.5 bg-indigo-600 text-white rounded-md text-[10px] font-medium text-center shadow-xs"
            >
              92% Ready
            </button>
            <button
              onClick={() => resetToPreset("completed")}
              className="py-1 px-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-md text-[10px] font-medium text-slate-700 text-center transition-colors"
            >
              100% Full
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
