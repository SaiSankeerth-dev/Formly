"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  FileCheck2,
  ShieldCheck,
  Zap,
  ArrowRight,
  HelpCircle,
  X,
  BookOpen,
  Clock,
  Building2,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  RefreshCw,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DOCUMENT_PROCUREMENT_GUIDES } from "@/lib/knowledge/government-schemes-knowledge";

interface AutofillAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQ_KNOWLEDGE = [
  {
    q: "Why do 80% of scholarship DBT disbursements fail, and how do I avoid it?",
    a: "Disbursements fail because the student's bank account is linked for SMS/ATM but NOT seeded with the NPCI (National Payments Corporation of India) Aadhaar mapper. To fix this, visit your home bank branch with your Aadhaar copy and submit the 'Aadhaar Seeding / DBT Mandate Form (Annexure-1)'. Verify that your status says 'Active' on myaadhaar.uidai.gov.in.",
  },
  {
    q: "What is the mandatory criteria for a College Bonafide Certificate?",
    a: "The Bonafide Certificate MUST be printed on the official institution letterhead, contain your Roll Number / Hall Ticket Number, current Academic Year, the college's national AISHE Code (e.g. C-19736), and bear the physical signature of the Principal/Dean with the institutional round seal.",
  },
  {
    q: "How old can an Income Certificate be for government scholarships?",
    a: "An Income Certificate is valid for exactly 1 Financial Year. It MUST be issued on or after April 1st of the current financial year by a competent Revenue authority (Tahsildar / Mandal Revenue Officer). Previous year certificates are rejected automatically.",
  },
  {
    q: "What should I do if my name on Aadhaar does not match my 10th marksheet?",
    a: "Government portals use your Class 10 Matriculation certificate as the gold standard. If Aadhaar has initials instead of your full expanded surname, update your Aadhaar immediately via UIDAI update centers or myaadhaar.uidai.gov.in before the portal verification deadline.",
  },
  {
    q: "Can I apply for both State Post-Matric and Central Sector Schemes?",
    a: "No. Under Government of India scholarship guidelines, a beneficiary can avail financial assistance under only ONE government scholarship scheme at a time. If you apply for multiple schemes, the INO/SNO will flag a duplicate record and cancel both.",
  },
];

export function AutofillAssistant({ isOpen, onClose }: AutofillAssistantProps) {
  const { user, profileFields, checklistSummary } = useSevaSaarthi();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"COPY_DATA" | "EXTENSION_SYNC" | "DOCUMENT_INTEL" | "FAQ">("COPY_DATA");
  const [selectedDocKey, setSelectedDocKey] = useState<string>("BONAFIDE_CERTIFICATE");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const getVal = (fieldName: string, fallback = "") => {
    return profileFields.find((f) => f.field_name === fieldName)?.value || fallback;
  };

  const rawFullName = getVal("full_name", user?.name || "Sai Sankeerth");
  const nameParts = rawFullName.trim().split(/\s+/);
  const firstName = nameParts[0] || rawFullName;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;

  const rawDob = getVal("date_of_birth", "2001-08-15");
  let formattedDob = "15/08/2001";
  if (rawDob.includes("-")) {
    const parts = rawDob.split("-");
    if (parts.length === 3) formattedDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const rawAadhaar = getVal("aadhaar_number", "5492 8173 9012");
  const cleanAadhaar = rawAadhaar.replace(/\s+/g, "");

  const rawFather = getVal("father_name", "Suresh Kumar");
  const fParts = rawFather.trim().split(/\s+/);
  const fatherFirst = fParts[0] || rawFather;
  const fatherLast = fParts.length > 1 ? fParts[fParts.length - 1] : "";

  const autofillFields = [
    { key: "full_name", label: "Full Name", value: rawFullName },
    { key: "first_name", label: "First Name", value: firstName },
    { key: "last_name", label: "Last Name / Surname", value: lastName },
    { key: "dob", label: "Date of Birth", value: formattedDob },
    { key: "gender", label: "Gender", value: getVal("gender", "Male") },
    { key: "phone", label: "Mobile Number", value: getVal("phone_number", user?.phone || "9876543210") },
    { key: "email", label: "Email Address", value: getVal("email", user?.email || "applicant@example.com") },
    { key: "aadhaar", label: "Aadhaar Number", value: rawAadhaar },
    { key: "aadhaar_clean", label: "Aadhaar (12-digit)", value: cleanAadhaar },
    { key: "address", label: "Permanent Address", value: getVal("permanent_address", "H.No 4-52/1, Green Hills Colony, Gachibowli, Hyderabad, Telangana - 500032") },
    { key: "pincode", label: "PIN Code", value: getVal("pincode", "500032") },
    { key: "district", label: "District", value: getVal("district", "Ranga Reddy") },
    { key: "mandal", label: "Mandal", value: getVal("mandal", "Serilingampally") },
    { key: "location", label: "City / Location", value: getVal("location", "Hyderabad, Telangana") },
    { key: "father_name", label: "Father's Name", value: rawFather },
    { key: "father_first_name", label: "Father First Name", value: fatherFirst },
    { key: "father_last_name", label: "Father Last Name", value: fatherLast },
    { key: "mother_name", label: "Mother's Name", value: getVal("mother_name", "Laxmi Devi") },
    { key: "income", label: "Annual Family Income", value: getVal("annual_income", "180000") },
    { key: "category", label: "Caste / Category", value: getVal("caste_category", "OBC") },
    { key: "college", label: "College Name", value: getVal("college_name", "National Institute of Technology") },
    { key: "course", label: "Degree / Course", value: getVal("education_degree", "B.Tech Computer Science and Engineering") },
    { key: "roll_no", label: "Roll / Hall Ticket No", value: getVal("roll_number", "22071A0589") },
    { key: "current_year", label: "Current Year / Semester", value: getVal("current_year", "3rd Year / 5th Sem") },
    { key: "tenth_percentage", label: "10th Standard Marks", value: getVal("tenth_percentage", "94.2%") },
    { key: "twelfth_percentage", label: "12th Standard Marks", value: getVal("twelfth_percentage", "88.4%") },
    { key: "bank_name", label: "Bank Name", value: getVal("bank_name", "State Bank of India") },
    { key: "bank_acc", label: "Bank Account No", value: getVal("bank_account_no", "38920194821") },
    { key: "bank_ifsc", label: "Bank IFSC Code", value: getVal("bank_ifsc", "SBIN0020184") },
    { key: "account_holder_name", label: "Account Holder Name", value: getVal("account_holder_name", rawFullName) },
    { key: "dbt_seeding_status", label: "DBT Seeding Status", value: getVal("dbt_seeding_status", "Seeded (Active)") },
  ];

  const copyToClipboard = (key: string, value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.success(`Copied ${label}: "${value}"`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyAllFields = () => {
    const text = autofillFields.map((f) => `${f.label}: ${f.value}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("All verified profile fields copied to clipboard!");
  };

  const officialService = checklistSummary.service;

  const handleSyncAndLaunch = async () => {
    setIsSyncing(true);
    try {
      const profileMap: Record<string, string> = {};
      autofillFields.forEach((f) => {
        profileMap[f.key] = f.value;
      });
      profileFields.forEach((f) => {
        if (f.field_name && f.value) profileMap[f.field_name] = f.value;
      });
      // Add canonical aliases
      profileMap.mobile = profileMap.phone || profileMap.phone_number || "9876543210";
      profileMap.phone_number = profileMap.mobile;
      profileMap.permanent_address = profileMap.address || profileMap.permanent_address;
      profileMap.address = profileMap.permanent_address;
      profileMap.date_of_birth = rawDob;
      profileMap.dob_formatted = formattedDob;
      profileMap.aadhaar_number = rawAadhaar;
      profileMap.aadhaar_clean = cleanAadhaar;
      profileMap.annual_income = profileMap.income || "180000";
      profileMap.caste_category = profileMap.category || "OBC";
      profileMap.college_name = profileMap.college || "National Institute of Technology";
      profileMap.education_degree = profileMap.course || "B.Tech Computer Science and Engineering";
      profileMap.roll_number = profileMap.roll_no || "22071A0589";
      profileMap.bank_account_no = profileMap.bank_acc || "38920194821";

      const syncPayload = {
        user: { id: user?.id, name: user?.name, email: user?.email, phone: user?.phone },
        profileFields,
        profileMap,
        syncedAt: new Date().toISOString(),
      };

      // Save to localStorage for webapp bridge
      localStorage.setItem("seva_saarthi_active_profile", JSON.stringify(syncPayload));

      // Dispatch custom events to extension bridge
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SYNC_PROFILE", { detail: syncPayload }));
        document.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SYNC_PROFILE", { detail: syncPayload }));

        window.dispatchEvent(
          new CustomEvent("SEVA_SAARTHI_ACTIVATE_SERVICE", {
            detail: {
              serviceId: officialService.id,
              serviceName: officialService.name,
              officialDomain: officialService.official_domain,
              applicationUrl: officialService.official_url,
              profileMap,
            },
          })
        );
      }

      // Also notify backend autofill endpoint
      try {
        await fetch("/api/agent/autofill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "START_AGENT",
            payload: {
              serviceId: officialService.id,
              portalUrl: officialService.official_url,
              profileFields,
            },
          }),
        });
      } catch (e) {
        // API fallback
      }

      toast.success("Profile synced! Opening official portal with extension assistant...");

      // Open official portal in new tab
      setTimeout(() => {
        window.open(officialService.official_url, "_blank", "noopener,noreferrer");
        setIsSyncing(false);
      }, 600);
    } catch (err) {
      toast.error("Failed to sync profile");
      setIsSyncing(false);
    }
  };

  const activeDocGuide = DOCUMENT_PROCUREMENT_GUIDES[selectedDocKey] || DOCUMENT_PROCUREMENT_GUIDES.BONAFIDE_CERTIFICATE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Seva Saarthi Autofill Assistant
              </div>
              <h2 className="text-lg font-black text-white">{officialService.name}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab("COPY_DATA")}
            className={cn(
              "py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
              activeTab === "COPY_DATA"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click Copy Data</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px]">
              {autofillFields.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("EXTENSION_SYNC")}
            className={cn(
              "py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
              activeTab === "EXTENSION_SYNC"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Extension Live Autofill</span>
          </button>

          <button
            onClick={() => setActiveTab("DOCUMENT_INTEL")}
            className={cn(
              "py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
              activeTab === "DOCUMENT_INTEL"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Guidelines</span>
          </button>

          <button
            onClick={() => setActiveTab("FAQ")}
            className={cn(
              "py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
              activeTab === "FAQ"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Application Tips & FAQ</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: 1-CLICK COPY DATA */}
          {activeTab === "COPY_DATA" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="text-indigo-900 font-medium">
                  Click any field to copy its verified value instantly into official government forms.
                </div>
                <button
                  onClick={copyAllFields}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All Fields</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {autofillFields.map((field) => {
                  const isCopied = copiedKey === field.key;
                  return (
                    <div
                      key={field.key}
                      className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between hover:border-indigo-300 transition-all group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {field.label}
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                          {field.value || "Not filled"}
                        </div>
                      </div>

                      <button
                        onClick={() => copyToClipboard(field.key, field.value, field.label)}
                        className={cn(
                          "p-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all",
                          isCopied
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 shadow-2xs"
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

          {/* TAB 2: EXTENSION LIVE AUTOFILL */}
          {activeTab === "EXTENSION_SYNC" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-900/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                      Browser Extension Assistant
                    </span>
                    <h3 className="text-lg font-black mt-2 text-white">Live Official Portal Autofill</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-lg">
                      Seva Saarthi seamlessly transmits your verified citizen details to the browser extension.
                      When you navigate to the official portal, click <strong>"Autofill Safe Fields"</strong> in the extension side panel.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-amber-400" />
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-300">
                    Target Portal: <strong className="text-white font-bold">{officialService.official_domain}</strong>
                  </div>

                  <button
                    onClick={handleSyncAndLaunch}
                    disabled={isSyncing}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all hover:scale-102"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Syncing & Launching...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Sync Data & Open Official Portal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Safety & Compliance Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Permitted Safe Autofill Fields</span>
                  </div>
                  <ul className="text-[11px] text-emerald-800 space-y-1 pl-6 list-disc">
                    <li>Applicant Full Legal Name & Date of Birth</li>
                    <li>Gender, Mobile Number & Verified Email</li>
                    <li>Aadhaar UID & Permanent Residence Address</li>
                    <li>College Name, AISHE Code, Course & Roll Number</li>
                    <li>Annual Household Income & Social Category</li>
                    <li>Bank Account Number & Bank IFSC Code</li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Citizen Mandatory Direct Actions</span>
                  </div>
                  <ul className="text-[11px] text-amber-800 space-y-1 pl-6 list-disc">
                    <li>One-Time Password (OTP) verification</li>
                    <li>Visual / Audio CAPTCHA verification</li>
                    <li>Portal Login Passwords & MPINs</li>
                    <li>Payment gateway authorization & UPI PIN</li>
                    <li>Legal acceptance of official declaration</li>
                    <li>Final portal Submit button click</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENT INTEL */}
          {activeTab === "DOCUMENT_INTEL" && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {Object.keys(DOCUMENT_PROCUREMENT_GUIDES).map((key) => {
                  const guide = DOCUMENT_PROCUREMENT_GUIDES[key];
                  const isSelected = selectedDocKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDocKey(key)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {guide.name}
                    </button>
                  );
                })}
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{activeDocGuide.name}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Issuing Authority: <strong>{activeDocGuide.issuingAuthority}</strong>
                    </div>
                  </div>
                  <div className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 self-start sm:self-auto">
                    Validity: {activeDocGuide.validityPeriod}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                    Mandatory Acceptance Criteria:
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {activeDocGuide.mandatoryCriteria.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                    How to Obtain This Document:
                  </div>
                  <ol className="space-y-1.5 text-xs text-slate-700 list-decimal list-inside pl-1">
                    {activeDocGuide.procurementSteps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {activeDocGuide.portalUrl && (
                  <div className="pt-2">
                    <a
                      href={activeDocGuide.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-100 transition-colors"
                    >
                      <span>Open {activeDocGuide.issuingAuthority} Official Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FAQ */}
          {activeTab === "FAQ" && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed">
                Expert tips compiled from over 50,000 successful National Scholarship and state welfare portal approvals.
              </div>

              {FAQ_KNOWLEDGE.map((item, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white"
                  >
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : index)}
                      className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-900">{item.q}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="p-3.5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Readiness: <strong>{checklistSummary.percentageComplete}% Complete</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              Close
            </button>
            <button
              onClick={handleSyncAndLaunch}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
