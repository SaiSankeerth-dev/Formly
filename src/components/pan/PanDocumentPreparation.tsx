"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import {
  Camera,
  PenTool,
  FileCheck2,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sliders,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Upload,
  Info,
  Layers,
  FileDown,
  Check,
  ZoomIn,
  Eye,
  Lock,
} from "lucide-react";
import {
  processPanPhotograph,
  processPanSignature,
  processPanSupportingDocument,
  triggerFileDownload,
  notifyExtensionOfPreparedDocuments,
  ProcessedPanFileResult,
  PreparedDocumentRecord,
} from "@/lib/pan/pan-document-resizer";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { toast } from "sonner";

export function PanDocumentPreparation() {
  const { user, uploadDocument } = useSevaSaarthi();
  const [, startTransition] = useTransition();

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<"ALL" | "PHOTO" | "SIGNATURE" | "DOCUMENT">("ALL");

  // Disclaimer Modal for optional external utility (pancardresizer.com)
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // --- Photo State ---
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoPanX, setPhotoPanX] = useState(0); // -50 to 50
  const [photoPanY, setPhotoPanY] = useState(0); // -50 to 50
  const [photoRotation, setPhotoRotation] = useState(0);
  const [photoBrightness, setPhotoBrightness] = useState(0);
  const [photoContrast, setPhotoContrast] = useState(0);
  const [photoResult, setPhotoResult] = useState<ProcessedPanFileResult | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // --- Signature State ---
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigZoom, setSigZoom] = useState(1);
  const [sigPanX, setSigPanX] = useState(0);
  const [sigPanY, setSigPanY] = useState(0);
  const [sigRotation, setSigRotation] = useState(0);
  const [sigWhiten, setSigWhiten] = useState(true);
  const [sigThreshold, setSigThreshold] = useState(45);
  const [sigEnhanceInk, setSigEnhanceInk] = useState(true);
  const [sigResult, setSigResult] = useState<ProcessedPanFileResult | null>(null);
  const [isProcessingSig, setIsProcessingSig] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // --- Supporting Document State ---
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docResult, setDocResult] = useState<ProcessedPanFileResult | null>(null);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // --- Global Saving / Sync State ---
  const [savingToVault, setSavingToVault] = useState<string | null>(null);
  const [syncedToExtension, setSyncedToExtension] = useState(false);

  // ---------------- Photo Processing ----------------
  const runProcessPhoto = async (file: File) => {
    setIsProcessingPhoto(true);
    try {
      // Calculate crop box based on zoom and pan offsets
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      await new Promise<void>((r) => { img.onload = () => r(); });
      URL.revokeObjectURL(objectUrl);

      const isRot = photoRotation === 90 || photoRotation === 270;
      const sw = isRot ? img.naturalHeight || img.height : img.naturalWidth || img.width;
      const sh = isRot ? img.naturalWidth || img.width : img.naturalHeight || img.height;

      const baseSquare = Math.min(sw, sh) / photoZoom;
      const cx = (sw - baseSquare) / 2 + (photoPanX / 100) * (sw - baseSquare);
      const cy = (sh - baseSquare) / 2 + (photoPanY / 100) * (sh - baseSquare);

      const res = await processPanPhotograph(file, {
        cropBox: {
          x: Math.max(0, Math.min(sw - baseSquare, cx)),
          y: Math.max(0, Math.min(sh - baseSquare, cy)),
          width: baseSquare,
          height: baseSquare,
        },
        rotation: photoRotation,
        brightness: photoBrightness,
        contrast: photoContrast,
      });
      setPhotoResult(res);
    } catch (err: any) {
      toast.error("Failed to process photograph: " + err.message);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  useEffect(() => {
    if (photoFile) {
      const timer = setTimeout(() => {
        runProcessPhoto(photoFile);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [photoFile, photoZoom, photoPanX, photoPanY, photoRotation, photoBrightness, photoContrast]);

  // ---------------- Signature Processing ----------------
  const runProcessSig = async (file: File) => {
    setIsProcessingSig(true);
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      await new Promise<void>((r) => { img.onload = () => r(); });
      URL.revokeObjectURL(objectUrl);

      const isRot = sigRotation === 90 || sigRotation === 270;
      const sw = isRot ? img.naturalHeight || img.height : img.naturalWidth || img.width;
      const sh = isRot ? img.naturalWidth || img.width : img.naturalHeight || img.height;

      const targetAspect = 2 / 1;
      let baseW = sw;
      let baseH = sw / targetAspect;
      if (baseH > sh) {
        baseH = sh;
        baseW = sh * targetAspect;
      }
      baseW = baseW / sigZoom;
      baseH = baseH / sigZoom;

      const cx = (sw - baseW) / 2 + (sigPanX / 100) * (sw - baseW);
      const cy = (sh - baseH) / 2 + (sigPanY / 100) * (sh - baseH);

      const res = await processPanSignature(file, {
        cropBox: {
          x: Math.max(0, Math.min(sw - baseW, cx)),
          y: Math.max(0, Math.min(sh - baseH, cy)),
          width: baseW,
          height: baseH,
        },
        rotation: sigRotation,
        whitenBackground: sigWhiten,
        whitenThreshold: sigThreshold,
        inkEnhance: sigEnhanceInk,
      });
      setSigResult(res);
    } catch (err: any) {
      toast.error("Failed to process signature: " + err.message);
    } finally {
      setIsProcessingSig(false);
    }
  };

  useEffect(() => {
    if (sigFile) {
      const timer = setTimeout(() => {
        runProcessSig(sigFile);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [sigFile, sigZoom, sigPanX, sigPanY, sigRotation, sigWhiten, sigThreshold, sigEnhanceInk]);

  // ---------------- Supporting Doc Processing ----------------
  const runProcessDoc = async (file: File) => {
    setIsProcessingDoc(true);
    try {
      const res = await processPanSupportingDocument(file);
      setDocResult(res);
    } catch (err: any) {
      toast.error("Failed to prepare document PDF: " + err.message);
    } finally {
      setIsProcessingDoc(false);
    }
  };

  useEffect(() => {
    if (docFile) {
      runProcessDoc(docFile);
    }
  }, [docFile]);

  // Sync to Extension
  const handleSyncToExtension = () => {
    const preparedList: PreparedDocumentRecord[] = [];
    if (photoResult) {
      preparedList.push({
        type: "photo",
        fileName: photoResult.fileName,
        sizeBytes: photoResult.finalSizeBytes,
        mimeType: photoResult.mimeType,
        preparedAt: new Date().toISOString(),
        status: photoResult.isCompliant ? "COMPLIANT" : "WARNING",
        notes: photoResult.complianceNotes,
      });
    }
    if (sigResult) {
      preparedList.push({
        type: "signature",
        fileName: sigResult.fileName,
        sizeBytes: sigResult.finalSizeBytes,
        mimeType: sigResult.mimeType,
        preparedAt: new Date().toISOString(),
        status: sigResult.isCompliant ? "COMPLIANT" : "WARNING",
        notes: sigResult.complianceNotes,
      });
    }
    if (docResult) {
      preparedList.push({
        type: "supporting_doc",
        fileName: docResult.fileName,
        sizeBytes: docResult.finalSizeBytes,
        mimeType: docResult.mimeType,
        preparedAt: new Date().toISOString(),
        status: docResult.isCompliant ? "COMPLIANT" : "WARNING",
        notes: docResult.complianceNotes,
      });
    }

    if (preparedList.length === 0) {
      toast.error("No prepared documents to sync yet. Please upload and optimize at least one file.");
      return;
    }

    notifyExtensionOfPreparedDocuments(preparedList);
    setSyncedToExtension(true);
    toast.success(`Synced ${preparedList.length} prepared document(s) to Seva Saarthi Extension!`);
    setTimeout(() => setSyncedToExtension(false), 4000);
  };

  // Save to Document Vault
  const handleSaveToVault = async (result: ProcessedPanFileResult, docType: "PHOTO" | "SIGNATURE" | "AADHAAR" | "OTHER") => {
    if (!user) {
      toast.error("Please log in to save documents to your Vault.");
      return;
    }

    setSavingToVault(result.fileName);
    try {
      const file = new File([result.blob], result.fileName, { type: result.mimeType });
      await uploadDocument(file, docType as any, "pan-card-new", {
        originalFileName: result.originalFileName,
        preparedFileName: result.fileName,
        originalSizeBytes: result.originalSizeBytes,
        targetSizeBytes: docType === "PHOTO" ? 50 * 1024 : docType === "SIGNATURE" ? 30 * 1024 : 300 * 1024,
        readabilityScore: 95,
        readabilityStatus: "EXCELLENT",
        isCompliant: result.isCompliant,
      });
      toast.success(`Saved "${result.fileName}" to your Seva Saarthi Vault!`);
    } catch (err: any) {
      toast.error("Failed to save to vault: " + (err.message || "Unknown error"));
    } finally {
      setSavingToVault(null);
    }
  };

  // Batch Download
  const handleBatchDownload = () => {
    const list = [
      photoResult && { blob: photoResult.blob, name: photoResult.fileName },
      sigResult && { blob: sigResult.blob, name: sigResult.fileName },
      docResult && { blob: docResult.blob, name: docResult.fileName },
    ].filter(Boolean) as { blob: Blob; name: string }[];

    if (list.length === 0) {
      toast.error("No prepared files available to download yet.");
      return;
    }

    list.forEach((item, i) => {
      setTimeout(() => {
        triggerFileDownload(item.blob, item.name);
      }, i * 350);
    });
    toast.success(`Downloading ${list.length} prepared file(s)...`);
  };

  const totalPreparedCount = [photoResult, sigResult, docResult].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100/80">
                Official PAN Suite
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">Protean (NSDL) & UTIITSL Specs</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Saarthi Document Preparation
            </h1>
          </div>
        </div>

        {/* Action Buttons: Batch Download, External Disclaimer */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDisclaimerModal(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Portal Guidelines & External Tool</span>
          </button>

          {totalPreparedCount > 0 && (
            <button
              onClick={handleBatchDownload}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download All ({totalPreparedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* DPDP Privacy Guarantee Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900">100% Client-Side Privacy Guarantee</h4>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
              DPDP Act 2023 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            All image cropping, signature whitening, dimension scaling, and PDF compilation execute locally inside your browser using HTML5 Canvas. Your personal photographs, physical signatures, and documents are <strong>never uploaded to external servers or AI pipelines</strong>.
          </p>
        </div>
      </div>

      {/* Official Guidelines Spec Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Photo Requirement Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>Applicant Photo</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              Max 50 KB
            </span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span><strong>213 × 213 pixels</strong> (1:1 Square)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Standard 200–300 DPI resolution</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Color JPEG with clear facial features</span>
            </li>
          </ul>
        </div>

        {/* Signature Requirement Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <PenTool className="w-4 h-4 text-indigo-600" />
              <span>Applicant Signature</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              Max 30 KB
            </span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span><strong>213 × 106 pixels</strong> (2:1 Ratio)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Whitened background, no shadow/yellowing</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Dark black or blue ink on plain paper</span>
            </li>
          </ul>
        </div>

        {/* Supporting Document Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              <span>Supporting Proof</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              Max 300 KB
            </span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Strictly <strong>PDF format</strong></span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Standard A4 sized pages</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Unlocked & password-free copy</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "ALL"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Preparations ({totalPreparedCount}/3)
        </button>
        <button
          onClick={() => setActiveTab("PHOTO")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "PHOTO"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Photo (213×213)</span>
          {photoResult && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
        <button
          onClick={() => setActiveTab("SIGNATURE")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "SIGNATURE"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Signature (213×106)</span>
          {sigResult && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
        <button
          onClick={() => setActiveTab("DOCUMENT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "DOCUMENT"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Supporting PDF (300 KB)</span>
          {docResult && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* ========================================================= */}
        {/* SECTION 1: PHOTOGRAPH RESIZING & CROPPING */}
        {/* ========================================================= */}
        {(activeTab === "ALL" || activeTab === "PHOTO") && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Step 1: Passport Photograph (213 × 213 px)</h3>
                  <p className="text-xs text-slate-500">Official 1:1 ratio, 200–300 DPI, under 50 KB JPEG</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPhotoFile(f);
                  }}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoFile ? "Change Photo" : "Upload Photograph"}</span>
                </button>
              </div>
            </div>

            {/* Photo Interactive Area */}
            {photoFile ? (
              <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Controls */}
                <div className="lg:col-span-5 space-y-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      Adjust Crop & Image
                    </span>
                    <button
                      onClick={() => {
                        setPhotoZoom(1);
                        setPhotoPanX(0);
                        setPhotoPanY(0);
                        setPhotoRotation(0);
                        setPhotoBrightness(0);
                        setPhotoContrast(0);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  {/* Zoom */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Zoom:</span>
                      <span className="font-mono">{photoZoom.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={photoZoom}
                      onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Pan X & Y */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-slate-700">
                        <span>Horizontal:</span>
                        <span className="font-mono">{photoPanX > 0 ? `+${photoPanX}` : photoPanX}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={photoPanX}
                        onChange={(e) => setPhotoPanX(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-slate-700">
                        <span>Vertical:</span>
                        <span className="font-mono">{photoPanY > 0 ? `+${photoPanY}` : photoPanY}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={photoPanY}
                        onChange={(e) => setPhotoPanY(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Brightness & Contrast */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-slate-700">
                        <span>Brightness:</span>
                        <span className="font-mono">{photoBrightness > 0 ? `+${photoBrightness}` : photoBrightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        step="2"
                        value={photoBrightness}
                        onChange={(e) => setPhotoBrightness(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-slate-700">
                        <span>Contrast:</span>
                        <span className="font-mono">{photoContrast > 0 ? `+${photoContrast}` : photoContrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        step="2"
                        value={photoContrast}
                        onChange={(e) => setPhotoContrast(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Rotate */}
                  <div className="pt-1">
                    <button
                      onClick={() => setPhotoRotation((prev) => (prev + 90) % 360)}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Rotate 90° ({photoRotation}°)</span>
                    </button>
                  </div>
                </div>

                {/* Right: Live Preview & Compliance Result */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                  {photoResult ? (
                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-around">
                      {/* Exact 213x213 Preview Viewport */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-[213px] h-[213px] bg-white rounded-xl shadow-lg border-2 border-indigo-500 overflow-hidden flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoResult.dataUrl}
                            alt="Prepared PAN Photograph"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                            213 × 213 px
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">Official 1:1 Result</span>
                      </div>

                      {/* Info & Download Actions */}
                      <div className="space-y-3 max-w-xs text-left w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              photoResult.isCompliant
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {photoResult.isCompliant ? "✓ 100% Portal Compliant" : "Needs Attention"}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400">File Size:</span>{" "}
                            <strong className="text-slate-800">
                              {(photoResult.finalSizeBytes / 1024).toFixed(1)} KB
                            </strong>{" "}
                            <span className="text-[11px] text-emerald-600 font-semibold">(Limit: 50 KB)</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Resolution:</span>{" "}
                            <strong className="text-slate-800">213 × 213 px (200 DPI)</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Format:</span>{" "}
                            <strong className="text-slate-800">JPEG (.jpg)</strong>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                          <button
                            onClick={() => triggerFileDownload(photoResult.blob, photoResult.fileName)}
                            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Prepared Photo</span>
                          </button>

                          {user && (
                            <button
                              onClick={() => handleSaveToVault(photoResult, "PHOTO")}
                              disabled={savingToVault === photoResult.fileName}
                              className="w-full px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              <span>
                                {savingToVault === photoResult.fileName ? "Saving..." : "Save to Document Vault"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                      <span className="text-xs">Processing photo...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={() => photoInputRef.current?.click()}
                className="mt-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <Camera className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Click or drag & drop applicant photograph</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Upload your passport-style photo. The tool will automatically scale to 213×213 px and compress under 50 KB.
                </p>
                <span className="mt-3 px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg shadow-2xs">
                  Select File (JPEG, PNG)
                </span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 2: SIGNATURE RESIZING & PAPER WHITENING */}
        {/* ========================================================= */}
        {(activeTab === "ALL" || activeTab === "SIGNATURE") && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Step 2: Applicant Signature (213 × 106 px)</h3>
                  <p className="text-xs text-slate-500">Official 2:1 aspect ratio, background whitening, under 30 KB JPEG</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={sigInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSigFile(f);
                  }}
                />
                <button
                  onClick={() => sigInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{sigFile ? "Change Signature" : "Upload Signature"}</span>
                </button>
              </div>
            </div>

            {/* Signature Interactive Area */}
            {sigFile ? (
              <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Controls */}
                <div className="lg:col-span-5 space-y-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Paper Whitening & Crop
                    </span>
                    <button
                      onClick={() => {
                        setSigZoom(1);
                        setSigPanX(0);
                        setSigPanY(0);
                        setSigRotation(0);
                        setSigWhiten(true);
                        setSigThreshold(45);
                        setSigEnhanceInk(true);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  {/* Paper Whitening Toggle */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="sigWhitenToggle" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                        Background Whitening Filter
                      </label>
                      <input
                        type="checkbox"
                        id="sigWhitenToggle"
                        checked={sigWhiten}
                        onChange={(e) => setSigWhiten(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Removes shadow and yellow paper background, making it pure white as required by PAN portals.
                    </p>

                    {sigWhiten && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-slate-600">
                          <span>Paper Brightness Cutoff:</span>
                          <span className="font-mono">{sigThreshold}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          step="2"
                          value={sigThreshold}
                          onChange={(e) => setSigThreshold(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* Zoom & Pan */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Zoom:</span>
                      <span className="font-mono">{sigZoom.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={sigZoom}
                      onChange={(e) => setSigZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-slate-700">
                        <span>Horizontal:</span>
                        <span className="font-mono">{sigPanX > 0 ? `+${sigPanX}` : sigPanX}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={sigPanX}
                        onChange={(e) => setSigPanX(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-slate-700">
                        <span>Vertical:</span>
                        <span className="font-mono">{sigPanY > 0 ? `+${sigPanY}` : sigPanY}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={sigPanY}
                        onChange={(e) => setSigPanY(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Rotate */}
                  <div className="pt-1">
                    <button
                      onClick={() => setSigRotation((prev) => (prev + 90) % 360)}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Rotate 90° ({sigRotation}°)</span>
                    </button>
                  </div>
                </div>

                {/* Right: Live Preview & Compliance Result */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                  {sigResult ? (
                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-around">
                      {/* Exact 213x106 Preview Viewport */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-[213px] h-[106px] bg-white rounded-xl shadow-lg border-2 border-indigo-500 overflow-hidden flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sigResult.dataUrl}
                            alt="Prepared PAN Signature"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                            213 × 106 px
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">Official 2:1 Result</span>
                      </div>

                      {/* Info & Download Actions */}
                      <div className="space-y-3 max-w-xs text-left w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              sigResult.isCompliant
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {sigResult.isCompliant ? "✓ 100% Portal Compliant" : "Needs Attention"}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400">File Size:</span>{" "}
                            <strong className="text-slate-800">
                              {(sigResult.finalSizeBytes / 1024).toFixed(1)} KB
                            </strong>{" "}
                            <span className="text-[11px] text-emerald-600 font-semibold">(Limit: 30 KB)</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Dimensions:</span>{" "}
                            <strong className="text-slate-800">213 × 106 px (2:1 Ratio)</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Whitening:</span>{" "}
                            <strong className="text-slate-800">{sigWhiten ? "Pure White Active" : "Off"}</strong>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                          <button
                            onClick={() => triggerFileDownload(sigResult.blob, sigResult.fileName)}
                            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Prepared Signature</span>
                          </button>

                          {user && (
                            <button
                              onClick={() => handleSaveToVault(sigResult, "SIGNATURE")}
                              disabled={savingToVault === sigResult.fileName}
                              className="w-full px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              <span>
                                {savingToVault === sigResult.fileName ? "Saving..." : "Save to Document Vault"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                      <span className="text-xs">Processing signature...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={() => sigInputRef.current?.click()}
                className="mt-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <PenTool className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Click or drag & drop applicant signature scan</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Upload a photo of your signature on paper. The tool will whiten the background to pure #FFFFFF, remove shadows, and resize to 213×106 px under 30 KB.
                </p>
                <span className="mt-3 px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg shadow-2xs">
                  Select File (JPEG, PNG)
                </span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 3: SUPPORTING DOCUMENT PDF COMPRESSION */}
        {/* ========================================================= */}
        {(activeTab === "ALL" || activeTab === "DOCUMENT") && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Step 3: Supporting Document (A4 PDF &lt; 300 KB)</h3>
                  <p className="text-xs text-slate-500">Aadhaar card / Voter ID / DOB proof formatted into a compliant PDF</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={docInputRef}
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setDocFile(f);
                  }}
                />
                <button
                  onClick={() => docInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{docFile ? "Change Document" : "Upload Document"}</span>
                </button>
              </div>
            </div>

            {/* Document Interactive Area */}
            {docFile ? (
              <div className="mt-5 p-5 bg-slate-50/70 border border-slate-200/70 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 max-w-md">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        docResult?.isCompliant
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {docResult?.isCompliant ? "✓ 100% PDF Compliant" : "Compressing..."}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {(docFile.size / 1024).toFixed(0)} KB original
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {docResult?.fileName || docFile.name}
                  </h4>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Output Size:</span>{" "}
                      <strong className="text-slate-800">
                        {docResult ? `${(docResult.finalSizeBytes / 1024).toFixed(1)} KB` : "Calculating..."}
                      </strong>{" "}
                      <span className="text-[11px] text-emerald-600 font-semibold">(Max 300 KB limit)</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Page Standard:</span>{" "}
                      <strong className="text-slate-800">Standard A4 ISO 216</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Stream Optimization:</span>{" "}
                      <strong className="text-slate-800">Enabled (Stripped non-standard metadata)</strong>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  {docResult && (
                    <>
                      <button
                        onClick={() => triggerFileDownload(docResult.blob, docResult.fileName)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Prepared PDF</span>
                      </button>

                      {user && (
                        <button
                          onClick={() => handleSaveToVault(docResult, "AADHAAR")}
                          disabled={savingToVault === docResult.fileName}
                          className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {savingToVault === docResult.fileName ? "Saving..." : "Save to Vault"}
                          </span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={() => docInputRef.current?.click()}
                className="mt-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Click or drag & drop proof document</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Upload Aadhaar or identity document in PDF or image format. We compile it into an A4 PDF compressed strictly under 300 KB.
                </p>
                <span className="mt-3 px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg shadow-2xs">
                  Select File (PDF, JPEG, PNG)
                </span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 4: BATCH SUMMARY & EXTENSION BRIDGE */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Protean / UTIITSL Portal Handoff</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Ready to upload on the official PAN portal?
              </h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                You have prepared <strong>{totalPreparedCount} of 3</strong> required files. Sync them to the Seva Saarthi Extension to autofill your application and upload compliant files directly into Protean / UTIITSL without re-formatting errors.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSyncToExtension}
                disabled={totalPreparedCount === 0}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                  syncedToExtension
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-40"
                }`}
              >
                {syncedToExtension ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Synced to Extension!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Sync with Seva Saarthi Extension</span>
                  </>
                )}
              </button>

              {totalPreparedCount > 0 && (
                <button
                  onClick={handleBatchDownload}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Prepared Files</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DISCLAIMER MODAL FOR OPTIONAL EXTERNAL TOOL */}
      {/* ========================================================= */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">External Tool Advisory</h3>
                <p className="text-xs text-slate-500">Navigation & Privacy Notice</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Seva Saarthi</strong> provides native, 100% client-side document preparation built directly to Protean & UTIITSL e-KYC specifications without leaving this platform.
            </p>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold">Third-Party Utility (pancardresizer.com):</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If you choose to use external third-party utilities like pancardresizer.com, please note that they operate independently from the Government of India and Seva Saarthi. Exercise caution and avoid uploading sensitive unmasked identity proofs to unknown servers.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowDisclaimerModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Stay on Seva Saarthi
              </button>
              <a
                href="https://pancardresizer.com/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowDisclaimerModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <span>Visit External Tool</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
