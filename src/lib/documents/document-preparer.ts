import {
  DocumentProfile,
  DocumentRule,
  computeTargetBytes,
  formatBytes,
  sanitizeFileName,
  getDocumentProfile,
} from "./document-profiles";
import { DocumentAnalysis, analyzeDocument } from "./document-analyzer";
import { optimizeImageFile, ImageOptimizationResult, ImageOptimizationOptions } from "./image-optimizer";
import { optimizePdfDocument, PdfOptimizationResult, PdfPart } from "./pdf-optimizer";

export type PreparationStage =
  | "ANALYZING_FILE"
  | "CHECKING_REQUIREMENTS"
  | "OPTIMIZING_DOCUMENT"
  | "COMPRESSING"
  | "VERIFYING_READABILITY"
  | "READY"
  | "FAILED";

export interface PreparationStepLog {
  stage: PreparationStage;
  message: string;
  timestamp: string;
}

export interface PreparedDocumentResult {
  // Provenance & Identity
  originalFile: File | Blob;
  preparedBlob: Blob;
  originalFileName: string;
  preparedFileName: string;
  documentType: string;
  serviceId: string;
  serviceName: string;

  // Sizes & Targets
  originalSizeBytes: number;
  preparedSizeBytes: number;
  targetSizeBytes: number;
  maxAllowedSizeBytes: number;
  isUnderLimit: boolean;
  compressionRatioPercent: number;

  // Formats & Dimensions
  originalMime: string;
  preparedMime: string;
  originalDimensions?: { width: number; height: number };
  preparedDimensions?: { width: number; height: number };

  // Quality & Readability
  readabilityScore: number;
  readabilityStatus: "EXCELLENT" | "GOOD" | "BORDERLINE" | "UNREADABLE";
  qualityIssues: string[];
  suggestedActions: string[];

  // Compatibility & Auditing
  portalReady: boolean;
  compatibilityChecks: {
    sizeCheck: boolean;
    formatCheck: boolean;
    dimensionsCheck: boolean;
    pageCountCheck: boolean;
  };
  optimizationSteps: PreparationStepLog[];
  splitParts?: PdfPart[];

  // URLs for UI Preview
  previewUrl: string;
  originalPreviewUrl?: string;

  createdAt: string;
}

export interface PrepareDocumentOptions {
  serviceId?: string;
  documentType?: string;
  profileOverride?: DocumentProfile;
  forceGrayscale?: boolean;
  rotationDegrees?: number;
  autoCropBlankBorders?: boolean;
  manualCrop?: { x: number; y: number; width: number; height: number };
  onStageChange?: (stage: PreparationStage, message: string) => void;
}

/**
 * Main Orchestrator: Smart Document Preparation Pipeline
 */
export async function prepareDocumentForService(
  file: File | Blob,
  fileName: string = "document",
  options: PrepareDocumentOptions = {}
): Promise<PreparedDocumentResult> {
  const steps: PreparationStepLog[] = [];
  const logStep = (stage: PreparationStage, message: string) => {
    steps.push({ stage, message, timestamp: new Date().toISOString() });
    if (options.onStageChange) {
      options.onStageChange(stage, message);
    }
  };

  const originalSize = file.size;
  const originalFileName = fileName || (file as any).name || "document";

  // Stage 1: Analyzing file
  logStep("ANALYZING_FILE", "Analyzing file format, headers, and metadata...");
  const analysis = await analyzeDocument(file, originalFileName);

  if (analysis.isCorrupted) {
    logStep("FAILED", analysis.errorMessage || "Corrupted or invalid file.");
    throw new Error(analysis.errorMessage || "The uploaded document is invalid or corrupted.");
  }

  // Stage 2: Checking requirements
  logStep("CHECKING_REQUIREMENTS", "Matching against destination service requirements...");
  const profile =
    options.profileOverride || getDocumentProfile(options.serviceId, options.documentType);
  const rule = profile.rules;
  const targetBytes = computeTargetBytes(rule);

  // Validate format acceptance
  const extMatch = originalFileName.match(/\.([a-z0-9]+)$/i);
  const fileExt = extMatch ? extMatch[1].toLowerCase() : "";
  const isExtensionAllowed =
    rule.allowedExtensions.includes(fileExt) ||
    (analysis.detectedType === "jpeg" && rule.allowedExtensions.includes("jpg")) ||
    (analysis.detectedType === "pdf" && rule.allowedExtensions.includes("pdf")) ||
    (analysis.detectedType === "png" && rule.allowedExtensions.includes("png")) ||
    (analysis.detectedType === "webp" && rule.allowedExtensions.includes("webp"));

  if (!isExtensionAllowed) {
    const errorMsg = `Unsupported format '.${fileExt}'. Destination portal requires: ${rule.allowedExtensions.join(
      ", "
    ).toUpperCase()}`;
    logStep("FAILED", errorMsg);
    throw new Error(errorMsg);
  }

  // Stage 3 & 4: Optimization & Compression
  logStep("OPTIMIZING_DOCUMENT", `Optimizing ${analysis.detectedType.toUpperCase()} document...`);
  logStep(
    "COMPRESSING",
    `Progressively optimizing to safety target ${formatBytes(targetBytes)} (Portal max: ${formatBytes(
      rule.maxFileSizeBytes
    )})...`
  );

  let preparedBlob: Blob;
  let preparedMime: string;
  let preparedDimensions: { width: number; height: number } | undefined;
  let readabilityScore = 85;
  let readabilityStatus: "EXCELLENT" | "GOOD" | "BORDERLINE" | "UNREADABLE" = "GOOD";
  const qualityIssues: string[] = [];
  const suggestedActions: string[] = [];
  let splitParts: PdfPart[] | undefined;

  // Safe file naming
  const preparedFileName = sanitizeFileName(
    originalFileName,
    profile.documentType,
    analysis.detectedType === "pdf" ? "pdf" : "jpg"
  );

  if (analysis.detectedType === "pdf") {
    // PDF Optimization
    const pdfResult = await optimizePdfDocument(file, analysis, rule, preparedFileName);
    preparedBlob = pdfResult.blob;
    preparedMime = "application/pdf";
    splitParts = pdfResult.splitParts;

    if (pdfResult.warningMessage) {
      qualityIssues.push(pdfResult.warningMessage);
    }
    suggestedActions.push(...pdfResult.suggestedActions);
  } else {
    // Image Optimization
    const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

    if (isBrowser) {
      const imgOptions: ImageOptimizationOptions = {
        rule,
        forceGrayscale: options.forceGrayscale,
        manualCrop: options.manualCrop,
        autoCropBlankBorders: options.autoCropBlankBorders ?? true,
        rotationDegrees: options.rotationDegrees,
      };

      const imgResult: ImageOptimizationResult = await optimizeImageFile(file, analysis, imgOptions);
      preparedBlob = imgResult.blob;
      preparedMime = imgResult.mimeType;
      preparedDimensions = { width: imgResult.width, height: imgResult.height };
      readabilityScore = imgResult.readabilityScore;
      readabilityStatus = imgResult.readabilityStatus;

      if (imgResult.warningMessage) {
        qualityIssues.push(imgResult.warningMessage);
      }
      suggestedActions.push(...imgResult.suggestedActions);
    } else {
      // Direct pass for non-browser environments if already under limit
      preparedBlob = file;
      preparedMime = analysis.mimeType || "image/jpeg";
      preparedDimensions =
        analysis.width && analysis.height
          ? { width: analysis.width, height: analysis.height }
          : undefined;
      readabilityScore = 80;
    }
  }

  // Stage 5: Verifying readability & portal compatibility
  logStep("VERIFYING_READABILITY", "Verifying text visibility and checking portal compatibility...");

  const preparedSize = preparedBlob.size;
  const isUnderLimit = preparedSize <= rule.maxFileSizeBytes;

  const sizeCheck = isUnderLimit;
  const formatCheck = rule.allowedMimeTypes.some(
    (m) => m === preparedMime || (preparedMime === "image/jpeg" && m === "image/jpg")
  );
  const dimensionsCheck =
    !preparedDimensions ||
    ((!rule.minWidth || preparedDimensions.width >= rule.minWidth) &&
      (!rule.minHeight || preparedDimensions.height >= rule.minHeight) &&
      (!rule.maxWidth || preparedDimensions.width <= rule.maxWidth) &&
      (!rule.maxHeight || preparedDimensions.height <= rule.maxHeight));
  const pageCountCheck =
    analysis.detectedType !== "pdf" ||
    !rule.pdfPageLimit ||
    !analysis.pageCount ||
    analysis.pageCount <= rule.pdfPageLimit;

  const portalReady = sizeCheck && formatCheck && dimensionsCheck && pageCountCheck;

  // Generate preview URLs
  let previewUrl = "";
  let originalPreviewUrl = "";
  if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    try {
      previewUrl = URL.createObjectURL(preparedBlob);
      originalPreviewUrl = URL.createObjectURL(file);
    } catch {
      // Ignore URL creation failures in non-standard environments
    }
  }

  const compressionRatioPercent =
    originalSize > 0 ? Math.round(((originalSize - preparedSize) / originalSize) * 100) : 0;

  // Stage 6: Ready
  logStep(
    portalReady ? "READY" : "FAILED",
    portalReady
      ? `Successfully prepared document to ${formatBytes(preparedSize)} (Target: ${formatBytes(
          targetBytes
        )}, Under limit ✓)`
      : `Document prepared to ${formatBytes(preparedSize)}, but requires citizen review.`
  );

  return {
    originalFile: file,
    preparedBlob,
    originalFileName,
    preparedFileName,
    documentType: profile.documentType,
    serviceId: profile.serviceId,
    serviceName: profile.serviceName,

    originalSizeBytes: originalSize,
    preparedSizeBytes: preparedSize,
    targetSizeBytes: targetBytes,
    maxAllowedSizeBytes: rule.maxFileSizeBytes,
    isUnderLimit,
    compressionRatioPercent,

    originalMime: analysis.mimeType,
    preparedMime,
    originalDimensions:
      analysis.width && analysis.height
        ? { width: analysis.width, height: analysis.height }
        : undefined,
    preparedDimensions,

    readabilityScore,
    readabilityStatus,
    qualityIssues,
    suggestedActions,

    portalReady,
    compatibilityChecks: {
      sizeCheck,
      formatCheck,
      dimensionsCheck,
      pageCountCheck,
    },
    optimizationSteps: steps,
    splitParts,

    previewUrl,
    originalPreviewUrl,

    createdAt: new Date().toISOString(),
  };
}
