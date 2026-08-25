"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileCheck, FileWarning, FileQuestion, UploadCloud } from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { UploadDocumentModal } from "@/components/vault/UploadDocumentModal";

export function DocumentVaultCard() {
  const { stats } = useSevaSaarthi();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Document Vault</h2>
          <Link href="/vault" className="text-xs font-semibold text-indigo-600 hover:underline">
            View all
          </Link>
        </div>

        {/* Vault Stats Row & Upload Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mini Stat Badges */}
          <div className="flex items-center gap-2">
            {/* Verified */}
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/70 border border-emerald-100 rounded-xl">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-emerald-900">{stats.verifiedDocuments}</span>
                <span className="text-[10px] text-emerald-700 ml-1">Verified</span>
              </div>
            </div>

            {/* Expiring Soon */}
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/70 border border-amber-100 rounded-xl">
              <FileWarning className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-xs font-bold text-amber-900">{stats.expiringSoonDocuments}</span>
                <span className="text-[10px] text-amber-700 ml-1">Expiring Soon</span>
              </div>
            </div>

            {/* Missing */}
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50/70 border border-rose-100 rounded-xl">
              <FileQuestion className="w-4 h-4 text-rose-600" />
              <div>
                <span className="text-xs font-bold text-rose-900">{stats.missingDocuments}</span>
                <span className="text-[10px] text-rose-700 ml-1">Missing</span>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-600 border border-indigo-200/70 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ml-auto shadow-2xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadOpen && <UploadDocumentModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />}
    </>
  );
}
