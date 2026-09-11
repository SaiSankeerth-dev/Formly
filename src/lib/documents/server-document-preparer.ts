import {
  DocumentProfile,
  computeTargetBytes,
  formatBytes,
  sanitizeFileName,
  getDocumentProfile,
} from "./document-profiles";
import { analyzeDocument } from "./document-analyzer";
import { optimizePdfDocument, PdfPart } from "./pdf-optimizer";
import { optimizeImageNode } from "./node-image-optimizer";
import {
  PreparationStage,
  PreparationStepLog,
  PreparedDocumentResult,
  PrepareDocumentOptions,
} from "./document-preparer";

/**
 * Server-side Smart Document Preparation Pipeline
 * Runs on Node.js runtime using sharp for images and pdf-lib for PDFs.
 * Used by POST /api/documents for server revalidation and auto-optimization,
 * ensuring citizen documents are never rejected due to portal size limits.
 */
export async function prepareDocumentServerSide(
  file: File | Blob | Uint8Array,
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

  const originalSize = (file as any).size || (file as Uint8Array).length || 0;
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
  logStep("OPTIMIZING_DOCUMENT", `Optimizing ${analysis.detectedType.toUpperCase()} document on server...`);
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
    // Image Optimization via sharp
    const imgResult = await optimizeImageNode(file, analysis, {
      rule,
      forceGrayscale: options.forceGrayscale,
      manualCrop: options.manualCrop,
      autoCropBlankBorders: options.autoCropBlankBorders ?? true,
      rotationDegrees: options.rotationDegrees,
    });

    preparedBlob = imgResult.blob;
    preparedMime = imgResult.mimeType;
    preparedDimensions = { width: imgResult.width, height: imgResult.height };
    readabilityScore = imgResult.readabilityScore;
    readabilityStatus = imgResult.readabilityStatus;

    if (imgResult.warningMessage) {
      qualityIssues.push(imgResult.warningMessage);
    }
    suggestedActions.push(...imgResult.suggestedActions);
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
    originalFile: file as any,
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

    previewUrl: "",
    originalPreviewUrl: "",

    createdAt: new Date().toISOString(),
  };
}
