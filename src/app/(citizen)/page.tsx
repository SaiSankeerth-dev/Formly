"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  Folder,
  ArrowRight,
  Search,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { IndiaMonumentsBanner } from "@/components/ui/IndiaMonumentsBanner";
import { CitizenApplicationTrackerCard } from "@/components/dashboard/CitizenApplicationTrackerCard";
import { YourProfileCard } from "@/components/dashboard/YourProfileCard";
import { YourTasksRemindersCard } from "@/components/dashboard/YourTasksRemindersCard";
import { NeedHelpCard } from "@/components/dashboard/NeedHelpCard";
import { CITIZEN_APPLICATIONS, CitizenTrackedApplication } from "@/lib/mock-data/citizen-applications";

export default function HomePage() {
  const { user, checklistSummary, documents } = useSevaSaarthi();

  // Real Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name ? user.name.split(" ")[0] : "Citizen";

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"MY_APPS" | "HISTORY">("MY_APPS");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_PROGRESS" | "ACTION_REQUIRED" | "COMPLETED" | "DRAFTS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("ALL");

  // Real Citizen Applications from storage / session
  const [applications, setApplications] = useState<CitizenTrackedApplication[]>(CITIZEN_APPLICATIONS);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

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
      setIsLoadingApps(false);
    }
  }, [user?.id]);

  // Filter applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // Tab filter
      if (activeTab === "HISTORY" && app.statusCategory !== "COMPLETED") {
        return false;
      }

      // Status pill filter
      if (statusFilter === "IN_PROGRESS" && app.statusCategory !== "IN_PROGRESS") return false;
      if (statusFilter === "ACTION_REQUIRED" && app.statusCategory !== "ACTION_REQUIRED") return false;
      if (statusFilter === "COMPLETED" && app.statusCategory !== "COMPLETED") return false;
      if (statusFilter === "DRAFTS" && app.statusCategory !== "DRAFTS") return false;

      // Service filter
      if (serviceFilter !== "ALL" && app.serviceId !== serviceFilter) return false;

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
  }, [applications, activeTab, statusFilter, serviceFilter, searchQuery]);

  // Real Counts for pills and KPIs
  const inProgressCount = applications.filter((a) => a.statusCategory === "IN_PROGRESS").length;
  const actionRequiredCount = applications.filter((a) => a.statusCategory === "ACTION_REQUIRED").length;
  const completedCount = applications.filter((a) => a.statusCategory === "COMPLETED").length;
  const draftsCount = applications.filter((a) => a.statusCategory === "DRAFTS").length;
  const pendingTasksCount = checklistSummary.missingCount;
  const savedDocsCount = documents.filter((d) => !d.is_superseded).length;

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      {/* 1. TOP WELCOME HERO BANNER */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-amber-50/40 rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/70 text-blue-700 text-xs font-bold rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Your Trusted Government Services Companion
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{greeting}, {firstName}!</span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5 leading-relaxed">
            Discover verified government schemes, prepare documents to exact specifications, and apply on live official portals.
          </p>
        </div>

        {/* Right Sovereign Monument Banner */}
        <IndiaMonumentsBanner className="w-full md:w-auto" />
      </div>

      {/* 2. REAL DYNAMIC KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
        {/* Live Applications */}
        <Link
          href="/applications"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">{inProgressCount}</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Live Applications</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        {/* Completed */}
        <Link
          href="/applications?tab=history"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">{completedCount}</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Completed</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        {/* Pending Tasks */}
        <Link
          href="/tasks"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80 shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">{pendingTasksCount}</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Pending Tasks</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        {/* Saved Documents */}
        <Link
          href="/vault"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-rose-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shrink-0 group-hover:scale-105 transition-transform">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">{savedDocsCount}</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Saved Documents</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
      </div>

      {/* 3. MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        {/* Left Column (8 cols): Applications Tracker Cards */}
        <div className="lg:col-span-8 space-y-4 w-full min-w-0">
          {/* Top Tabs & Filters */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            {/* Tabs Row */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveTab("MY_APPS")}
                  className={`text-sm font-bold pb-2 relative transition-colors ${
                    activeTab === "MY_APPS"
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>My Applications</span>
                  {activeTab === "MY_APPS" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("HISTORY")}
                  className={`text-sm font-bold pb-2 relative transition-colors ${
                    activeTab === "HISTORY"
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Application History</span>
                  {activeTab === "HISTORY" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              </div>

              {/* Search & Service Filter */}
              <div className="flex items-center gap-2.5">
                <div className="relative hidden sm:block w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search your applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">All Services</option>
                    <option value="income-certificate">Income Certificate</option>
                    <option value="pan-card-new">PAN Card</option>
                    <option value="caste-certificate">Caste Certificate</option>
                    <option value="learners-licence">Learner's Licence</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                  statusFilter === "ALL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({applications.length})
              </button>
              <button
                onClick={() => setStatusFilter("IN_PROGRESS")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                  statusFilter === "IN_PROGRESS"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                onClick={() => setStatusFilter("ACTION_REQUIRED")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                  statusFilter === "ACTION_REQUIRED"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Action Required ({actionRequiredCount})
              </button>
              <button
                onClick={() => setStatusFilter("COMPLETED")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                  statusFilter === "COMPLETED"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Completed ({completedCount})
              </button>
              <button
                onClick={() => setStatusFilter("DRAFTS")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                  statusFilter === "DRAFTS"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Drafts ({draftsCount})
              </button>
            </div>
          </div>

          {/* Application Live Tracker Cards or REAL EMPTY State */}
          <div className="space-y-4">
            {isLoadingApps ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500">
                <p className="text-sm font-semibold">Loading applications...</p>
              </div>
            ) : filteredApps.length > 0 ? (
              filteredApps.map((app) => (
                <CitizenApplicationTrackerCard key={app.id} app={app} />
              ))
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  No applications recorded yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                  Seva Saarthi assists directly on live official portals. When you complete an application on an official government portal, your real acknowledgement and tracking reference will appear here.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/assistant"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <span>Discover Verified Services</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/vault"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span>Upload Documents to Vault</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Profile, Tasks, Need Help */}
        <div className="lg:col-span-4 space-y-4 w-full min-w-0">
          <YourProfileCard />
          <YourTasksRemindersCard />
          <NeedHelpCard />
        </div>
      </div>
    </div>
  );
}
