"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  FilePlus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { CitizenApplicationTrackerCard } from "@/components/dashboard/CitizenApplicationTrackerCard";
import { CITIZEN_APPLICATIONS, CitizenTrackedApplication } from "@/lib/mock-data/citizen-applications";
import { useSevaSaarthi } from "@/lib/store/formly-store";

export default function ApplicationsPage() {
  const { user } = useSevaSaarthi();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "IN_PROGRESS" | "ACTION_REQUIRED" | "COMPLETED">("ALL");

  // Real user applications
  const [applications, setApplications] = useState<CitizenTrackedApplication[]>(CITIZEN_APPLICATIONS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      if (user?.id) {
        const stored = localStorage.getItem(`citizen_apps_${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setApplications(Array.isArray(parsed) && parsed.length > 0 ? parsed : CITIZEN_APPLICATIONS);
        } else {
          setApplications(CITIZEN_APPLICATIONS);
        }
      } else {
        setApplications(CITIZEN_APPLICATIONS);
      }
    } catch {
      setApplications(CITIZEN_APPLICATIONS);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (selectedStatus === "IN_PROGRESS" && app.statusCategory !== "IN_PROGRESS") return false;
      if (selectedStatus === "ACTION_REQUIRED" && app.statusCategory !== "ACTION_REQUIRED") return false;
      if (selectedStatus === "COMPLETED" && app.statusCategory !== "COMPLETED") return false;

      // Department filter
      if (selectedDept !== "ALL" && !app.department.toLowerCase().includes(selectedDept.toLowerCase())) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          app.id.toLowerCase().includes(q) ||
          app.title.toLowerCase().includes(q) ||
          app.department.toLowerCase().includes(q) ||
          app.statusText.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [applications, selectedStatus, selectedDept, searchQuery]);

  const inProgressCount = applications.filter((a) => a.statusCategory === "IN_PROGRESS").length;
  const actionRequiredCount = applications.filter((a) => a.statusCategory === "ACTION_REQUIRED").length;
  const completedCount = applications.filter((a) => a.statusCategory === "COMPLETED").length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-blue-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Seva Saarthi Live Tracking Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            My Application Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
            Real-time lifecycle tracking, stage milestones, and official acknowledgements for government schemes completed through Seva Saarthi.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/assistant"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <FilePlus className="w-4 h-4" />
              <span>Apply for Official Service</span>
            </Link>
            <Link
              href="/vault"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Document Vault</span>
            </Link>
          </div>
        </div>

        {/* Decorative background accent */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Real Dynamic KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Applied</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{applications.length}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">In Progress</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{inProgressCount}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{completedCount}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Action Required</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{actionRequiredCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 text-xs">
          <button
            onClick={() => setSelectedStatus("ALL")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedStatus === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setSelectedStatus("IN_PROGRESS")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedStatus === "IN_PROGRESS" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setSelectedStatus("ACTION_REQUIRED")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedStatus === "ACTION_REQUIRED" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Action Required ({actionRequiredCount})
          </button>
          <button
            onClick={() => setSelectedStatus("COMPLETED")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedStatus === "COMPLETED" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Applications List or Empty State */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-semibold">Loading applications...</p>
          </div>
        ) : filteredApps.length > 0 ? (
          filteredApps.map((app) => (
            <CitizenApplicationTrackerCard key={app.id} app={app} />
          ))
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              No applications currently tracked
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
              When you use Seva Saarthi on an official government portal, the portal's genuine application number and submission receipt will be saved here automatically.
            </p>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <span>Explore Verified Government Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
