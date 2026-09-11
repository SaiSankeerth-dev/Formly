import { PDFDocument } from "pdf-lib";
import { DocumentRule, computeTargetBytes, formatBytes } from "./document-profiles";
import { DocumentAnalysis } from "./document-analyzer";

export interface PdfPart {
  blob: Blob;
  fileName: string;
  pageRange: string;
  pageCount: number;
  sizeBytes: number;
}

export interface PdfOptimizationResult {
  blob: Blob;
  fileName: string;
  pageCount: number;
  originalSizeBytes: number;
  finalSizeBytes: number;
  targetSizeBytes: number;
  isUnderLimit: boolean;
  isSplit: boolean;
  splitParts?: PdfPart[];
  removedMetadata: boolean;
  warningMessage?: string;
  suggestedActions: string[];
}

/**
 * Optimize a PDF document:
 * 1. Validates password protection
 * 2. Validates page limits
 * 3. Strips non-essential metadata
 * 4. Enables object stream compression
 * 5. Handles conditional splitting if allowed by service rules
 */
export async function optimizePdfDocument(
  file: File | Blob | Uint8Array,
  analysis: DocumentAnalysis,
  rule: DocumentRule,
  baseFileName: string = "document.pdf"
): Promise<PdfOptimizationResult> {
  const targetBytes = computeTargetBytes(rule);
  const suggestedActions: string[] = [];

  let bytes: Uint8Array;
  let originalSize: number;

  if (file instanceof Uint8Array) {
    bytes = file;
    originalSize = bytes.length;
  } else {
    originalSize = file.size;
    const ab = await file.arrayBuffer();
    bytes = new Uint8Array(ab);
  }

  // Check if encrypted
  if (analysis.isEncryptedPdf) {
    throw new Error("This PDF is password protected. Upload an unlocked copy.");
  }

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch (err: any) {
    if (err.name === "EncryptedPDFError" || err.message?.toLowerCase().includes("encrypted")) {
      throw new Error("This PDF is password protected. Upload an unlocked copy.");
    }
    throw new Error(`Corrupted PDF file: ${err.message || "Failed to parse document structure."}`);
  }

  const totalPages = pdfDoc.getPageCount();

  // Validate page count rule if configured (unless splitting is permitted by service rules)
  if (rule.pdfPageLimit && totalPages > rule.pdfPageLimit && !rule.allowPdfSplitting) {
    throw new Error(
      `This document has ${totalPages} pages, exceeding the maximum allowed limit of ${rule.pdfPageLimit} page${
        rule.pdfPageLimit > 1 ? "s" : ""
      } for this service.`
    );
  }

  // Strip unnecessary metadata where safe (Section 9 & 18)
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer("Seva Saarthi Smart Document Engine");
  pdfDoc.setCreator("Seva Saarthi Citizen Portal");

  // Save with stream compression
  const optimizedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  const finalSizeBytes = optimizedBytes.length;
  const isPageLimitSatisfied = !rule.pdfPageLimit || totalPages <= rule.pdfPageLimit;
  const isUnderLimit = finalSizeBytes <= rule.maxFileSizeBytes && isPageLimitSatisfied;

  const optimizedBlob = new Blob([optimizedBytes as unknown as BlobPart], { type: "application/pdf" });

  // If already under limit and meets page limit
  if (isUnderLimit) {
    return {
      blob: optimizedBlob,
      fileName: baseFileName,
      pageCount: totalPages,
      originalSizeBytes: originalSize,
      finalSizeBytes,
      targetSizeBytes: targetBytes,
      isUnderLimit: true,
      isSplit: false,
      removedMetadata: true,
      suggestedActions: [],
    };
  }

  // If document exceeds size limit:
  // Check if service rules allow PDF splitting (Section 10)
  if (rule.allowPdfSplitting && totalPages > 1) {
    const splitParts: PdfPart[] = [];
    const estimatedBytesPerPage = Math.ceil(finalSizeBytes / totalPages);
    const pagesPerPart = Math.max(
      1,
      Math.min(rule.pdfPageLimit || 999, Math.floor(targetBytes / estimatedBytesPerPage))
    );

    let currentPage = 0;
    let partIndex = 1;

    while (currentPage < totalPages) {
      const partDoc = await PDFDocument.create();
      const endPage = Math.min(currentPage + pagesPerPart, totalPages);
      const pageIndicesToCopy: number[] = [];

      for (let p = currentPage; p < endPage; p++) {
        pageIndicesToCopy.push(p);
      }

      const copiedPages = await partDoc.copyPages(pdfDoc, pageIndicesToCopy);
      for (const page of copiedPages) {
        partDoc.addPage(page);
      }

      const partBytes = await partDoc.save({ useObjectStreams: true });
      const partBlob = new Blob([partBytes as unknown as BlobPart], { type: "application/pdf" });

      const cleanBase = baseFileName.replace(/\.pdf$/i, "");
      const partFileName = `${cleanBase}_part${partIndex}.pdf`;

      splitParts.push({
        blob: partBlob,
        fileName: partFileName,
        pageRange: `Pages ${currentPage + 1}-${endPage}`,
        pageCount: endPage - currentPage,
        sizeBytes: partBytes.length,
      });

      currentPage = endPage;
      partIndex++;
    }

    return {
      blob: optimizedBlob,
      fileName: baseFileName,
      pageCount: totalPages,
      originalSizeBytes: originalSize,
      finalSizeBytes,
      targetSizeBytes: targetBytes,
      isUnderLimit: false,
      isSplit: true,
      splitParts,
      removedMetadata: true,
      warningMessage: `This document is too large for a single upload (${formatBytes(
        finalSizeBytes
      )} > ${formatBytes(rule.maxFileSizeBytes)}). It has been prepared into ${
        splitParts.length
      } compliant parts.`,
      suggestedActions: [
        "Upload split parts as allowed by portal rules",
        "Convert to high-contrast Grayscale scan",
      ],
    };
  }

  // If single file is strictly required and size exceeds portal limit
  return {
    blob: optimizedBlob,
    fileName: baseFileName,
    pageCount: totalPages,
    originalSizeBytes: originalSize,
    finalSizeBytes,
    targetSizeBytes: targetBytes,
    isUnderLimit: false,
    isSplit: false,
    removedMetadata: true,
    warningMessage: `This document cannot be safely compressed to ${formatBytes(
      rule.maxFileSizeBytes
    )} without reducing readability. Destination portal requires a single file under ${formatBytes(
      rule.maxFileSizeBytes
    )}.`,
    suggestedActions: [
      "Scan at 150 DPI instead of 300+ DPI",
      "Remove blank or unnecessary pages before uploading",
      "Upload as a high-contrast Black & White JPEG",
    ],
  };
}
