"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  ArrowRight,
  Globe,
  AlertCircle,
  Building2,
  CheckCircle2,
} from "lucide-react";

import { VerifiedService } from "@/lib/registry/verified-service-registry";

export interface ServiceDetail {
  id: string;
  name: string;
  category: string;
  authority: string;
  officialApplicationUrl: string;
  officialInformationUrl?: string;
  officialDomain: string;
  officialDomains?: string[];
  urlType?: "DIRECT_APPLICATION" | "OFFICIAL_ENTRY";
  supportLevel: "BROWSER_ASSISTANCE" | "FULL_ASSIST" | "GUIDED" | string;
  description: string;
  requirements: string[];
  eligibility?: string;
  steps?: string[];
}

export type AnyService = ServiceDetail | VerifiedService;

interface ServiceDetailDrawerProps {
  service: AnyService | null;
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (service: AnyService) => void;
}

export function ServiceDetailDrawer({
  service,
  isOpen,
  onClose,
  onSessionCreated,
}: ServiceDetailDrawerProps) {
  const [isOpening, setIsOpening] = useState(false);

  if (!isOpen || !service) return null;

  const normalized = {
    id: "id" in service && service.id ? service.id : (service as VerifiedService).serviceId || "service",
    name: "name" in service && service.name ? service.name : (service as VerifiedService).serviceName || "Official Service",
    category: service.category || "Government Portal",
    authority: service.authority || "Government of India",
    officialApplicationUrl: service.officialApplicationUrl || "#",
    officialDomain: service.officialDomain || "",
    supportLevel: service.supportLevel || "GUIDED",
    description:
      "description" in service && service.description
        ? service.description
        : "eligibility" in service && service.eligibility
        ? service.eligibility
        : "Official government service portal and application.",
    requirements:
      "requirements" in service && Array.isArray(service.requirements)
        ? service.requirements
        : "requiredDocuments" in service && Array.isArray((service as VerifiedService).requiredDocuments)
        ? (service as VerifiedService).requiredDocuments
        : ["Aadhaar or Identity Proof", "Mobile number linked to Aadhaar"],
  };

  const handleOpenOfficialApplication = async () => {
    setIsOpening(true);

    try {
      // 1. Notify browser extension & trigger handoff event
      const handoffPayload = {
        serviceId: normalized.id,
        serviceName: normalized.name,
        authority: normalized.authority,
        officialDomain: normalized.officialDomain,
        officialApplicationUrl: normalized.officialApplicationUrl,
        timestamp: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        window.postMessage({ type: "SEVA_SAARTHI_ACTIVATE_SERVICE", data: handoffPayload }, "*");
        window.postMessage({ type: "SEVA_SAARTHI_LAUNCH_SERVICE", data: handoffPayload }, "*");
        window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_ACTIVATE_SERVICE", { detail: handoffPayload }));
        window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_LAUNCH_SERVICE", { detail: handoffPayload }));
      }

      // 2. Record this session locally/server-side for "Continue Your Work"
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: normalized.id,
            serviceName: normalized.name,
            department: normalized.authority,
            officialUrl: normalized.officialApplicationUrl,
            status: "Work in progress",
            nextAction: "Continue form",
          }),
        });
      } catch (err) {
        console.warn("[ServiceDetailDrawer] Could not record session to server:", err);
      }

      if (onSessionCreated) {
        onSessionCreated(service);
      }

      // 3. Open the REAL official government URL in a new browser tab
      window.open(normalized.officialApplicationUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsOpening(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-slate-100">
        <div>
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div className="space-y-1 pr-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                <Globe className="w-3 h-3" />
                <span>Verified Official Portal</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {normalized.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{normalized.authority}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6">
            {/* Purpose / Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Service Purpose
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {normalized.description}
              </p>
            </div>

            {/* Official Domain Verification Box */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-emerald-900">
                  Direct Official Authority Link
                </div>
                <div className="text-emerald-700 font-medium">
                  This application will open directly on the authorized government portal:
                </div>
                <div className="font-mono text-[11px] text-emerald-800 bg-white/70 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                  https://{normalized.officialDomain}
                </div>
              </div>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Required Documents & Information</span>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {normalized.requirements.length} Items
                </span>
              </h3>
              <div className="space-y-2">
                {normalized.requirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Saarthi Support Level */}
            <div className="space-y-2 p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/70">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Saarthi AI Support Level</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                {normalized.supportLevel === "BROWSER_ASSISTANCE" || normalized.supportLevel === "FULL_ASSIST"
                  ? "Live In-Browser Assistance: Saarthi will detect required fields, assist with document uploads, and guide you through multi-step portal verification."
                  : "Official Portal Guidance: Saarthi provides document preparation rules, requirements verification, and direct deep links."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white space-y-3">
          <button
            onClick={handleOpenOfficialApplication}
            disabled={isOpening}
            className="w-full py-3.5 px-5 bg-[#2F27CE] hover:bg-[#231CA8] active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <span>OPEN OFFICIAL APPLICATION</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <p className="text-center text-[10px] text-slate-400 font-medium">
            Opens directly on {normalized.officialDomain}. No intermediate mock forms.
          </p>
        </div>
      </div>
    </div>
  );
}
