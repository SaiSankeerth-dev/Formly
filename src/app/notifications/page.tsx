"use client";

import React from "react";
import { Bell, CheckCircle2, FileSearch, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const notifications = [
    {
      id: "1",
      title: "OCR Extraction Complete: Income Certificate",
      desc: "5 fields extracted with 92% average confidence. Please review and confirm to verify your profile.",
      time: "10 mins ago",
      icon: FileSearch,
      iconBg: "bg-indigo-50 text-indigo-600",
      href: "/vault",
    },
    {
      id: "2",
      title: "Scheme Eligibility Match: Post-Matric Scholarship",
      desc: "Your profile matches 92% of the scholarship criteria. 2 documents remaining.",
      time: "2 hours ago",
      icon: Sparkles,
      iconBg: "bg-emerald-50 text-emerald-600",
      href: "/checklist",
    },
    {
      id: "3",
      title: "Bonafide Certificate Reminder",
      desc: "High priority task: Obtain Bonafide Certificate from your college administrative office.",
      time: "1 day ago",
      icon: AlertCircle,
      iconBg: "bg-amber-50 text-amber-600",
      href: "/tasks",
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-500">Alerts, OCR pipeline updates, and application reminders.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-3">
        {notifications.map((n) => {
          const Icon = n.icon;
          return (
            <Link
              key={n.id}
              href={n.href}
              className="flex items-start justify-between p-4 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 rounded-2xl transition-all group"
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {n.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.desc}</p>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-slate-400 shrink-0 ml-4">{n.time}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
