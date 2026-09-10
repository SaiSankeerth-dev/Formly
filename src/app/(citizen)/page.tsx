"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  Folder,
  ArrowRight,
  Search,
  ChevronDown,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { IndiaMonumentsBanner } from "@/components/ui/IndiaMonumentsBanner";
import { CitizenApplicationTrackerCard } from "@/components/dashboard/CitizenApplicationTrackerCard";
import { YourProfileCard } from "@/components/dashboard/YourProfileCard";
import { YourTasksRemindersCard } from "@/components/dashboard/YourTasksRemindersCard";
import { NeedHelpCard } from "@/components/dashboard/NeedHelpCard";
import { CITIZEN_APPLICATIONS, CitizenTrackedApplication } from "@/lib/mock-data/citizen-applications";

export default function HomePage() {
  const { user } = useSevaSaarthi();

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name ? user.name.split(" ")[0] : "Sai";

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"MY_APPS" | "HISTORY">("MY_APPS");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_PROGRESS" | "ACTION_REQUIRED" | "COMPLETED" | "DRAFTS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("ALL");

  // Applications list
  const applications: CitizenTrackedApplication[] = CITIZEN_APPLICATIONS;

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

  // Counts for pills
  const inProgressCount = applications.filter((a) => a.statusCategory === "IN_PROGRESS").length;
  const actionRequiredCount = applications.filter((a) => a.statusCategory === "ACTION_REQUIRED").length;
  const completedCount = applications.filter((a) => a.statusCategory === "COMPLETED").length;
  const draftsCount = applications.filter((a) => a.statusCategory === "DRAFTS").length;

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      {/* 1. TOP WELCOME HERO BANNER matching Image 2 */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-amber-50/40 rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/70 text-blue-700 text-xs font-bold rounded-full mb-3">
            Your Trusted Government Services Companion
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{greeting}, {firstName}!</span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5 leading-relaxed">
            Track, apply and manage all your government services in one place.
          </p>
        </div>

        {/* Right Sovereign Monument Banner */}
        <IndiaMonumentsBanner className="w-full md:w-auto" />
      </div>

      {/* 2. 4 TOP KPI STAT CARDS matching Image 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
        {/* 3 Live Applications */}
        <Link
          href="/applications"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">3</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Live Applications</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        {/* 1 Completed */}
        <Link
          href="/applications?tab=history"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">1</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Completed</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        {/* 5 Pending Tasks */}
        <Link
          href="/tasks"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80 shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">5</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Pending Tasks</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        {/* 12 Saved Documents */}
        <Link
          href="/vault"
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-rose-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shrink-0 group-hover:scale-105 transition-transform">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">12</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Saved Documents</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
      </div>

      {/* 3. MAIN 2-COLUMN GRID matching Image 2 */}
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
                    <option value="s003">PAN Card</option>
                    <option value="s001">Scholarships</option>
                    <option value="s002">Housing Subsidy</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Status Filter Pills matching Image 2 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                  statusFilter === "ALL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All (3)
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

          {/* Application Live Tracker Cards matching Image 2 */}
          <div className="space-y-4">
            {filteredApps.length > 0 ? (
              filteredApps.map((app) => (
                <CitizenApplicationTrackerCard key={app.id} app={app} />
              ))
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500">
                <p className="text-sm font-semibold">No applications match your filter.</p>
                <button
                  onClick={() => {
                    setStatusFilter("ALL");
                    setServiceFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Profile, Tasks, Need Help matching Image 2 */}
        <div className="lg:col-span-4 space-y-4 w-full min-w-0">
          <YourProfileCard />
          <YourTasksRemindersCard />
          <NeedHelpCard />
        </div>
      </div>
    </div>
  );
}
