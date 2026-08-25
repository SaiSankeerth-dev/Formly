"use client";

import React from "react";
import { FileText, CheckCircle2, Folder, Calendar } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { RecommendedSchemes } from "@/components/dashboard/RecommendedSchemes";
import { ActiveApplicationsList } from "@/components/dashboard/ActiveApplicationsList";
import { ProfileSummaryCard } from "@/components/dashboard/ProfileSummaryCard";
import { YourTasksList } from "@/components/dashboard/YourTasksList";
import { DocumentVaultCard } from "@/components/dashboard/DocumentVaultCard";
import { BottomBanner } from "@/components/dashboard/BottomBanner";
import { useSevaSaarthi } from "@/lib/store/formly-store";

export default function HomePage() {
  const { stats, checklistSummary } = useSevaSaarthi();

  return (
    <div className="space-y-6 pb-12">
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
