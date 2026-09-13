"use client";

import React from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { StateEmblem } from "@/components/ui/StateEmblem";

export function GovFooter() {
  return (
    <footer className="mt-auto py-4 px-6 border-t border-slate-200 bg-white text-xs text-slate-500">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StateEmblem size={20} className="text-slate-600" />
          <div className="text-[11px] font-semibold text-slate-700">
            Sarkaar Seva &mdash; Official Government Operations Platform
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-emerald-700">
            <Lock className="w-3 h-3" />
            End-to-End Encrypted Officer Session
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            Audit Logging Active
          </span>
        </div>
      </div>
    </footer>
  );
}
