"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  GraduationCap,
  Home,
  Wallet,
  CreditCard,
  Landmark,
  ExternalLink,
  Sparkles,
  Bot,
  Monitor,
  Bookmark,
  Copy,
  Check,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DiscoverPage() {
  const { services, checklistSummary } = useSevaSaarthi();
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  const bookmarkletCode = `javascript:(function(){const s=document.createElement('script');s.src='http://localhost:3000/extension-inject.js';document.body.appendChild(s);const b=document.createElement('button');b.innerText='🤖 Autofilling Seva Saarthi...';b.style.cssText='position:fixed;bottom:24px;right:24px;z-index:99999999;background:#4f46e5;color:white;padding:12px 20px;font-size:14px;font-weight:bold;border-radius:9999px;border:2px solid white;box-shadow:0 10px 25px rgba(0,0,0,0.4);cursor:pointer;';document.body.appendChild(b);let f={fn:'Rahul',ln:'Kumar',dob:'15/08/2001',mob:'9876543210',em:'rahul@example.com'};document.querySelectorAll('input,select').forEach(i=>{let n=(i.name||i.id||'').toLowerCase();if(n.includes('last'))i.value=f.ln;if(n.includes('first'))i.value=f.fn;if(n.includes('dob')||n.includes('birth'))i.value=f.dob;if(n.includes('mobile')||n.includes('phone'))i.value=f.mob;if(n.includes('email'))i.value=f.em;if(i.type==='checkbox')i.checked=true;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));i.style.border='2px solid #10b981';});b.innerText='✓ Fields Filled! Solve Captcha & Submit';b.style.background='#10b981';})();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    toast.success("Bookmarklet code copied! Paste it into a new bookmark's URL.");
    setTimeout(() => setCopiedBookmarklet(false), 3000);
  };

  const launchPanAgent = async () => {
    toast.info("Launching Playwright Chrome on Protean PAN Card Portal...");
    try {
      const res = await fetch("/api/agent/launch-headed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalUrl: "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      }
    } catch {
      toast.error("Failed to launch browser window.");
    }
  };

  const catalog = [
    {
      id: "s004",
      title: "Instant PAN Card Application (Protean / NSDL Form 49A)",
      category: "Identity & Tax",
      matchScore: "95% Ready",
      matchType: "Ready to Apply",
      description: "Paperless PAN card issuance through Protean eGov TIN Portal (Form 49A). Automatically fills Name, DOB, Contact, and Category.",
      portal: "onlineservices.proteantech.in",
      url: "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
      icon: CreditCard,
      iconBg: "bg-blue-50 text-blue-600",
      docRequirements: "Aadhaar Card + Mobile OTP",
      isLivePan: true,
    },
    {
      id: "s001",
      title: "Post-Matric Scholarship for Higher Education",
      category: "Higher Education & Scholarships",
      matchScore: `${checklistSummary.percentageComplete}% Match`,
      matchType: "High Match",
      description: "Financial assistance for tuition fees, maintenance allowance, and study grants in colleges and universities.",
      portal: "scholarships.gov.in",
      url: "https://scholarships.gov.in",
      icon: GraduationCap,
      iconBg: "bg-indigo-50 text-indigo-600",
      docRequirements: "Aadhaar, Income (< ₹2.5L), Bonafide, Marksheet, Passbook",
    },
    {
      id: "s002",
      title: "Housing Subsidy Scheme (PMAY-U)",
      category: "Housing & Urban Affairs",
      matchScore: "87% Match",
      matchType: "Eligible",
      description: "Interest subsidy of up to 6.5% for first-time home buyers in urban municipal areas for EWS/LIG families.",
      portal: "pmaymis.gov.in",
      url: "https://pmaymis.gov.in",
      icon: Home,
      iconBg: "bg-emerald-50 text-emerald-600",
      docRequirements: "Aadhaar, Income Certificate, Property Documents",
    },
    {
      id: "s003",
      title: "Student Support Scheme & Laptop Grant",
      category: "Student Welfare",
      matchScore: "90% Match",
      matchType: "Eligible",
      description: "One-time digital empowerment grant of ₹20,000 for undergraduate engineering and science students.",
      portal: "education.gov.in",
      url: "https://education.gov.in/schemes",
      icon: Wallet,
      iconBg: "bg-amber-50 text-amber-600",
      docRequirements: "College ID, Semester Marksheet, Aadhaar",
    },
  ];

  const categories = ["ALL", "Identity & Tax", "Higher Education & Scholarships", "Housing & Urban Affairs", "Student Welfare"];

  const filteredSchemes = catalog.filter((s) => {
    if (selectedCategory !== "ALL" && s.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Government Schemes & Portal Autofill</h1>
          </div>
          <p className="text-xs text-slate-500">
            Seva Saarthi matches verified profile attributes and executes autonomous autofill directly on official government portals.
          </p>
        </div>
      </div>

      {/* 🚀 Quick Bookmarklet / Extension Guide Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-indigo-500/30 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-full border border-indigo-400/30">
                ⚡ 1-Click Browser Autofill
              </span>
            </div>
            <h2 className="text-base font-bold text-white">
              Autofill ANY Real Government Portal (Protean PAN, Scholarships, MeeSeva)
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Use our Chrome Extension or 1-Click Bookmarklet to instantly autofill forms while browsing real portals on <strong>onlineservices.proteantech.in</strong> or <strong>scholarships.gov.in</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={copyBookmarklet}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-102"
            >
              {copiedBookmarklet ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedBookmarklet ? "Copied!" : "Copy 1-Click Bookmarklet"}</span>
            </button>

            <button
              onClick={launchPanAgent}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-102"
            >
              <Monitor className="w-4 h-4" />
              <span>Launch Desktop Chrome (PAN Card)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {cat === "ALL" ? "All Schemes" : cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search portals & schemes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-60 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        />
      </div>

      {/* Grid of Schemes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSchemes.map((scheme) => {
          const Icon = scheme.icon;
          return (
            <div
              key={scheme.id}
              className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Badge & Icon */}
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", scheme.iconBg)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {scheme.matchScore}
                  </span>
                </div>

                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                  {scheme.category}
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2">{scheme.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{scheme.description}</p>

                {/* Key Requirements */}
                <div className="bg-slate-50 rounded-xl p-3 mb-4 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">Needed: </span>
                  {scheme.docRequirements}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                {scheme.isLivePan ? (
                  <button
                    onClick={launchPanAgent}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold text-center shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Run Agent on Protean</span>
                  </button>
                ) : (
                  <Link
                    href="/checklist"
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold text-center shadow-xs transition-colors"
                  >
                    View Readiness
                  </Link>
                )}

                <a
                  href={scheme.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-colors shrink-0"
                  title="Visit official portal"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
