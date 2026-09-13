"use client";

import React from "react";
import Link from "next/link";
import { CITIZEN_FOOTER_NAV } from "@/lib/navigation/citizenNavigation";
import { ShieldCheck } from "lucide-react";

export function CitizenFooter() {
  return (
    <footer className="mt-auto pt-8 pb-4 border-t border-slate-100 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Digital India Notice */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-3.5 rounded-[2px] overflow-hidden flex flex-col border border-slate-200 shrink-0">
            <div className="h-1 bg-[#FF9933]" />
            <div className="h-1 bg-white flex items-center justify-center">
              <div className="w-0.5 h-0.5 rounded-full bg-[#000080]" />
            </div>
            <div className="h-1 bg-[#128807]" />
          </div>
          <div className="text-[11px] leading-tight text-slate-500">
            <span className="font-bold text-slate-700">Seva Saarthi</span> &mdash; Digital Public Infrastructure for Citizen Services
          </div>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
          {CITIZEN_FOOTER_NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="hover:text-[#2F27CE] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* DPDP Compliance Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>DPDP Act 2023 Compliant</span>
        </div>
      </div>
    </footer>
  );
}
