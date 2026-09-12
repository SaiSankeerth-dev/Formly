"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  FileText,
  ArrowRight,
  Clock,
  AlertTriangle,
  User,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { useGov } from "@/lib/store/gov-store";

function ApplicationsContent() {
  const { applications, currentUser } = useGov();
  const searchParams = useSearchParams();
  const initialStatusFilter = searchParams.get("status") || searchParams.get("filter") || "ALL";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "NEEDS_REVIEW" | "VERIFICATION" | "RETURNED" | "COMPLETED" | "EXCEPTIONS"
  >(
    initialStatusFilter.toUpperCase() === "NEEDS_REVIEW"
      ? "NEEDS_REVIEW"
      : initialStatusFilter.toUpperCase() === "RETURNED"
      ? "RETURNED"
      : initialStatusFilter.toUpperCase() === "VERIFICATION"
      ? "VERIFICATION"
      : initialStatusFilter.toUpperCase() === "EXCEPTIONS"
      ? "EXCEPTIONS"
      : initialStatusFilter.toUpperCase() === "COMPLETED"
      ? "COMPLETED"
      : "ALL"
  );
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "PRIORITY">("NEWEST");

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

  // Filter & Search Logic
  const filteredApplications = useMemo(() => {
    let list = applications.filter((app) => {
      // 1. Status Filter
      if (statusFilter === "NEEDS_REVIEW") {
        if (
          app.stage !== "OFFICER_REVIEW" &&
          app.status !== "ACTION_REQUIRED" &&
          app.status !== "VERIFICATION_CONFLICT"
        ) {
          return false;
        }
      } else if (statusFilter === "VERIFICATION") {
        if (
          app.stage !== "VERIFICATION_IN_PROGRESS" &&
          app.stage !== "GOVERNMENT_PROCESSING" &&
          app.status !== "PROCESSING"
        ) {
          return false;
        }
      } else if (statusFilter === "RETURNED") {
        if (app.status !== "RETURNED_FOR_CORRECTION") return false;
      } else if (statusFilter === "COMPLETED") {
        if (app.status !== "APPROVED" && app.status !== "COMPLETED" && app.stage !== "DELIVERED") {
          return false;
        }
      } else if (statusFilter === "EXCEPTIONS") {
        if (
          app.status !== "VERIFICATION_CONFLICT" &&
          app.status !== "API_UNAVAILABLE" &&
          app.status !== "REJECTED"
        ) {
          return false;
        }
      }

      // 2. Priority Filter
      if (priorityFilter !== "ALL") {
        if (priorityFilter === "URGENT" && app.priority !== "URGENT") return false;
        if (priorityFilter === "HIGH" && app.priority !== "HIGH") return false;
        if (priorityFilter === "NORMAL" && app.priority !== "NORMAL") return false;
      }

      // 3. Search query (Application ID, Citizen, Service)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          app.id.toLowerCase().includes(q) ||
          app.applicantName.toLowerCase().includes(q) ||
          app.serviceName.toLowerCase().includes(q) ||
          app.applicantPhone?.includes(q) ||
          app.data?.aadhaarNumber?.includes(q);
        if (!matches) return false;
      }

      return true;
    });

    // 4. Sorting
    if (sortBy === "NEWEST") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "OLDEST") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "PRIORITY") {
      const pWeights: Record<string, number> = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
      list.sort((a, b) => (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0));
    }

    return list;
  }, [applications, statusFilter, priorityFilter, searchQuery, sortBy]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: applications.length,
      needsReview: applications.filter(
        (a) =>
          a.stage === "OFFICER_REVIEW" ||
          a.status === "ACTION_REQUIRED" ||
          a.status === "VERIFICATION_CONFLICT"
      ).length,
      verification: applications.filter(
        (a) =>
          a.stage === "VERIFICATION_IN_PROGRESS" ||
          a.stage === "GOVERNMENT_PROCESSING" ||
          a.status === "PROCESSING"
      ).length,
      returned: applications.filter((a) => a.status === "RETURNED_FOR_CORRECTION").length,
      completed: applications.filter(
        (a) => a.status === "APPROVED" || a.status === "COMPLETED" || a.stage === "DELIVERED"
      ).length,
      exceptions: applications.filter(
        (a) =>
          a.status === "VERIFICATION_CONFLICT" ||
          a.status === "API_UNAVAILABLE" ||
          a.status === "REJECTED"
      ).length,
    };
  }, [applications]);

  // Status Badge UI helper
  const getStatusBadge = (app: (typeof applications)[0]) => {
    if (app.status === "RETURNED_FOR_CORRECTION") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          Returned
        </span>
      );
    }
    if (app.status === "VERIFICATION_CONFLICT") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Conflict / Review
        </span>
      );
    }
    if (app.status === "API_UNAVAILABLE") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          API Retry Pending
        </span>
      );
    }
    if (app.status === "ACTION_REQUIRED" || app.stage === "OFFICER_REVIEW") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Needs Review
        </span>
      );
    }
    if (app.stage === "VERIFICATION_IN_PROGRESS") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Verification
        </span>
      );
    }
    if (app.status === "COMPLETED" || app.stage === "DELIVERED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Delivered
        </span>
      );
    }
    if (app.status === "APPROVED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Approved
        </span>
      );
    }
    if (app.status === "REJECTED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          Closed / Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Applications Repository</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Applications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational case repository across all citizen applications and verification pipelines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/gov/queue"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Go to My Queue</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "ALL"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>All</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "ALL" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"}`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("NEEDS_REVIEW")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "NEEDS_REVIEW"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>Needs Review</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "NEEDS_REVIEW" ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"}`}>
              {counts.needsReview}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("VERIFICATION")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "VERIFICATION"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>Verification</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "VERIFICATION" ? "bg-white/25 text-white" : "bg-blue-100 text-blue-800"}`}>
              {counts.verification}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("RETURNED")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "RETURNED"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>Returned</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "RETURNED" ? "bg-white/25 text-white" : "bg-rose-100 text-rose-800"}`}>
              {counts.returned}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("COMPLETED")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "COMPLETED"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "COMPLETED" ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-800"}`}>
              {counts.completed}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("EXCEPTIONS")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "EXCEPTIONS"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>Exceptions</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "EXCEPTIONS" ? "bg-white/25 text-white" : "bg-rose-100 text-rose-800"}`}>
              {counts.exceptions}
            </span>
          </button>
        </div>

        {/* Search Input & Secondary Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Application ID, citizen name, service, or Aadhaar..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="PRIORITY">Highest Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-5">APPLICATION ID</th>
                <th className="py-3.5 px-5">CITIZEN</th>
                <th className="py-3.5 px-5">SERVICE</th>
                <th className="py-3.5 px-5">CURRENT ACTION</th>
                <th className="py-3.5 px-5">PRIORITY</th>
                <th className="py-3.5 px-5">ASSIGNED OFFICER</th>
                <th className="py-3.5 px-5">UPDATED</th>
                <th className="py-3.5 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length > 0 ? (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    {/* Application ID */}
                    <td className="py-4 px-5">
                      <Link
                        href={`/gov/workspace/${app.id}`}
                        className="font-mono font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5"
                      >
                        <span>{app.id}</span>
                      </Link>
                    </td>

                    {/* Citizen Name & Contact */}
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900">{app.applicantName}</div>
                      <div className="text-[11px] text-slate-400">{app.applicantPhone || "1234567890"}</div>
                    </td>

                    {/* Service */}
                    <td className="py-4 px-5">
                      <span className="font-medium text-slate-700">
                        {app.serviceName.includes("PAN") ? "PAN" : app.serviceName.includes("TAN") ? "TAN" : app.serviceName}
                      </span>
                    </td>

                    {/* Current Action / Status */}
                    <td className="py-4 px-5">{getStatusBadge(app)}</td>

                    {/* Priority */}
                    <td className="py-4 px-5">{getPriorityBadge(app.priority)}</td>

                    {/* Assigned Officer */}
                    <td className="py-4 px-5">
                      <span className="text-slate-600 font-medium">
                        {app.assignedOfficerName || "Officer Sai Sankeerth"}
                      </span>
                    </td>

                    {/* Updated */}
                    <td className="py-4 px-5 text-slate-500 font-medium">
                      {getRelativeTime(app.updatedAt || app.createdAt)}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/gov/workspace/${app.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-all shadow-2xs"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <div className="font-bold text-slate-700 text-sm">No applications available</div>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? `No records found matching "${searchQuery}"`
                        : "There are no applications matching the selected filter"}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("ALL");
                        }}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                      >
                        Reset Search
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing <strong className="text-slate-800">{filteredApplications.length}</strong> of{" "}
            <strong className="text-slate-800">{applications.length}</strong> total applications
          </span>
          <span className="text-[11px] text-slate-400">
            Sarkaar Seva Case Engine • Real Authenticated Database
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
          Loading applications ledger...
        </div>
      }
    >
      <ApplicationsContent />
    </Suspense>
  );
}

