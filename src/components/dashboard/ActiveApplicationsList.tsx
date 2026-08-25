"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, CreditCard, Home, ChevronRight, ArrowRight } from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";

export function ActiveApplicationsList() {
  const { checklistSummary } = useSevaSaarthi();

  const applications = [
    {
      id: "app_1",
      title: "Post-Matric Scholarship",
      appId: "APP12345",
      icon: GraduationCap,
      iconBg: "bg-emerald-50 text-emerald-600",
      progress: checklistSummary.percentageComplete,
      statusText: "In Progress",
      href: "/checklist",
    },
    {
      id: "app_2",
      title: "PAN Card Application",
      appId: "APP12346",
      icon: CreditCard,
      iconBg: "bg-indigo-50 text-indigo-600",
      progress: 60,
      statusText: "In Progress",
      href: "/checklist",
    },
    {
      id: "app_3",
      title: "Housing Subsidy Scheme",
      appId: "APP12347",
      icon: Home,
      iconBg: "bg-amber-50 text-amber-600",
      progress: 30,
      statusText: "In Progress",
      href: "/checklist",
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-slate-900">Active Applications</h2>
        <Link href="/checklist" className="text-xs font-semibold text-indigo-600 hover:underline">
          View all
        </Link>
      </div>

      {/* Applications List */}
      <div className="space-y-3 mb-5">
        {applications.map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.id}
              href={app.href}
              className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100/90 rounded-2xl transition-all group"
            >
              {/* Left: Icon & Info */}
              <div className="flex items-center gap-3.5 min-w-[200px]">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${app.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {app.title}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Application ID: {app.appId}
                  </div>
                </div>
              </div>

              {/* Center: Progress Bar */}
              <div className="flex-1 max-w-[200px] mx-4 hidden sm:flex items-center gap-3">
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${app.progress}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 min-w-[36px]">{app.progress}%</span>
              </div>

              {/* Right: Status & Chevron */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                <span>{app.statusText}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Full Width Action */}
      <Link
        href="/checklist"
        className="w-full py-2.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 flex items-center justify-center gap-2 transition-all"
      >
        <span>View all active applications</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
