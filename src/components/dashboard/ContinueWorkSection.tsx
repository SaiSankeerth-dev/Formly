"use client";

import React from "react";
import Link from "next/link";
import { Clock, ArrowRight, CreditCard, FileQuestion, Sparkles, FolderSearch } from "lucide-react";
import { CitizenSessionRecord } from "@/lib/server/db";

interface ContinueWorkSectionProps {
  sessions: CitizenSessionRecord[];
  onContinueSession?: (session: CitizenSessionRecord) => void;
  onDiscoverClick?: () => void;
}

export function ContinueWorkSection({
  sessions,
  onContinueSession,
  onDiscoverClick,
}: ContinueWorkSectionProps) {
  const hasSessions = Array.isArray(sessions) && sessions.length > 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header matching Reference Image */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2F27CE] flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Continue Your Work
          </h2>
        </div>

        {hasSessions && (
          <Link
            href="/applications"
            className="text-xs font-bold text-[#2F27CE] hover:text-[#231CA8] flex items-center gap-1 group transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Content: Sessions list or Clean Empty State */}
      {hasSessions ? (
        <div className="space-y-3">
          {sessions.slice(0, 3).map((session) => (
            <div
              key={session.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-indigo-100 hover:shadow-xs transition-all duration-200"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center shrink-0 border border-indigo-100/60 shadow-2xs">
                  <CreditCard className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {session.serviceName}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 truncate">
                    {session.department}
                  </p>
                </div>
              </div>

              {/* Status pill & timestamp */}
              <div className="flex items-center gap-6 sm:justify-end">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-[#2F27CE] shrink-0" />
                    <span>{session.status}</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-400">
                    Last edited {session.lastEditedAt}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onContinueSession) {
                      onContinueSession(session);
                    } else if (session.officialUrl) {
                      window.open(session.officialUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="py-2 px-4 rounded-xl bg-[#2F27CE] hover:bg-[#231CA8] active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state matching requirement 12 & 26 */
        <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center mx-auto border border-indigo-100">
            <FolderSearch className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800">
              No applications yet
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start by discovering a government service or ask Saarthi AI to assist you with required documents.
            </p>
          </div>
          <button
            onClick={onDiscoverClick}
            className="inline-flex items-center gap-2 py-2 px-4 bg-[#2F27CE] hover:bg-[#231CA8] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>Discover Services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
