"use client";

import React from "react";
import Link from "next/link";
import { FileText, CheckCircle2, Folder, Calendar, Sparkles, ArrowRight, UploadCloud, Edit3 } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { RecommendedSchemes } from "@/components/dashboard/RecommendedSchemes";
import { ActiveApplicationsList } from "@/components/dashboard/ActiveApplicationsList";
import { ProfileSummaryCard } from "@/components/dashboard/ProfileSummaryCard";
import { YourTasksList } from "@/components/dashboard/YourTasksList";
import { DocumentVaultCard } from "@/components/dashboard/DocumentVaultCard";
import { BottomBanner } from "@/components/dashboard/BottomBanner";
import { useSevaSaarthi } from "@/lib/store/formly-store";

export default function HomePage() {
  const { stats, checklistSummary, user, profileStrength } = useSevaSaarthi();

  const isNewUser = stats.totalDocuments === 0 && profileStrength < 50;

  return (
    <div className="space-y-6 pb-12">
      {/* First-Run Citizen Onboarding Welcome Banner */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-indigo-200 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> First-Time Citizen Setup
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
              Welcome, {user?.name || "Citizen"}!
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed mb-5">
              Build your reusable citizen profile and document vault once, then use it to effortlessly apply for scholarships, welfare schemes, and public services without repetitive manual data entry.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/profile"
                className="px-5 py-2.5 bg-white text-indigo-900 font-bold text-xs rounded-xl hover:bg-indigo-50 transition-all shadow-md flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Fill Profile Details</span>
              </Link>
              <Link
                href="/vault"
                className="px-5 py-2.5 bg-indigo-700/80 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl border border-indigo-500/40 transition-all flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Aadhaar / Certificates</span>
              </Link>
            </div>
          </div>
          {/* Subtle background decoration */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>
      )}

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Applications"
          count={stats.activeApplications}
          icon={FileText}
          href="/checklist"
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Completed"
          count={stats.completedApplications}
          icon={CheckCircle2}
          href="/checklist"
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Documents"
          count={stats.totalDocuments}
          icon={Folder}
          href="/vault"
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Pending Tasks"
          count={stats.pendingTasks}
          icon={Calendar}
          href="/tasks"
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <RecommendedSchemes />
          <ActiveApplicationsList />
          <BottomBanner />
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <ProfileSummaryCard />
          <YourTasksList />
          <DocumentVaultCard />
        </div>
      </div>
    </div>
  );
}
