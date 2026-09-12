import React from "react";
import Link from "next/link";
import { LotusLogo } from "@/components/ui/LotusLogo";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
            <FileText className="w-3.5 h-3.5" /> Terms of Service
          </div>
          <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            By accessing Seva Saarthi, you agree to use our application assistance capabilities in accordance with applicable laws and official government service guidelines.
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-slate-900 mb-2">1. Nature of Service</h2>
            <p>
              Seva Saarthi is an intelligent digital guidance assistant designed to facilitate the preparation of government applications. Seva Saarthi is not itself a statutory government authority or issuing agency.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-slate-900 mb-2">2. Accuracy of Submitted Data</h2>
            <p>
              Citizens are solely responsible for ensuring that all documents and personal details uploaded or confirmed during application preparation are authentic, accurate, and up to date.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-slate-900 mb-2">3. Official Processing & Decisions</h2>
            <p>
              All statutory approvals, rejections, processing timelines, and certificate issuances remain under the exclusive jurisdiction of the designated government departments and competent authorities.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
