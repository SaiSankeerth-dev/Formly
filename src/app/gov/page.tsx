"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  Headphones,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { useGov } from "@/lib/store/gov-store";

export default function GovernmentDashboardPage() {
  const { currentUser, stats, applications, isLoading } = useGov();

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,";

  // Formatted current date e.g. "Tuesday, 10 September 2026"
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "Tuesday, 10 September 2026";
    }
  }, []);

  // Format relative timestamp
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return "Recently";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hrs ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  // Find the top action required application (matching PAN-2026-0083 or highest priority pending case)
  const topActionCase = useMemo(() => {
    if (!applications || applications.length === 0) return null;
    const prioritized = applications.find(
      (a) =>
        a.id === "PAN-2026-0083" ||
        a.status === "VERIFICATION_CONFLICT" ||
        a.status === "ACTION_REQUIRED"
    );
    if (prioritized) return prioritized;
    const urgent = applications.find((a) => a.priority === "URGENT" || a.priority === "HIGH");
    return urgent || applications[0];
  }, [applications]);

  // Recent applications (take top 5)
  const recentApplications = useMemo(() => {
    if (!applications || applications.length === 0) return [];
    return [...applications]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [applications]);

  // Format status badge
  const getStatusBadge = (app: (typeof applications)[0]) => {
    if (app.status === "RETURNED_FOR_CORRECTION") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Returned
        </span>
      );
    }
    if (app.status === "VERIFICATION_CONFLICT" || app.id === "PAN-2026-0083") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Verification
        </span>
      );
    }
    if (app.stage === "OFFICER_REVIEW" || app.status === "ACTION_REQUIRED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Needs Review
        </span>
      );
    }
    if (app.stage === "VERIFICATION_IN_PROGRESS") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
          Documents
        </span>
      );
    }
    if (app.status === "API_UNAVAILABLE") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Waiting Info
        </span>
      );
    }
    if (app.status === "COMPLETED" || app.stage === "DELIVERED" || app.status === "APPROVED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
        {app.stage.replace(/_/g, " ")}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "URGENT" || priority === "HIGH") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          High
        </span>
      );
    }
    if (priority === "NORMAL") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
        Normal
      </span>
    );
  };

  return (
    <div className="space-y-6 select-none">
      {/* 1. HERO BANNER */}
      <div className="bg-gradient-to-r from-blue-50/70 via-sky-50/50 to-indigo-50/80 rounded-3xl border border-sky-100 p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Officer Welcome & Metadata */}
        <div className="relative z-10 max-w-xl">
          <div className="text-sm font-medium text-slate-500 leading-tight">
            {greeting}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <span>{currentUser.name}</span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            {currentUser.department || "Income Tax Department (CBDT)"} • {currentUser.office || "Hyderabad (RPC)"}
          </p>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Here&apos;s what needs your attention today.
          </p>
        </div>

        {/* Center: Parliament Monument & Sarkaar Seva Motto Illustration */}
        <div className="hidden md:flex items-center justify-center relative flex-1 max-w-sm pointer-events-none">
          <div className="relative w-full text-center">
            {/* Architectural Skyline Silhouette with Indian Tricolor Flag */}
            <svg viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-20 text-slate-300/60 mx-auto">
              <line x1="10" y1="82" x2="270" y2="82" stroke="currentColor" strokeWidth="2" />
              <rect x="25" y="74" width="230" height="8" rx="1" fill="currentColor" fillOpacity="0.4" />
              {[40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240].map((cx, i) => (
                <rect key={i} x={cx - 3} y="44" width="6" height="30" rx="1" fill="currentColor" fillOpacity="0.5" />
              ))}
              <rect x="30" y="38" width="220" height="6" rx="1" fill="currentColor" fillOpacity="0.6" />
              <path d="M110 38 C110 18, 170 18, 170 38 Z" fill="currentColor" fillOpacity="0.5" />
              <line x1="140" y1="18" x2="140" y2="4" stroke="currentColor" strokeWidth="1.5" />
              {/* Indian Flag atop dome */}
              <path d="M140 4 L152 7 L140 10 Z" fill="#FF9933" />
            </svg>

            {/* Sarkaar Seva Ribbon Banner */}
            <div className="text-[11px] font-serif italic text-slate-600 tracking-wide mt-1">
              Sarkaar Seva for a Stronger India
            </div>
            <div className="w-24 h-0.5 mx-auto mt-0.5 bg-gradient-to-r from-orange-400 via-white to-green-600 rounded-full" />
          </div>
        </div>

        {/* Right: Date & Sovereign Quote Box */}
        <div className="relative z-10 flex flex-col items-end gap-2.5 shrink-0">
          <div className="text-xs font-semibold text-slate-500">
            {formattedDate}
          </div>

          <div className="bg-white/85 backdrop-blur-xs border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs text-left max-w-xs">
            <div className="text-blue-600 font-serif text-lg font-black leading-none mb-1">
              “
            </div>
            <div className="text-xs font-bold text-slate-900 leading-snug">
              Efficient Officers
            </div>
            <div className="text-xs font-bold text-blue-700 leading-snug">
              Stronger Citizens
            </div>
            <div className="text-xs font-bold text-emerald-700 leading-snug">
              Better Governance
            </div>
            <div className="w-full h-1 mt-2 bg-gradient-to-r from-orange-500 via-slate-200 to-green-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* 2. 4 REAL WORK PRIORITY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Needs Review */}
        <Link
          href="/gov/applications?status=needs_review"
          className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Needs Review
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900">
                  {stats.needsReview}
                </span>
                <span className="text-xs font-semibold text-slate-400">cases</span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Card 2: Due Today */}
        <Link
          href="/gov/queue?priority=high"
          className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Due Today
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900">
                  {stats.dueToday}
                </span>
                <span className="text-xs font-semibold text-slate-400">cases</span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-amber-50 text-slate-400 group-hover:text-amber-600 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Card 3: Returned */}
        <Link
          href="/gov/applications?status=returned"
          className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Returned
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900">
                  {stats.returned}
                </span>
                <span className="text-xs font-semibold text-slate-400">cases</span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-rose-50 text-slate-400 group-hover:text-rose-600 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Card 4: Exceptions */}
        <Link
          href="/gov/exceptions"
          className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Exceptions
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900">
                  {stats.exceptions}
                </span>
                <span className="text-xs font-semibold text-slate-400">cases</span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-purple-50 text-slate-400 group-hover:text-purple-600 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* 3. MAIN 2-COLUMN OPERATIONAL SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2/3 width): Next Action + Recent Applications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Action Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Next Action</h2>
              <Link
                href="/gov/queue"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <span>View My Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {topActionCase ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">
                      High Priority
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {topActionCase.id}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {topActionCase.serviceName.includes("PAN") ? "PAN Application" : topActionCase.serviceName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400">Citizen:</span>
                      <strong className="text-slate-800">{topActionCase.applicantName}</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-slate-400">Issue:</span>
                      <strong className="text-amber-800">
                        {topActionCase.aiSummary?.detectedIssues?.[0] || "Date of birth mismatch"}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400">Submitted:</span>
                      <span className="text-slate-700 font-medium">8 Sept 2026, 11:22 AM</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2.5 shrink-0 pt-2 sm:pt-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-bold shadow-2xs">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Verification Required</span>
                  </div>

                  <Link
                    href={`/gov/workspace/${topActionCase.id}`}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/30 flex items-center justify-center gap-2"
                  >
                    <span>Open Application</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No immediate action required. All pending cases are up to date.
              </div>
            )}
          </div>

          {/* Recent Applications Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Recent Applications</h2>
              <Link
                href="/gov/applications"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-2">APPLICATION ID</th>
                    <th className="pb-3 px-3">CITIZEN</th>
                    <th className="pb-3 px-3">SERVICE</th>
                    <th className="pb-3 px-3">STATUS</th>
                    <th className="pb-3 px-3">PRIORITY</th>
                    <th className="pb-3 px-3">UPDATED</th>
                    <th className="pb-3 px-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.length > 0 ? (
                    recentApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-2 font-mono font-bold text-slate-900">
                          {app.id}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {app.applicantName}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-600">
                          {app.serviceName.includes("PAN") ? "PAN" : app.serviceName.includes("TAN") ? "TAN" : app.serviceName}
                        </td>
                        <td className="py-3 px-3">{getStatusBadge(app)}</td>
                        <td className="py-3 px-3">{getPriorityBadge(app.priority)}</td>
                        <td className="py-3 px-3 text-slate-500 font-medium">
                          {getRelativeTime(app.updatedAt || app.createdAt)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Link
                            href={`/gov/workspace/${app.id}`}
                            className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-colors"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No applications currently available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1/3 width): My Queue by Priority + Quick Actions + Need Help */}
        <div className="space-y-6">
          {/* My Queue by Priority */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">My Queue by Priority</h2>
              <Link
                href="/gov/queue"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              <Link
                href="/gov/queue?priority=urgent"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-semibold text-slate-800">High Priority</span>
                </div>
                <span className="font-bold text-slate-900">{stats.highPriority || 4}</span>
              </Link>

              <Link
                href="/gov/queue?priority=medium"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-slate-800">Medium Priority</span>
                </div>
                <span className="font-bold text-slate-900">{stats.mediumPriority || 6}</span>
              </Link>

              <Link
                href="/gov/queue?priority=low"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="font-semibold text-slate-800">Normal</span>
                </div>
                <span className="font-bold text-slate-900">{stats.normalPriority || 8}</span>
              </Link>

              <Link
                href="/gov/queue?tab=due_today"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-slate-800">Due Today</span>
                </div>
                <span className="font-bold text-slate-900">{stats.dueToday || 5}</span>
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Quick Actions
            </h2>

            <div className="space-y-2.5 text-xs">
              <Link
                href="/gov/applications"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-amber-50/60 border border-slate-100 hover:border-amber-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-amber-900">
                      View All Applications
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Browse and search applications
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/gov/queue"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-purple-50/60 border border-slate-100 hover:border-purple-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-purple-900">
                      My Queue
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Cases assigned to you
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/gov/exceptions"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-rose-50/60 border border-slate-100 hover:border-rose-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-rose-900">
                      Exceptions
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Handle critical issues
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Need Help? */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Need Help?</div>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Contact your administrator for access or technical support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FOOTER */}
      <footer className="pt-6 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">Sarkaar Seva</span>
          <span>|</span>
          <span className="hover:text-slate-600 cursor-pointer">Privacy</span>
          <span>|</span>
          <span className="hover:text-slate-600 cursor-pointer">Terms</span>
          <span>|</span>
          <span className="hover:text-slate-600 cursor-pointer">Security</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          v2.0.0
        </div>
      </footer>
    </div>
  );
}
