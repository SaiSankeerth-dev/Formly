"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  FolderSearch,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { CitizenSessionRecord } from "@/lib/server/db";
import { ServiceDetailDrawer, ServiceDetail } from "@/components/services/ServiceDetailDrawer";
import { POPULAR_SERVICES_LIST } from "@/lib/services/popular-services-data";

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, isLoadingAuth } = useSevaSaarthi();
  const [sessions, setSessions] = useState<CitizenSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.sessions)) {
            setSessions(data.sessions);
          }
        }
      } catch (err) {
        console.warn("[MyApplicationsPage] Failed to fetch sessions", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!isLoadingAuth) {
      if (!user) {
        router.push("/login");
      } else {
        loadSessions();
      }
    }
  }, [user, isLoadingAuth, router]);

  const handleContinue = (session: CitizenSessionRecord) => {
    const matched = POPULAR_SERVICES_LIST.find((s) => s.id === session.serviceId);
    if (matched) {
      setSelectedService(matched);
      setIsDrawerOpen(true);
    } else if (session.officialUrl) {
      window.open(session.officialUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (isLoadingAuth || isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-pulse">
        <div className="h-20 bg-white rounded-3xl border border-slate-100 p-6" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#2F27CE] text-xs font-bold rounded-full mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Citizen Workspace</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            My Applications
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track your ongoing government service sessions and continue where you left off.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#2F27CE] text-xs font-bold rounded-2xl transition-colors shrink-0"
        >
          <span>Discover New Service</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Applications List */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-100 hover:shadow-sm transition-all"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {session.serviceName}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#2F27CE] border border-blue-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F27CE]" />
                    {session.status}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {session.department}
                </div>
                <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1 pt-0.5">
                  <span className="text-slate-400">Next:</span>
                  <span>{session.nextAction || "Continue form"}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:justify-end shrink-0">
                <div className="text-[11px] font-medium text-slate-400 hidden sm:block">
                  Edited {session.lastEditedAt}
                </div>
                <button
                  onClick={() => handleContinue(session)}
                  className="py-2.5 px-5 bg-[#2F27CE] hover:bg-[#231CA8] active:scale-95 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center mx-auto border border-indigo-100">
            <FolderSearch className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-900">
              No applications yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Start by discovering a government service on the Home page. Your active application sessions will appear here.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#2F27CE] hover:bg-[#231CA8] text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
          >
            <span>Discover Services</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Service Drawer */}
      <ServiceDetailDrawer
        service={selectedService}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
