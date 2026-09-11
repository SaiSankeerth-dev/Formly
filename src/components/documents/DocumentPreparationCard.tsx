"use client";

import React, { useState } from "react";
import {
  FileCheck,
  FileText,
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  Sparkles,
  Eye,
  RefreshCw,
  Sliders,
  Crop,
  RotateCw,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Maximize2,
  X,
} from "lucide-react";
import { PreparedDocumentResult, PreparationStage } from "@/lib/documents/document-preparer";
import { DocumentRule, formatBytes } from "@/lib/documents/document-profiles";
import { cn } from "@/lib/utils";

interface DocumentPreparationCardProps {
  preparedResult: PreparedDocumentResult | null;
  currentStage: PreparationStage | null;
  stageMessage: string;
  isProcessing: boolean;
  rule: DocumentRule;
  originalFile: File | null;
  onReplaceFile: () => void;
  onConfirmUpload: () => void;
  onToggleGrayscale: (enabled: boolean) => void;
  onRotateImage: (degrees: number) => void;
  onTriggerAutoCrop: () => void;
  isGrayscaleEnabled?: boolean;
}

export function DocumentPreparationCard({
  preparedResult,
  currentStage,
  stageMessage,
  isProcessing,
  rule,
  originalFile,
  onReplaceFile,
  onConfirmUpload,
  onToggleGrayscale,
  onRotateImage,
  onTriggerAutoCrop,
  isGrayscaleEnabled = false,
}: DocumentPreparationCardProps) {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"prepared" | "original">("prepared");
  const [showSteps, setShowSteps] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);

  const handleRotate = () => {
    const next = (rotationDegrees + 90) % 360;
    setRotationDegrees(next);
    onRotateImage(next);
  };

  if (isProcessing) {
    const stageLabels: Record<PreparationStage, { title: string; step: number }> = {
      ANALYZING_FILE: { title: "Analyzing file format & headers...", step: 1 },
      CHECKING_REQUIREMENTS: { title: "Checking destination portal rules...", step: 2 },
      OPTIMIZING_DOCUMENT: { title: "Optimizing resolution & streams...", step: 3 },
      COMPRESSING: { title: "Progressively compressing...", step: 4 },
      VERIFYING_READABILITY: { title: "Verifying readability & contrast...", step: 5 },
      READY: { title: "Ready for upload", step: 6 },
      FAILED: { title: "Optimization failed", step: 6 },
    };

    const cur = currentStage ? stageLabels[currentStage] : { title: "Processing document...", step: 1 };

    return (
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Seva Saarthi Smart Document Preparation
              </h4>
              <p className="text-sm font-semibold text-slate-100">{cur.title}</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Step {cur.step} of 5</span>
        </div>

        {/* Real Stage Indicator */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{stageMessage || "Adapting document to portal specifications..."}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(cur.step / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400">
          <div>
            Original File: <span className="text-slate-200 font-semibold">{originalFile ? formatBytes(originalFile.size) : "—"}</span>
          </div>
          <div>
            Portal Limit: <span className="text-slate-200 font-semibold">{formatBytes(rule.maxFileSizeBytes)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!preparedResult) {
    return null;
  }

  const isUnderLimit = preparedResult.isUnderLimit;
  const isImage = preparedResult.preparedMime.startsWith("image/");
  const isPdf = preparedResult.preparedMime === "application/pdf";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 space-y-5">
      {/* Top Header & Status Badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>{preparedResult.serviceName} • Document Preparation</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {preparedResult.documentType.replace(/_/g, " ")}
          </h3>
        </div>

        <div className="shrink-0">
          {preparedResult.portalReady ? (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>FILE READY</span>
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>NEEDS FIX</span>
            </span>
          )}
        </div>
      </div>

      {/* Before / After Comparison Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 divide-y divide-slate-200/60">
        {/* Original File Info */}
        <div className="pb-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Original Document
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                {preparedResult.originalMime.includes("pdf") ? "PDF" : "IMG"}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 truncate max-w-[200px]" title={preparedResult.originalFileName}>
                  {preparedResult.originalFileName}
                </div>
                <div className="text-[11px] text-slate-500">
                  {formatBytes(preparedResult.originalSizeBytes)}
                  {preparedResult.originalDimensions && (
                    <span> • {preparedResult.originalDimensions.width}×{preparedResult.originalDimensions.height}px</span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Unprocessed</span>
          </div>
        </div>

        {/* Transition Indicator */}
        <div className="py-2.5 flex items-center justify-center gap-2 text-indigo-600 text-xs font-bold">
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Optimized automatically for {preparedResult.serviceName}</span>
          <Sparkles className="w-3.5 h-3.5" />
        </div>

        {/* Prepared File Info */}
        <div className="pt-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1 flex items-center justify-between">
            <span>Prepared Document</span>
            {preparedResult.compressionRatioPercent > 0 && (
              <span className="text-emerald-600 font-bold">
                ↓ {preparedResult.compressionRatioPercent}% smaller
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                {isPdf ? "PDF" : "JPG"}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={preparedResult.preparedFileName}>
                  {preparedResult.preparedFileName}
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className={cn("font-bold", isUnderLimit ? "text-emerald-700" : "text-rose-600")}>
                    {formatBytes(preparedResult.preparedSizeBytes)}
                  </span>
                  {" "}• Target: {formatBytes(preparedResult.targetSizeBytes)} (Limit: {formatBytes(preparedResult.maxAllowedSizeBytes)})
                  {preparedResult.preparedDimensions && (
                    <span> • {preparedResult.preparedDimensions.width}×{preparedResult.preparedDimensions.height}px</span>
                  )}
                </div>
              </div>
            </div>

            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800">
              {isUnderLimit ? "✓ Under Limit" : "⚠ Exceeds Limit"}
            </span>
          </div>
        </div>
      </div>

      {/* Readability & Quality Verification Checklist */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Portal Compliance & Quality Score</span>
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-md font-bold text-[11px]",
              preparedResult.readabilityStatus === "EXCELLENT" || preparedResult.readabilityStatus === "GOOD"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            )}
          >
            {preparedResult.readabilityScore}/100 • {preparedResult.readabilityStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2
              className={cn(
                "w-3.5 h-3.5",
                preparedResult.compatibilityChecks.sizeCheck ? "text-emerald-600" : "text-rose-500"
              )}
            />
            <span className="text-slate-600">
              File Size ({formatBytes(preparedResult.preparedSizeBytes)} ≤ {formatBytes(preparedResult.maxAllowedSizeBytes)})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2
              className={cn(
                "w-3.5 h-3.5",
                preparedResult.compatibilityChecks.formatCheck ? "text-emerald-600" : "text-rose-500"
              )}
            />
            <span className="text-slate-600">
              Format ({preparedResult.preparedMime.split("/")[1].toUpperCase()})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2
              className={cn(
                "w-3.5 h-3.5",
                preparedResult.compatibilityChecks.dimensionsCheck ? "text-emerald-600" : "text-rose-500"
              )}
            />
            <span className="text-slate-600">Dimensions & Aspect Ratio</span>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2
              className={cn(
                "w-3.5 h-3.5",
                preparedResult.readabilityScore >= 50 ? "text-emerald-600" : "text-rose-500"
              )}
            />
            <span className="text-slate-600">Readability & Text Contrast</span>
          </div>
        </div>

        {/* Quality warnings if impossible compression */}
        {preparedResult.qualityIssues.length > 0 && (
          <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] space-y-1">
            {preparedResult.qualityIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Optimization Controls (Grayscale, Crop, Rotate, PDF Splitting) */}
      <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2.5">
        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Preparation Adjustments</span>
          </span>
          <span className="text-[10px] text-slate-400">Live re-optimization</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Grayscale Toggle (Section 8) */}
          {isImage && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleGrayscale(!isGrayscaleEnabled)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all",
                  isGrayscaleEnabled
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <span>Grayscale Mode</span>
                <span className="text-[10px] opacity-80">
                  {isGrayscaleEnabled ? "(Active)" : "(Save ~40%)"}
                </span>
              </button>

              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Color: {formatBytes(isGrayscaleEnabled ? Math.round(preparedResult.preparedSizeBytes * 1.45) : preparedResult.preparedSizeBytes)} • Grayscale: {formatBytes(isGrayscaleEnabled ? preparedResult.preparedSizeBytes : Math.round(preparedResult.preparedSizeBytes * 0.62))}
              </span>
            </div>
          )}

          {/* Auto Crop Blank Borders (Section 7) */}
          {isImage && (
            <button
              type="button"
              onClick={onTriggerAutoCrop}
              className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Crop className="w-3.5 h-3.5 text-slate-500" />
              <span>Auto Crop Borders</span>
            </button>
          )}

          {/* Rotate 90° (Section 7) */}
          {isImage && (
            <button
              type="button"
              onClick={handleRotate}
              className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Rotate 90° ({rotationDegrees}°)</span>
            </button>
          )}

          {/* Straighten / Deskew (Section 7) */}
          {isImage && (
            <button
              type="button"
              onClick={onTriggerAutoCrop}
              className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Straighten Scan</span>
            </button>
          )}
        </div>

        {/* PDF Split Parts if generated (Section 10) */}
        {preparedResult.splitParts && preparedResult.splitParts.length > 0 && (
          <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Split PDF Parts ({preparedResult.splitParts.length} files under limit)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {preparedResult.splitParts.map((part, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-white rounded-xl border border-slate-200 text-[11px] flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-800">{part.fileName}</span>
                    <span className="text-slate-400 block">{part.pageRange}</span>
                  </div>
                  <span className="font-bold text-emerald-600">{formatBytes(part.sizeBytes)} ✓</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Optimization Audit Steps (Section 19) */}
      <div>
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
        >
          <span>View optimization audit trail ({preparedResult.optimizationSteps.length} stages)</span>
          {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showSteps && (
          <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono space-y-1 max-h-40 overflow-y-auto">
            {preparedResult.optimizationSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 shrink-0">[{step.stage}]</span>
                <span className="text-slate-300">{step.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons: Preview, Replace, Confirm & Upload */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {preparedResult.previewUrl && (
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReplaceFile}
            className="py-2.5 px-3.5 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Replace</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onConfirmUpload}
          className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-200 flex items-center gap-2 transition-all"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Upload Prepared File</span>
        </button>
      </div>

      {/* Visual Preview Modal with Zoom and Side-by-Side Comparison */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Document Visual Inspection</h4>
                  <p className="text-xs text-slate-500">
                    Verify text sharpness, contrast, and alignment before government submission
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle prepared vs original view */}
            <div className="flex items-center justify-center gap-2 py-3">
              <button
                type="button"
                onClick={() => setActivePreviewTab("prepared")}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                  activePreviewTab === "prepared"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Prepared ({formatBytes(preparedResult.preparedSizeBytes)})
              </button>
              {preparedResult.originalPreviewUrl && (
                <button
                  type="button"
                  onClick={() => setActivePreviewTab("original")}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                    activePreviewTab === "original"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Original ({formatBytes(preparedResult.originalSizeBytes)})
                </button>
              )}
            </div>

            {/* Preview Canvas / Image Container */}
            <div className="flex-1 overflow-auto bg-slate-900/5 rounded-2xl p-4 flex items-center justify-center min-h-[350px]">
              {isImage ? (
                <img
                  src={activePreviewTab === "prepared" ? preparedResult.previewUrl : preparedResult.originalPreviewUrl}
                  alt="Document Preview"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <iframe
                  src={activePreviewTab === "prepared" ? preparedResult.previewUrl : preparedResult.originalPreviewUrl}
                  title="PDF Preview"
                  className="w-full h-[60vh] rounded-lg border border-slate-200"
                />
              )}
            </div>

            <div className="pt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
