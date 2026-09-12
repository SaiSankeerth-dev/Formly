import React from "react";
import Link from "next/link";
import { LotusLogo } from "@/components/ui/LotusLogo";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFE] text-slate-900 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F27CE] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
          <div className="flex items-center gap-2.5">
            <LotusLogo className="w-7 h-7" />
            <span className="font-black text-slate-900 text-lg">Seva Saarthi</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-[#2F27CE] text-xs font-bold">
            <Shield className="w-3.5 h-3.5" /> Citizen Privacy Policy
          </div>
          <h1 className="text-3xl font-black tracking-tight">Privacy & Data Protection</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Seva Saarthi is built from the ground up on citizen-first privacy principles. We operate as an intelligent citizen assistant, never selling, brokering, or repurposing your personal identification data.
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-slate-900 mb-2">1. Information We Collect</h2>
            <p>
              We collect profile information you explicitly provide (such as your name, date of birth, contact details, and address) and documents uploaded to your vault strictly for government application preparation.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-slate-900 mb-2">2. How Information is Used</h2>
            <p>
              Your data is used solely to assess scheme readiness, autofill official application forms upon your instruction, and assist you in completing government service procedures.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-slate-900 mb-2">3. Data Security & Storage</h2>
            <p>
              Uploaded documents and extracted fields are protected using industry-standard access control, isolated multi-tenant schemas, and authenticated session tokens.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
