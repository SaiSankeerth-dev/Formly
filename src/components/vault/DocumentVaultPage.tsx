"use client";

import React, { useState } from "react";
import {
  FolderOpen,
  UploadCloud,
  FileCheck,
  FileSearch,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  Eye,
  SlidersHorizontal,
  FolderPlus,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { DocumentRow, DocumentStatus } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { UploadDocumentModal } from "@/components/vault/UploadDocumentModal";
import { SmartPrepareModal } from "@/components/vault/SmartPrepareModal";
import { FieldConfirmationModal } from "@/components/vault/FieldConfirmationModal";
import { formatBytes } from "@/lib/documents/document-profiles";
import { toast } from "sonner";

export function DocumentVaultPage() {
  const { documents, extractedFields, deleteDocument, retryOcr } = useSevaSaarthi();
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [preparingDoc, setPreparingDoc] = useState<DocumentRow | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState<DocumentRow | null>(null);

  const categories = [
    { key: "ALL", label: "All Documents" },
    { key: "IDENTITY", label: "Identity" },
    { key: "CERTIFICATES", label: "Certificates" },
    { key: "EDUCATION", label: "Education" },
    { key: "ADDRESS", label: "Address" },
    { key: "INCOME", label: "Income" },
    { key: "PHOTO_SIGNATURE", label: "Photo & Signature" },
    { key: "OTHER", label: "Other" },
  ];

  // Match document type to category
  const getDocCategory = (docType: string): string => {
    const t = docType.toUpperCase();
    if (t.includes("AADHAAR") || t.includes("PAN") || t.includes("VOTER") || t.includes("PASSPORT")) return "IDENTITY";
    if (t.includes("CASTE") || t.includes("DOMICILE") || t.includes("BIRTH")) return "CERTIFICATES";
    if (t.includes("MARKSHEET") || t.includes("BONAFIDE") || t.includes("COLLEGE") || t.includes("DEGREE")) return "EDUCATION";
    if (t.includes("ADDRESS") || t.includes("ELECTRICITY") || t.includes("RENT")) return "ADDRESS";
    if (t.includes("INCOME") || t.includes("SALARY") || t.includes("FORM16")) return "INCOME";
    if (t.includes("PHOTO") || t.includes("SIGNATURE")) return "PHOTO_SIGNATURE";
    return "OTHER";
  };

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    if (activeCategory !== "ALL" && getDocCategory(doc.document_type) !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (doc.original_filename || "").toLowerCase().includes(q);
      const typeMatch = doc.document_type.toLowerCase().includes(q);
      return nameMatch || typeMatch;
    }
    return true;
  });

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "VERIFIED":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
          label: "Verified",
        };
      case "EXTRACTED":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: FileSearch,
          label: "Review Needed",
        };
      case "PROCESSING":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: RotateCw,
          label: "Processing",
          spin: true,
        };
      case "FAILED":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: AlertTriangle,
          label: "Failed",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          icon: Clock,
          label: "Ready",
        };
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Page Header matching Section 15 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#2F27CE] text-xs font-bold rounded-full mb-2">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Document Vault</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Your Documents
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Keep your important documents ready for government applications.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="py-2.5 px-5 bg-[#2F27CE] hover:bg-[#231CA8] active:scale-95 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Categories and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                activeCategory === cat.key
                  ? "bg-[#2F27CE] text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search documents by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F27CE]/20 focus:border-[#2F27CE]"
          />
        </div>
      </div>

      {/* Documents Grid or Empty State */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const badge = getStatusBadge(doc.status);
            const StatusIcon = badge.icon;
            const fileSize = doc.prepared_size_bytes || doc.original_size_bytes || 0;
            const isOptimized = Boolean(doc.prepared_size_bytes);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-100 hover:shadow-md transition-all space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center shrink-0 border border-indigo-100">
                      <FileText className="w-5 h-5 stroke-[2]" />
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                        badge.bg
                      )}
                    >
                      <StatusIcon className={cn("w-3 h-3", badge.spin && "animate-spin")} />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 truncate" title={doc.original_filename || undefined}>
                    {doc.original_filename || "Document"}
                  </h3>

                  <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                    <span className="font-semibold text-slate-700">{doc.document_type.replace(/_/g, " ")}</span>
                    <span>&bull;</span>
                    <span>{formatBytes(fileSize)}</span>
                    {isOptimized && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                        Optimized
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 mt-1">
                    Uploaded {formatDate(doc.created_at)}
                  </div>
                </div>

                {/* Actions: View, Prepare, Delete matching Section 15 */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setReviewingDoc(doc)}
                      className="p-2 text-slate-600 hover:text-[#2F27CE] hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="View document details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => setPreparingDoc(doc)}
                      className="p-2 text-[#2F27CE] hover:bg-indigo-50 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Prepare document to portal limits"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Prepare</span>
                    </button>
                  </div>

                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this document?")) {
                        await deleteDocument(doc.id);
                        toast.success("Document removed from vault");
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center mx-auto border border-indigo-100">
            <FolderPlus className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-900">
              No documents added yet.
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your Aadhaar card, income proof, or marksheet to have them automatically prepared for government applications.
            </p>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#2F27CE] hover:bg-[#231CA8] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      {/* Smart Document Preparation Modal */}
      <SmartPrepareModal
        document={preparingDoc}
        isOpen={Boolean(preparingDoc)}
        onClose={() => setPreparingDoc(null)}
      />

      {/* Field Review / View Modal */}
      {reviewingDoc && (
        <FieldConfirmationModal
          document={reviewingDoc}
          isOpen={Boolean(reviewingDoc)}
          onClose={() => setReviewingDoc(null)}
          onRetryOcr={async () => {
            await retryOcr(reviewingDoc.id);
            setReviewingDoc(null);
          }}
        />
      )}
    </div>
  );
}
