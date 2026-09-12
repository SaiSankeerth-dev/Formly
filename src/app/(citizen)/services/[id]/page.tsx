"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Building2,
  ExternalLink,
  ShieldCheck,
  Award,
  ArrowRight,
} from "lucide-react";
import { REAL_GOVERNMENT_SCHEMES } from "@/lib/schemes/schemes-data";

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const normalizedId = (id || "").toLowerCase();
  const scheme =
    REAL_GOVERNMENT_SCHEMES.find(
      (s) =>
        s.id.toLowerCase() === normalizedId ||
        s.shortCode.toLowerCase() === normalizedId
    ) ||
    REAL_GOVERNMENT_SCHEMES.find(
      (s) =>
        (normalizedId.includes("income") && s.id.includes("income")) ||
        (normalizedId.includes("scholarship") && s.category.includes("Scholarship")) ||
        (normalizedId.includes("pmay") && s.shortCode.toLowerCase().includes("pmay")) ||
        (normalizedId.includes("pan") && s.category === "Identity & Tax")
    ) ||
    REAL_GOVERNMENT_SCHEMES[0];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Services
      </button>

      {/* Scheme Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full">
            {scheme.category}
          </span>
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">
            {scheme.status.replace("_", " ")}
          </span>
          <span className="font-mono text-xs font-bold text-slate-400 ml-auto">
            Code: {scheme.shortCode}
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {scheme.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            {scheme.ministry}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {scheme.description}
        </p>

        {/* Key Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Benefit Amount
            </div>
            <div className="text-sm font-black text-emerald-900 mt-0.5">
              {scheme.benefitAmount}
            </div>
          </div>
          <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Application Deadline
            </div>
            <div className="text-sm font-black text-amber-900 mt-0.5">
              {scheme.applicationDeadline}
            </div>
          </div>
        </div>
      </div>

      {/* Required Documents & Eligibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Required Documents */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Required Documents</h2>
          </div>
          <ul className="space-y-2.5">
            {scheme.requiredDocuments.map((doc, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Process Steps */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Application Steps</h2>
          </div>
          <ol className="space-y-3">
            {scheme.processSteps.map((step) => (
              <li key={step.step} className="flex items-start gap-3 text-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {step.step}
                </span>
                <div>
                  <div className="font-bold text-slate-900">{step.title}</div>
                  <div className="text-slate-500 mt-0.5 leading-normal">{step.description}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Official Portal Notice & Action */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Official Issuing Portal
          </div>
          <div className="text-base sm:text-lg font-bold mt-0.5">{scheme.officialPortal}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{scheme.portalDomain}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/assistant?serviceId=${scheme.id}`}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <span>Seva Saarthi Agent</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/checklist"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            Check Readiness
          </Link>
          <a
            href={scheme.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <span>Official Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
