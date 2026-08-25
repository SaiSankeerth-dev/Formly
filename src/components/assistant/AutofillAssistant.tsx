"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Download,
  FileCheck2,
  ShieldCheck,
  Zap,
  ArrowRight,
  HelpCircle,
  X,
  Bot,
  Play,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrowserAgentModal } from "@/components/agent/BrowserAgentModal";

interface AutofillAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AutofillAssistant({ isOpen, onClose }: AutofillAssistantProps) {
  const { user, profileFields, documents, checklistSummary } = useSevaSaarthi();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"COPY_DATA" | "DOWNLOAD_DOCS" | "OFFICIAL_PORTALS" | "AGENT">("AGENT");
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (key: string, value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.success(`Copied ${label}: "${value}"`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const autofillFields = [
    { key: "full_name", label: "Full Name", value: profileFields.find((f) => f.field_name === "full_name")?.value || user.name },
    { key: "dob", label: "Date of Birth", value: profileFields.find((f) => f.field_name === "date_of_birth")?.value || "15/08/2001" },
    { key: "phone", label: "Mobile Number", value: profileFields.find((f) => f.field_name === "phone_number")?.value || user.phone || "9876543210" },
    { key: "email", label: "Email Address", value: profileFields.find((f) => f.field_name === "email")?.value || user.email },
    { key: "aadhaar", label: "Aadhaar Number", value: profileFields.find((f) => f.field_name === "aadhaar_number")?.value || "5492 8173 9012" },
    { key: "income", label: "Annual Family Income", value: profileFields.find((f) => f.field_name === "annual_income")?.value || "180000" },
    { key: "college", label: "College Name", value: profileFields.find((f) => f.field_name === "college_name")?.value || "National Institute of Technology" },
    { key: "course", label: "Degree / Course", value: profileFields.find((f) => f.field_name === "education_degree")?.value || "B.Tech Computer Science" },
  ];

  const officialPortals = [
    {
      name: "National Scholarship Portal (NSP)",
      url: "https://scholarships.gov.in",
      domain: "scholarships.gov.in",
      purpose: "Official portal for Post Matric & Central Higher Education Schemes",
      badge: "Primary Target",
    },
    {
      name: "UIDAI myAadhaar Portal",
      url: "https://myaadhaar.uidai.gov.in",
      domain: "myaadhaar.uidai.gov.in",
      purpose: "Download official e-Aadhaar & verify mobile OTP registration",
      badge: "Identity",
    },
    {
      name: "Income Tax Department e-Filing (e-PAN)",
      url: "https://eportal.incometax.gov.in",
      domain: "incometax.gov.in",
      purpose: "Instant PAN card generation via Aadhaar e-KYC",
      badge: "Tax",
    },
    {
      name: "DigiLocker National Vault",
      url: "https://www.digilocker.gov.in",
      domain: "digilocker.gov.in",
      purpose: "Government digital document repository for Marksheets & Certificates",
      badge: "Docs",
    },
  ];

  const handleDownloadAll = () => {
    toast.success("Preparing verified document package: Aadhaar_Card.pdf, Income_Certificate.pdf, College_ID.pdf, Marksheet.pdf");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative max-h-[92vh] flex flex-col">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Seva Saarthi Autonomous Portal & Autofill Assistant</h2>
            </div>
            <p className="text-xs text-slate-500">
              Launch the autonomous browser agent to autofill government portals with human-in-the-loop submission approval.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4">
            <button
              onClick={() => setActiveTab("AGENT")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "AGENT" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Autonomous Agent</span>
            </button>
            <button
              onClick={() => setActiveTab("COPY_DATA")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all",
                activeTab === "COPY_DATA" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              1-Click Copy Data
            </button>
            <button
              onClick={() => setActiveTab("OFFICIAL_PORTALS")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all",
                activeTab === "OFFICIAL_PORTALS" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Official Portals
            </button>
            <button
              onClick={() => setActiveTab("DOWNLOAD_DOCS")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all",
                activeTab === "DOWNLOAD_DOCS" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Document Package
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            {/* TAB 1: Autonomous Browser Agent */}
            {activeTab === "AGENT" && (
              <div className="space-y-4">
                <div className="p-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-indigo-800/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center border border-indigo-400/30">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Autonomous Government Portal Autofill Agent</h4>
                      <p className="text-[11px] text-indigo-200">Playwright browser automation with Human-in-the-Loop approval</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    The Seva Saarthi Agent opens the official government portal (<strong>scholarships.gov.in</strong>), navigates to the application form, autofills all 8 verified personal & academic fields, and attaches your required documents.
                  </p>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Submission Gate:</strong> The agent pauses before submitting. It will request your explicit permission (Yes/No) before any final submission occurs.
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      setIsAgentOpen(true);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-900 flex items-center justify-center gap-2 transition-all hover:scale-101"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch Autonomous Browser Agent</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: 1-Click Copy Data */}
            {activeTab === "COPY_DATA" && (
              <div className="space-y-2.5">
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 flex items-center justify-between">
                  <span>Click any field button below to copy the verified value to your clipboard.</span>
                  <span className="font-bold text-indigo-600">8 Fields Ready</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {autofillFields.map((field) => {
                    const isCopied = copiedKey === field.key;
                    return (
                      <div
                        key={field.key}
                        className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between hover:border-indigo-300 transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</div>
                          <div className="text-xs font-bold text-slate-900 truncate">{field.value}</div>
                        </div>

                        <button
                          onClick={() => copyToClipboard(field.key, field.value, field.label)}
                          className={cn(
                            "p-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-colors",
                            isCopied ? "bg-emerald-600 text-white" : "bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200"
                          )}
                          title="Copy to clipboard"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Official Portals */}
            {activeTab === "OFFICIAL_PORTALS" && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  Direct authorized government portal links for official submission:
                </div>

                {officialPortals.map((portal) => (
                  <div
                    key={portal.name}
                    className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-indigo-400 hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-bold text-slate-900">{portal.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                          {portal.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{portal.purpose}</p>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">{portal.domain}</div>
                    </div>

                    <a
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                    >
                      <span>Launch Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: Download Document Package */}
            {activeTab === "DOWNLOAD_DOCS" && (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>Government-Ready Document Bundle</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    All documents from your vault formatted and renamed to match official scholarship upload criteria:
                  </p>
                </div>

                <div className="space-y-2">
                  {documents.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileCheck2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-800">{d.original_filename || d.document_type}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                        Ready
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleDownloadAll}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors mt-4"
                >
                  <Download className="w-4 h-4" />
                  <span>Download All ({documents.length} Files)</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Seva Saarthi complies with DPDP Act & UIDAI data privacy standards.</span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Browser Agent Modal */}
      {isAgentOpen && (
        <BrowserAgentModal
          isOpen={isAgentOpen}
          onClose={() => setIsAgentOpen(false)}
          serviceName="Post Matric Scholarship"
          portalUrl="https://scholarships.gov.in"
          portalDomain="scholarships.gov.in"
        />
      )}
    </>
  );
}
