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
import { POPULAR_SERVICES_LIST } from "@/lib/services/popular-services-data";

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const normalizedId = (id || "").toLowerCase();

  // 1. Check verified service registry first (e.g. PAN, Income, Caste, Scholarship)
  const popularMatch = POPULAR_SERVICES_LIST.find(
    (s) =>
      s.id.toLowerCase() === normalizedId ||
      s.name.toLowerCase().includes(normalizedId) ||
      (normalizedId.includes("pan") && s.id.includes("pan")) ||
      (normalizedId.includes("income") && s.id.includes("income")) ||
      (normalizedId.includes("caste") && s.id.includes("caste")) ||
      (normalizedId.includes("scholarship") && s.id.includes("scholarship")) ||
      (normalizedId.includes("voter") && s.id.includes("voter")) ||
      (normalizedId.includes("passport") && s.id.includes("passport")) ||
      (normalizedId.includes("licence") && s.id.includes("licence"))
  );

  const schemeMatch =
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

  const serviceTitle = popularMatch?.name || schemeMatch.title;
  const serviceCategory = popularMatch?.category || schemeMatch.category;
  const serviceAuthority = popularMatch?.authority || schemeMatch.ministry;
  const serviceDescription = popularMatch?.description || schemeMatch.description;
  const serviceUrl = popularMatch?.officialApplicationUrl || schemeMatch.officialUrl;
  const serviceDomain = popularMatch?.officialDomain || schemeMatch.portalDomain;
  const requiredDocs = popularMatch?.requirements || schemeMatch.requiredDocuments;
  const serviceId = popularMatch?.id || schemeMatch.id;

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

      {/* Service Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full">
            {serviceCategory}
          </span>
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">
            {schemeMatch.status.replace("_", " ")}
          </span>
          <span className="font-mono text-xs font-bold text-slate-400 ml-auto">
            Code: {schemeMatch.shortCode || serviceId}
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {serviceTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            {serviceAuthority}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {serviceDescription}
        </p>

        {/* Key Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Benefit / Support Level
            </div>
            <div className="text-sm font-black text-emerald-900 mt-0.5">
              {schemeMatch.benefitAmount || "Assisted Government Portal Workflow"}
            </div>
          </div>
          <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Application Portal
            </div>
            <div className="text-sm font-black text-amber-900 mt-0.5 font-mono">
              {serviceDomain}
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
            {requiredDocs.map((doc, idx) => (
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
            {schemeMatch.processSteps.map((step) => (
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
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Official Application Portal
          </div>
          <div className="text-base sm:text-lg font-bold mt-0.5">{serviceAuthority}</div>
          <div className="text-xs text-indigo-300 font-mono mt-0.5">{serviceDomain}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={serviceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // Record session locally and server-side for "Continue Your Work"
              fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  serviceId: serviceId,
                  serviceName: serviceTitle,
                  department: serviceAuthority,
                  officialUrl: serviceUrl,
                  status: "Work in progress",
                  nextAction: "Continue form",
                }),
              }).catch(() => {});
            }}
            className="inline-flex items-center gap-2 py-3 px-6 bg-[#2F27CE] hover:bg-[#231CA8] text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all cursor-pointer tracking-wider"
          >
            <span>APPLY NOW</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <Link
            href={`/assistant?serviceId=${serviceId}`}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl transition-colors inline-flex items-center gap-1.5"
          >
            <span>Ask Saarthi AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
