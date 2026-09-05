"use client";

import React from "react";
import {
  Bell,
  CheckCircle2,
  FileSearch,
  Sparkles,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  CheckCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useSevaSaarthi } from "@/lib/store/formly-store";

export default function NotificationsPage() {
  const { notifications, unreadNotificationsCount, markNotificationAsRead, clearAllNotifications, isLoadingAuth } = useSevaSaarthi();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "DOCUMENT":
        return { icon: FileSearch, bg: "bg-indigo-50 text-indigo-600 border-indigo-100" };
      case "PROFILE":
        return { icon: UserCheck, bg: "bg-amber-50 text-amber-600 border-amber-100" };
      case "READINESS":
        return { icon: Sparkles, bg: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "SECURITY":
      default:
        return { icon: ShieldCheck, bg: "bg-blue-50 text-blue-600 border-blue-100" };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/60 shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Notifications & Alerts</h1>
              {unreadNotificationsCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full">
                  {unreadNotificationsCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Live updates from your document vault, citizen profile, and application readiness.</p>
          </div>
        </div>

        {unreadNotificationsCount > 0 && (
          <button
            onClick={clearAllNotifications}
            className="self-start sm:self-auto py-2 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      {isLoadingAuth ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4.5 rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-200 rounded-md w-1/3" />
                <div className="h-3 bg-slate-200 rounded-md w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">You&apos;re All Caught Up!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are no pending alerts. Upload documents or update your profile to see real-time pipeline notifications.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-3">
          {notifications.map((n) => {
            const { icon: Icon, bg } = getCategoryIcon(n.category);
            return (
              <div
                key={n.id}
                className={`relative flex items-start justify-between p-4.5 rounded-2xl border transition-all ${
                  !n.read
                    ? "bg-indigo-50/20 border-indigo-100/80 shadow-xs"
                    : "bg-slate-50/60 border-slate-100 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs font-bold ${!n.read ? "text-slate-900" : "text-slate-700"}`}>
                        {n.title}
                      </h3>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">{n.desc}</p>
                    
                    <div className="flex items-center gap-3 mt-3">
                      <Link
                        href={n.href}
                        onClick={() => markNotificationAsRead(n.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      {!n.read && (
                        <button
                          onClick={() => markNotificationAsRead(n.id)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-4">{n.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
