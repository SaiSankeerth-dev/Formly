"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UploadCloud,
  CheckSquare,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  AlertCircle,
  Printer,
  Copy,
  Zap,
  Bot,
  Monitor,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { ChecklistItemViewModel, ServiceRequirement } from "@/types";
import { cn } from "@/lib/utils";
import { ManualResolveModal } from "@/components/checklist/ManualResolveModal";
import { UploadDocumentModal } from "@/components/vault/UploadDocumentModal";
import { BrowserAgentModal } from "@/components/agent/BrowserAgentModal";
import { toast } from "sonner";

export function ReadinessChecklistPage() {
  const { checklistSummary, unmarkRequirementResolved, recomputeRequirements } = useSevaSaarthi();
  const [selectedReqForResolve, setSelectedReqForResolve] = useState<ServiceRequirement | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isLaunchingHeaded, setIsLaunchingHeaded] = useState(false);
  const [expandedGuidance, setExpandedGuidance] = useState<Record<string, boolean>>({});

  const toggleGuidance = (id: string) => {
    setExpandedGuidance((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { service, totalRequirements, satisfiedCount, missingCount, manuallyResolvedCount, percentageComplete, items } =
    checklistSummary;

  const satisfiedItems = items.filter((i) => i.status === "SATISFIED");
  const missingItems = items.filter((i) => i.status === "MISSING");
  const resolvedItems = items.filter((i) => i.status === "MANUALLY_RESOLVED");

  const isComplete = missingCount === 0 && totalRequirements > 0;

  const copySummaryToClipboard = () => {
    const text = `Seva Saarthi Readiness Summary - ${service.name}\n` +
      `Progress: ${percentageComplete}% Complete (${satisfiedCount + manuallyResolvedCount}/${totalRequirements} items)\n\n` +
      `Satisfied Items:\n` + satisfiedItems.map((i) => `✓ ${i.requirement.label}`).join("\n") +
      `\n\nMissing Items:\n` + (missingItems.length > 0 ? missingItems.map((i) => `✗ ${i.requirement.label} - ${i.requirement.guidance_text}`).join("\n") : "None!") +
      `\n\nOfficial Apply Portal: ${service.official_url}`;

    navigator.clipboard.writeText(text);
    toast.success("Readiness checklist copied to clipboard!");
  };

  // Launch agent in new live browser tab
  const launchLiveAgentInNewTab = () => {
    window.open("/portal/scholarships", "_blank");
    toast.success("Opening Autonomous Portal Agent in new tab...");
  };

  // Launch real headed Chrome on Windows desktop
  const launchDesktopChrome = async () => {
    setIsLaunchingHeaded(true);
    toast.info("Launching real visible Chrome browser on your desktop...");
    try {
      const res = await fetch("/api/agent/launch-headed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalUrl: service.official_url }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error("Failed to launch desktop Chrome: " + data.error);
      }
    } catch (err: any) {
      toast.error("Error launching agent: " + err.message);
    } finally {
      setIsLaunchingHeaded(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Service Detail Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                {service.category || "Scholarship Scheme"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active MVP Service
              </span>
            </div>

            {/* Title & Description */}
            <h1 className="text-xl font-black text-slate-900 leading-snug">{service.name}</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {service.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 mt-4">
              <button
                onClick={launchLiveAgentInNewTab}
                className="inline-flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 px-4 py-2 rounded-xl shadow-sm shadow-indigo-200 transition-all hover:scale-102"
              >
                <Bot className="w-4 h-4" />
                <span>Run Agent in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={launchDesktopChrome}
                disabled={isLaunchingHeaded}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl border border-slate-200 transition-all"
                title="Spawns a real Google Chrome window on your desktop using Playwright"
              >
                <Monitor className="w-4 h-4 text-indigo-600" />
                <span>{isLaunchingHeaded ? "Launching Chrome..." : "Launch Real Chrome Window"}</span>
              </button>

              <a
                href={service.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 px-3 py-2 rounded-xl border border-indigo-100 transition-colors"
              >
                <span>Official Portal ({service.official_domain})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={copySummaryToClipboard}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </button>
            </div>
          </div>

          {/* Readiness Meter Card */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-100 rounded-2xl p-5 min-w-[240px] text-center shrink-0">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Readiness Score
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {percentageComplete}%
            </div>
            <div className="text-xs font-medium text-slate-600 mt-0.5 mb-3">
              {satisfiedCount + manuallyResolvedCount} of {totalRequirements} requirements satisfied
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-blue-500"
                )}
                style={{ width: `${percentageComplete}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span className="text-emerald-700">{satisfiedCount} Satisfied</span>
              <span className="text-amber-700">{missingCount} Missing</span>
              <span className="text-blue-700">{manuallyResolvedCount} Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">
                You are 100% ready to apply! 🎉
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                All required documents and personal fields are verified. Launch the Autonomous Portal Agent in a live tab to autofill the form with human-in-the-loop submission approval!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={launchLiveAgentInNewTab}
              className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-102"
            >
              <Bot className="w-4 h-4" />
              <span>Autofill in Live Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <a
              href={service.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 flex items-center gap-2 transition-all"
            >
              <span>scholarships.gov.in</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Missing Requirements */}
      {missingItems.length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                {missingItems.length}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Missing Requirements</h2>
                <p className="text-[11px] text-slate-500">Action needed to reach 100% readiness</p>
              </div>
            </div>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="space-y-3">
            {missingItems.map((item) => {
              const req = item.requirement;
              const isExpanded = expandedGuidance[req.id];

              return (
                <div
                  key={req.id}
                  className="border border-amber-200/90 bg-amber-50/20 rounded-2xl p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                        <XCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900">{req.label}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                            Missing
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Type: {req.requirement_type.replace(/_/g, " ")} {req.notes ? `• Expected: ${req.notes}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => toggleGuidance(req.id)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>How to get</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <button
                        onClick={() => setSelectedReqForResolve(req)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && req.guidance_text && (
                    <div className="mt-3 pt-3 border-t border-amber-200/60 bg-white rounded-xl p-3.5 text-xs text-slate-700 animate-in fade-in">
                      <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Official Guidance & Obtaining Instructions:</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-line">
                        {req.guidance_text}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Satisfied Requirements */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            {satisfiedItems.length}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Satisfied Requirements</h2>
            <p className="text-[11px] text-slate-500">Verified by your profile fields and vault documents</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {satisfiedItems.map((item) => {
            const req = item.requirement;
            return (
              <div
                key={req.id}
                className="flex items-center justify-between p-3.5 bg-slate-50/60 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{req.label}</h3>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      {item.satisfiedByDocument && (
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-100">
                          Source: {item.satisfiedByDocument.original_filename || item.satisfiedByDocument.document_type}
                        </span>
                      )}
                      {item.satisfiedByProfileField && (
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-md border border-indigo-100">
                          Source: Profile ({item.satisfiedByProfileField.field_name})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Satisfied ✓
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manually Resolved */}
      {resolvedItems.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              {resolvedItems.length}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manually Resolved Requirements</h2>
              <p className="text-[11px] text-slate-500">Locked manual overrides with custom notes</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {resolvedItems.map((item) => {
              const req = item.requirement;
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 bg-blue-50/30 border border-blue-100 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{req.label}</h3>
                      {item.resolvedNote && (
                        <p className="text-[11px] text-slate-600 mt-0.5 italic">
                          Note: &ldquo;{item.resolvedNote}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      Manual Override
                    </span>
                    <button
                      onClick={() => unmarkRequirementResolved(req.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Revert to automatic check"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Resolve Dialog */}
      {selectedReqForResolve && (
        <ManualResolveModal
          requirement={selectedReqForResolve}
          isOpen={!!selectedReqForResolve}
          onClose={() => setSelectedReqForResolve(null)}
        />
      )}

      {/* Upload Modal */}
      {isUploadOpen && <UploadDocumentModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />}

      {/* Browser Agent In-App Modal */}
      {isAgentOpen && (
        <BrowserAgentModal
          isOpen={isAgentOpen}
          onClose={() => setIsAgentOpen(false)}
          serviceName={service.name}
          portalUrl={service.official_url}
          portalDomain={service.official_domain}
        />
      )}
    </div>
  );
}
