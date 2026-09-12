"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Phone,
  FileCheck,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";

export function YourTasksRemindersCard() {
  const { checklistSummary, profileFields, profileStrength } = useSevaSaarthi();

  // Generate real dynamic tasks from actual state
  const tasks = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      dueBadge: string;
      dueColor: string;
      iconBg: string;
      icon: any;
      href: string;
    }> = [];

    // 1. Real missing document tasks from checklist
    const missingDocs = checklistSummary.items.filter((i) => i.status === "MISSING");
    missingDocs.slice(0, 2).forEach((item, idx) => {
      list.push({
        id: `task_missing_doc_${idx}`,
        title: `Upload ${item.requirement.label || "Required Document"}`,
        subtitle: `Required for ${checklistSummary.service?.name || "Official Service"}`,
        dueBadge: "Action Required",
        dueColor: "bg-rose-50 text-rose-700 border-rose-200",
        iconBg: "bg-rose-50 text-rose-600 border-rose-100",
        icon: FileText,
        href: "/vault",
      });
    });

    // 2. Profile completion task if profile is incomplete
    if (profileStrength < 100) {
      const hasPhone = profileFields.some((f) => f.field_name === "phone_number" && f.value);
      if (!hasPhone) {
        list.push({
          id: "task_add_phone",
          title: "Add Mobile Number to Profile",
          subtitle: "Required for live portal OTP verification",
          dueBadge: "Pending",
          dueColor: "bg-amber-50 text-amber-700 border-amber-200",
          iconBg: "bg-amber-50 text-amber-600 border-amber-100",
          icon: Phone,
          href: "/profile",
        });
      } else {
        list.push({
          id: "task_complete_profile",
          title: "Complete Citizen Profile",
          subtitle: `${100 - profileStrength}% details remaining for 1-click autofill`,
          dueBadge: "Recommended",
          dueColor: "bg-blue-50 text-blue-700 border-blue-200",
          iconBg: "bg-blue-50 text-blue-600 border-blue-100",
          icon: FileCheck,
          href: "/profile",
        });
      }
    }

    return list;
  }, [checklistSummary, profileFields, profileStrength]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Your Tasks & Reminders</h3>
        <Link
          href="/tasks"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="p-4 text-center bg-emerald-50/50 border border-emerald-100 rounded-2xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
          <div className="text-xs font-bold text-emerald-900">All tasks completed!</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            Your documents and profile are ready for official portal assistance.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={t.href}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 hover:bg-slate-50 border border-slate-200/70 transition-all group min-w-0 gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${t.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {t.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.dueColor}`}>
                    {t.dueBadge}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
