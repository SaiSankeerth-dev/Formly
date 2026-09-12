import React from "react";
import Link from "next/link";
import { LotusLogo } from "@/components/ui/LotusLogo";
import { Headphones, ArrowLeft, Mail, MessageSquare } from "lucide-react";

export default function SupportPage() {
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
            <Headphones className="w-3.5 h-3.5" /> Help & Support Desk
          </div>
          <h1 className="text-3xl font-black tracking-tight">Citizen Help & Support</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Need assistance with your Seva Saarthi account, document formatting, or scheme checklist? Our support channels are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Email Support</h3>
            <p className="text-xs text-slate-500">
              For general citizen inquiries, account assistance, or bug reports:
            </p>
            <div className="text-sm font-bold text-[#2F27CE]">support@sevasaarthi.gov.in</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Virtual Assistant</h3>
            <p className="text-xs text-slate-500">
              Get immediate interactive application help directly inside the citizen portal:
            </p>
            <Link href="/login" className="inline-block text-sm font-bold text-[#2F27CE] hover:underline">
              Sign in to launch Seva Saarthi Assistant →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
