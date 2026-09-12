"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { DocumentType } from "@/types";
import { toast } from "sonner";
import {
  getDocumentProfile,
  formatBytes,
  SERVICE_DOCUMENT_PROFILES,
} from "@/lib/documents/document-profiles";
import {
  prepareDocumentForService,
  PreparedDocumentResult,
  PreparationStage,
} from "@/lib/documents/document-preparer";
import { DocumentPreparationCard } from "@/components/documents/DocumentPreparationCard";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (documentId: string) => void;
  initialServiceId?: string;
  initialDocumentType?: DocumentType;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  initialServiceId,
  initialDocumentType,
}: UploadDocumentModalProps) {
  const { uploadDocument, activeServiceId, user } = useSevaSaarthi();
  const [selectedService, setSelectedService] = useState<string>(initialServiceId || activeServiceId || "s001");
  const [selectedType, setSelectedType] = useState<DocumentType>(initialDocumentType || "INCOME_CERTIFICATE");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preparation Pipeline State
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<PreparationStage | null>(null);
  const [stageMessage, setStageMessage] = useState("");
  const [preparedResult, setPreparedResult] = useState<PreparedDocumentResult | null>(null);

  // Live adjustments
  const [isGrayscaleEnabled, setIsGrayscaleEnabled] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);

  // Active Document Profile
  const profile = getDocumentProfile(selectedService, selectedType);
  const rule = profile.rules;

  const docTypes: { type: DocumentType; label: string; example: string }[] = [
    { type: "INCOME_CERTIFICATE", label: "Income Certificate (Tahsildar)", example: "Income_Cert_FY26.pdf" },
    { type: "AADHAAR", label: "Aadhaar Card (UIDAI)", example: "Aadhaar_Card_SaiKumar.pdf" },
    { type: "COLLEGE_ID", label: "College Bonafide / ID Card", example: "College_Bonafide_Certificate.jpg" },
    { type: "PREVIOUS_MARKSHEET", label: "Semester / Qualifying Marksheet", example: "BTech_Marks_Memo.pdf" },
    { type: "BANK_PASSBOOK", label: "Bank Passbook (DBT Active)", example: "SBI_Passbook_Statement.jpg" },
    { type: "CASTE_CERTIFICATE", label: "Caste / Category Certificate", example: "Community_Certificate.pdf" },
    { type: "DOMICILE_CERTIFICATE", label: "Domicile / Residence Proof", example: "Domicile_Certificate.pdf" },
  ];

  const serviceOptions = [
    { id: "s001", name: "Post Matric Scholarship (NSP / State)" },
    { id: "s003", name: "Instant e-PAN Card Application" },
    { id: "default", name: "Citizen Document Vault (General)" },
  ];

  // Pipeline runner
  const runPreparation = useCallback(
    async (
      f: File,
      options: {
        grayscale?: boolean;
        rotation?: number;
        cropBorders?: boolean;
      } = {}
    ) => {
      setIsProcessing(true);
      setCurrentStage("ANALYZING_FILE");
      setStageMessage("Analyzing document headers and structure...");

      try {
        const result = await prepareDocumentForService(f, f.name, {
          serviceId: selectedService,
          documentType: selectedType,
          forceGrayscale: options.grayscale ?? isGrayscaleEnabled,
          rotationDegrees: options.rotation ?? rotationDegrees,
          autoCropBlankBorders: options.cropBorders ?? true,
          onStageChange: (stage, message) => {
            setCurrentStage(stage);
            setStageMessage(message);
          },
        });

        setPreparedResult(result);
      } catch (err: any) {
        toast.error(err.message || "Document preparation failed.");
        setPreparedResult(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedService, selectedType, isGrayscaleEnabled, rotationDegrees]
  );

  // Trigger preparation whenever file or category changes
  useEffect(() => {
    if (file) {
      runPreparation(file);
    }
  }, [selectedService, selectedType]);

  if (!isOpen) return null;

  const handleFile = (f: File) => {
    // Check maximum ceiling (15MB upload ceiling before client downscaling)
    if (f.size > 15 * 1024 * 1024) {
      toast.error("File exceeds 15MB ceiling. Please choose a smaller original scan.");
      return;
    }

    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(f.type) && !f.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
      toast.error("Unsupported file format. Please upload PDF, JPG, PNG, or WebP.");
      return;
    }

    setFile(f);
    runPreparation(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadPrepared = async () => {
    if (!file && !preparedResult) {
      toast.error("Please select a document to prepare and upload.");
      return;
    }

    const uploadBlob = preparedResult?.preparedBlob || file!;
    const fileName = preparedResult?.preparedFileName || file!.name;

    try {
      const docId = await uploadDocument(
        uploadBlob,
        selectedType,
        selectedService,
        preparedResult
          ? {
              originalFileName: preparedResult.originalFileName,
              preparedFileName: preparedResult.preparedFileName,
              originalSizeBytes: preparedResult.originalSizeBytes,
              preparedSizeBytes: preparedResult.preparedSizeBytes,
              targetSizeBytes: preparedResult.targetSizeBytes,
              originalDimensions: preparedResult.originalDimensions,
              preparedDimensions: preparedResult.preparedDimensions,
              readabilityScore: preparedResult.readabilityScore,
              readabilityStatus: preparedResult.readabilityStatus,
              optimizationSteps: preparedResult.optimizationSteps,
            }
          : undefined
      );

      onClose();
      if (onSuccess) onSuccess(docId);
    } catch {
      // Error notifications handled inside formly-store
    }
  };

  // Quick sample test with synthetic canvas image
  const selectQuickSample = (sampleType: DocumentType, filename: string) => {
    setSelectedType(sampleType);

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      // Generate a realistic high-res mock document canvas (approx 1.8 MB JPEG to test 200 KB optimization)
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 2200;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Document Border & Header
        ctx.strokeStyle = "#4338ca";
        ctx.lineWidth = 10;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        ctx.fillStyle = "#1e1b4b";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText("GOVERNMENT OF INDIA / STATE AUTHORITY", 120, 150);

        ctx.font = "bold 32px sans-serif";
        ctx.fillStyle = "#4f46e5";
        ctx.fillText(`OFFICIAL CERTIFICATE: ${sampleType.replace(/_/g, " ")}`, 120, 220);

        ctx.fillStyle = "#334155";
        ctx.font = "26px sans-serif";
        ctx.fillText(`Citizen Name: ${user?.name || "Citizen Applicant"}`, 120, 320);
        ctx.fillText("Application Ref: GOV-2026-894103", 120, 370);
        ctx.fillText("Issuing Authority: Revenue Department & e-Governance Portal", 120, 420);
        ctx.fillText(`Date of Verification: ${new Date().toLocaleDateString()}`, 120, 470);

        // Add fine detail / text simulation to give realistic image entropy
        ctx.font = "18px sans-serif";
        ctx.fillStyle = "#64748b";
        for (let i = 0; i < 25; i++) {
          ctx.fillText(
            `Clause ${i + 1}: Validated statutory proof submitted under digital governance framework rules. Seal verified.`,
            120,
            550 + i * 50
          );
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const mockFile = new File([blob], filename, { type: "image/jpeg" });
              setFile(mockFile);
              runPreparation(mockFile);
            }
          },
          "image/jpeg",
          0.95
        );
        return;
      }
    }

    // Fallback if canvas unavailable
    const mockFile = new File(["sample official document content binary stream"], filename, {
      type: filename.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    });
    setFile(mockFile);
    runPreparation(mockFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Smart Document Preparation & Upload</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Documents automatically adapt to the requirements of the destination government portal while preserving
            maximum readability.
          </p>
        </div>

        {/* Destination Service & Document Category Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Destination Government Service
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              {serviceOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Document Category
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              {docTypes.map((dt) => (
                <option key={dt.type} value={dt.type}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 4: Show Requirements Before Upload */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-indigo-950">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>{profile.serviceName} • Document Requirements</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-200/60 text-indigo-800 font-bold">
              Max {formatBytes(rule.maxFileSizeBytes)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-indigo-900/80 pt-1">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Accepted Formats</span>
              <span className="font-semibold">{rule.allowedExtensions.join(" / ").toUpperCase()}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Portal Size Limit</span>
              <span className="font-bold text-indigo-700">{formatBytes(rule.maxFileSizeBytes)}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Current File</span>
              <span className="font-semibold">{file ? formatBytes(file.size) : "None selected"}</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-indigo-100/80 flex items-center gap-1.5 text-[11px] text-indigo-700">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              {file && file.size > rule.maxFileSizeBytes
                ? `Your file is ${formatBytes(file.size)}. Seva Saarthi will optimize it automatically to under ${formatBytes(
                    rule.maxFileSizeBytes
                  )} without losing text readability.`
                : "Seva Saarthi automatically inspects dimensions, metadata, and compresses files safely."}
            </span>
          </div>
        </div>

        {/* Drag and Drop Zone (Visible when no file is chosen or during replacement) */}
        {!file ? (
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-indigo-500 bg-indigo-50/50 scale-[1.01]"
                : "border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              className="hidden"
            />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                Click to upload or drag & drop document
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Supports PDF, JPG, PNG up to 15MB • Auto-optimized to {formatBytes(rule.maxFileSizeBytes)}
              </div>
            </div>
          </div>
        ) : (
          /* Before / After Optimization Card */
          <DocumentPreparationCard
            preparedResult={preparedResult}
            currentStage={currentStage}
            stageMessage={stageMessage}
            isProcessing={isProcessing}
            rule={rule}
            originalFile={file}
            onReplaceFile={() => {
              setFile(null);
              setPreparedResult(null);
            }}
            onConfirmUpload={handleUploadPrepared}
            onToggleGrayscale={(enabled) => {
              setIsGrayscaleEnabled(enabled);
              if (file) runPreparation(file, { grayscale: enabled });
            }}
            onRotateImage={(degrees) => {
              setRotationDegrees(degrees);
              if (file) runPreparation(file, { rotation: degrees });
            }}
            onTriggerAutoCrop={() => {
              if (file) runPreparation(file, { cropBorders: true });
            }}
            isGrayscaleEnabled={isGrayscaleEnabled}
          />
        )}

        {/* Quick Sample Selector for Instant Verification & Demo */}
        {!file && (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Test with realistic sample document (simulate large 1.8 MB file):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {docTypes.slice(0, 4).map((dt) => (
                <button
                  key={dt.type}
                  type="button"
                  onClick={() => selectQuickSample(dt.type, dt.example)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-300 rounded-lg text-[10px] font-semibold text-slate-700 hover:text-indigo-700 transition-colors"
                >
                  + {dt.label.split(" ")[0]} ({dt.type})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
