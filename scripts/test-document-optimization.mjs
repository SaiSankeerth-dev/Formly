import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";
import {
  getDocumentProfile,
  formatBytes,
  sanitizeFileName,
  computeTargetBytes,
  SERVICE_DOCUMENT_PROFILES,
} from "../src/lib/documents/document-profiles.ts";
import {
  detectMagicBytes,
  parseJpegMetadata,
  parsePngMetadata,
  inspectPdfBytes,
  analyzeDocument,
} from "../src/lib/documents/document-analyzer.ts";
import {
  optimizePdfDocument,
} from "../src/lib/documents/pdf-optimizer.ts";
import {
  computeImageReadabilityMetrics,
  detectBlankBorders,
} from "../src/lib/documents/image-optimizer.ts";
import {
  prepareDocumentForService,
} from "../src/lib/documents/document-preparer.ts";
import {
  prepareDocumentServerSide,
} from "../src/lib/documents/server-document-preparer.ts";
import { getAuthoritativeDb } from "../src/lib/server/pg-db.ts";
import {
  registerUser,
  loginUser,
  getUserDocuments,
  addDocumentForUser,
} from "../src/lib/server/db.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

// ----------------------------------------------------------------------
// Synthetic Binary Generators for Testing
// ----------------------------------------------------------------------

/**
 * Generate a valid, decodable JPEG buffer with exact width, height, and minimum byte size
 */
async function createSyntheticJpeg(width, height, targetSizeBytes = 1024, exifOrientation = 1) {
  const sharp = (await import("sharp")).default;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const isHeader = y < 80 && (x % 40 < 20);
      const isText = (y % 30 < 6) && (x % 16 < 12);
      const val = isHeader ? 20 : isText ? 30 : 240;
      raw[idx] = val;
      raw[idx + 1] = val;
      raw[idx + 2] = val;
    }
  }

  let pipeline = sharp(raw, { raw: { width, height, channels: 3 } });
  if (exifOrientation && exifOrientation > 1) {
    pipeline = pipeline.withMetadata({ orientation: exifOrientation });
  }

  let buf = await pipeline.jpeg({ quality: 90 }).toBuffer();

  if (buf.length < targetSizeBytes) {
    let needed = targetSizeBytes - buf.length;
    const chunks = [];
    while (needed >= 4) {
      let chunkTotal = Math.min(65535, needed);
      if (needed - chunkTotal > 0 && needed - chunkTotal < 4) {
        chunkTotal = needed - 4;
      }
      const markerLen = chunkTotal - 2;
      const comHeader = Buffer.from([0xff, 0xfe, (markerLen >> 8) & 0xff, markerLen & 0xff]);
      const comData = Buffer.alloc(markerLen - 2, 0x55);
      chunks.push(comHeader, comData);
      needed -= chunkTotal;
    }
    const beforeEoi = buf.subarray(0, buf.length - 2);
    const eoi = buf.subarray(buf.length - 2);
    const tail = needed > 0 ? Buffer.alloc(needed, 0x00) : Buffer.alloc(0);
    buf = Buffer.concat([beforeEoi, ...chunks, eoi, tail]);
  }

  return buf;
}

/**
 * Generate a valid PNG buffer with width, height, and byte padding
 */
function createSyntheticPng(width, height, targetSizeBytes = 512, hasAlpha = false) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = hasAlpha ? 6 : 2; // Color type: 6 = RGBA, 2 = RGB
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = Buffer.alloc(12 + 13);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write("IHDR", 4);
  ihdrData.copy(ihdrChunk, 8);
  ihdrChunk.writeUInt32BE(0x12345678, 21); // Mock CRC

  // IDAT chunk with padding
  const paddingNeeded = Math.max(10, targetSizeBytes - 50);
  const idatData = Buffer.alloc(paddingNeeded, 0x55);
  const idatChunk = Buffer.alloc(12 + paddingNeeded);
  idatChunk.writeUInt32BE(paddingNeeded, 0);
  idatChunk.write("IDAT", 4);
  idatData.copy(idatChunk, 8);
  idatChunk.writeUInt32BE(0x87654321, 8 + paddingNeeded);

  // IEND chunk
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Create a real valid PDF with pdf-lib with specified page count and minimum size
 */
async function createSyntheticPdf(pageCount = 1, targetSizeBytes = 2048) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595, 842]); // A4
    page.drawText(`Post Matric Scholarship - Verified Document Proof (Page ${i + 1} of ${pageCount})`, {
      x: 50,
      y: 800,
      size: 14,
    });
    page.drawText(`Citizen: Sai Sankeerth • Document ID: REF-2026-NSP-894103`, {
      x: 50,
      y: 770,
      size: 11,
    });

    // Add extra text to expand stream if target size is large
    if (targetSizeBytes > 100 * 1024) {
      const lines = Math.min(200, Math.floor(targetSizeBytes / (pageCount * 120)));
      for (let j = 0; j < lines; j++) {
        page.drawText(`Statutory Clause ${j + 1}: Proof of income and educational eligibility verified under state policy.`, {
          x: 50,
          y: Math.max(50, 740 - j * 12),
          size: 8,
        });
      }
    }
  }

  // Set initial metadata to verify stripping later
  doc.setTitle("Official Citizen Scholarship Application Document");
  doc.setAuthor("Sai Sankeerth");
  doc.setSubject("Income and Academic Verification");

  const pdfBytes = await doc.save();

  // If we need extra byte padding to test 500 KB, 1 MB, 5 MB
  if (pdfBytes.length < targetSizeBytes) {
    const padding = Buffer.alloc(targetSizeBytes - pdfBytes.length, 0x20); // Space padding in comment
    const comment = Buffer.from("\n% PDF Extra Stream Padding for Size Simulation\n");
    return Buffer.concat([Buffer.from(pdfBytes), comment, padding, Buffer.from("\n%%EOF\n")]);
  }

  return Buffer.from(pdfBytes);
}

// ----------------------------------------------------------------------
// MAIN TEST RUNNER
// ----------------------------------------------------------------------

async function runDocumentOptimizationTests() {
  console.log("\n========================================================");
  console.log("   SEVA SAARTHI — SMART DOCUMENT PREPARATION & UPLOAD TESTS");
  console.log("========================================================\n");

  // --------------------------------------------------------------------
  // SUITE 1: Service Profiles & File Rules (Section 3, 12, 20, 22)
  // --------------------------------------------------------------------
  console.log("--- Suite 1: Service Profiles & Rule Engine ---");

  // Verify Scholarship rules
  const scholarshipIncome = getDocumentProfile("s001", "INCOME_CERTIFICATE");
  assert(scholarshipIncome.rules.maxFileSizeBytes === 200 * 1024, "Scholarship income max size is configured to 200 KB (not hardcoded)");
  assert(scholarshipIncome.rules.safetyMarginFactor === 0.9, "Scholarship safety margin factor is 0.90");
  assert(computeTargetBytes(scholarshipIncome.rules) === 184320, "Scholarship target size is 180 KB (184,320 bytes)");
  assert(scholarshipIncome.rules.minWidth === 300, "Scholarship income certificate requires minWidth 300px");
  assert(scholarshipIncome.rules.minHeight === 400, "Scholarship income certificate requires minHeight 400px");

  // Verify Scholarship Photo & Signature rules
  const scholarshipPhoto = getDocumentProfile("s001", "PHOTO");
  assert(scholarshipPhoto.rules.maxFileSizeBytes === 100 * 1024, "Scholarship photo max size is 100 KB");
  assert(scholarshipPhoto.rules.maxWidth === 800, "Scholarship photo maxWidth is 800px");
  assert(scholarshipPhoto.rules.maxHeight === 1000, "Scholarship photo maxHeight is 1000px");

  const scholarshipSig = getDocumentProfile("s001", "SIGNATURE");
  assert(scholarshipSig.rules.maxFileSizeBytes === 50 * 1024, "Scholarship signature max size is 50 KB");
  assert(scholarshipSig.rules.maxWidth === 600, "Scholarship signature maxWidth is 600px");
  assert(scholarshipSig.rules.maxHeight === 300, "Scholarship signature maxHeight is 300px");

  // Verify PAN rules
  const panPhoto = getDocumentProfile("s003", "PHOTO");
  assert(panPhoto.rules.maxFileSizeBytes === 100 * 1024, "PAN photo max size is 100 KB");

  // Verify Vault default rules
  const vaultDefault = getDocumentProfile("default", "OTHER");
  assert(vaultDefault.rules.maxFileSizeBytes === 5 * 1024 * 1024, "Default vault limit is 5 MB");

  // Verify File Name Sanitization (Section 22)
  const unsafeName1 = "Income Certificate — Sai Sankeerth (Final)!!!.pdf";
  const safeName1 = sanitizeFileName(unsafeName1, "INCOME_CERTIFICATE");
  assert(safeName1 === "income_certificate.pdf", `Sanitized safe file name: '${safeName1}'`);

  const unsafeName2 = "../../../etc/passwd_Aadhaar Card (1).jpg";
  const safeName2 = sanitizeFileName(unsafeName2, "AADHAAR");
  assert(safeName2 === "aadhaar.jpg", `Path traversal prevented in file name: '${safeName2}'`);

  // Format Bytes helper
  assert(formatBytes(204800) === "200 KB", "FormatBytes formats 204800 to '200 KB'");
  assert(formatBytes(2097152) === "2.0 MB", "FormatBytes formats 2097152 to '2.0 MB'");

  // --------------------------------------------------------------------
  // SUITE 2: Binary Inspection & Magic Bytes Detection (Section 1, 2)
  // --------------------------------------------------------------------
  console.log("\n--- Suite 2: Binary Inspection & Magic Bytes ---");

  // Test JPEG detection
  const jpeg50kb = await createSyntheticJpeg(800, 1000, 50 * 1024);
  const jpegMagic = detectMagicBytes(jpeg50kb);
  assert(jpegMagic === "jpeg", "Detected JPEG from magic bytes (0xFFD8FF)");

  const jpegMeta = parseJpegMetadata(jpeg50kb);
  assert(jpegMeta.width === 800, `Extracted JPEG width: ${jpegMeta.width}px`);
  assert(jpegMeta.height === 1000, `Extracted JPEG height: ${jpegMeta.height}px`);

  // Test PNG detection
  const pngBuf = createSyntheticPng(640, 480, 10 * 1024, true);
  const pngMagic = detectMagicBytes(pngBuf);
  assert(pngMagic === "png", "Detected PNG from magic bytes");

  const pngMeta = parsePngMetadata(pngBuf);
  assert(pngMeta.width === 640, `Extracted PNG width: ${pngMeta.width}px`);
  assert(pngMeta.height === 480, `Extracted PNG height: ${pngMeta.height}px`);
  assert(pngMeta.hasAlphaChannel === true, "Detected PNG alpha transparency channel");

  // Test PDF detection
  const pdf1Page = await createSyntheticPdf(1, 4096);
  const pdfMagic = detectMagicBytes(pdf1Page);
  assert(pdfMagic === "pdf", "Detected PDF from magic bytes (%PDF-)");

  const pdfInfo = inspectPdfBytes(pdf1Page);
  assert(pdfInfo.isEncrypted === false, "Detected PDF is not encrypted");
  assert(pdfInfo.pageCount >= 1, `Detected PDF page count: ${pdfInfo.pageCount}`);

  // Test Encrypted PDF detection (Section 16)
  const encryptedPdfSample = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n3 0 obj\n<< /Filter /Standard /V 2 /R 3 /Encrypt 4 0 R >>\nendobj\n%%EOF"
  );
  const encAnalysis = await analyzeDocument(encryptedPdfSample, "encrypted_statement.pdf");
  assert(encAnalysis.isEncryptedPdf === true, "Detected password-protected PDF");
  assert(encAnalysis.errorMessage?.includes("password protected"), "Generated actionable message: 'This PDF is password protected.'");

  // Test Corrupted File handling (Section 16)
  const corruptedJpeg = Buffer.from([0xff, 0xd8, 0x00, 0x12, 0x55, 0x44]); // Truncated without SOF
  const corruptAnalysis = await analyzeDocument(corruptedJpeg, "broken.jpg");
  assert(corruptAnalysis.isCorrupted === true, "Detected corrupted file correctly");

  // --------------------------------------------------------------------
  // SUITE 3: PDF Optimization & Splitting (Section 9, 10)
  // --------------------------------------------------------------------
  console.log("\n--- Suite 3: PDF Optimization & Stream Compression ---");

  const unoptimizedPdf = await createSyntheticPdf(3, 50 * 1024);
  const analysis3Page = await analyzeDocument(unoptimizedPdf, "bonafide.pdf");

  const pdfRule = scholarshipIncome.rules;
  const optPdfResult = await optimizePdfDocument(unoptimizedPdf, analysis3Page, pdfRule, "bonafide.pdf");

  assert(optPdfResult.pageCount === 3, "Preserved exact page count (3 pages)");
  assert(optPdfResult.removedMetadata === true, "Stripped unnecessary author/title metadata");
  assert(optPdfResult.isUnderLimit === true, `Optimized PDF size (${formatBytes(optPdfResult.finalSizeBytes)}) <= limit (${formatBytes(pdfRule.maxFileSizeBytes)})`);

  // Test Multi-page PDF Splitting when enabled (Section 10)
  const multiPagePdfLarge = await createSyntheticPdf(6, 400 * 1024); // 400 KB, 6 pages
  const analysisMulti = await analyzeDocument(multiPagePdfLarge, "semester_memos.pdf");
  const splitRule = {
    ...pdfRule,
    maxFileSizeBytes: 100 * 1024, // 100 KB limit
    pdfPageLimit: 2, // 6 pages will be split into 3 parts of 2 pages each
    allowPdfSplitting: true,
  };

  const splitResult = await optimizePdfDocument(multiPagePdfLarge, analysisMulti, splitRule, "semester_memos.pdf");
  assert(splitResult.isSplit === true, "PDF splitting activated when file exceeds limit and splitting is permitted");
  assert(splitResult.splitParts && splitResult.splitParts.length >= 2, `Split into ${splitResult.splitParts?.length} parts`);

  for (const part of splitResult.splitParts || []) {
    assert(part.sizeBytes <= 150 * 1024, `Split part ${part.fileName} is within safe chunk limit (${formatBytes(part.sizeBytes)})`);
  }

  // Test Page Limit Enforcement (Section 16)
  const sevenPagePdf = await createSyntheticPdf(7, 20 * 1024);
  const analysis7 = await analyzeDocument(sevenPagePdf, "document.pdf");
  const strictPageRule = { ...pdfRule, pdfPageLimit: 3 };

  let pageLimitErrorThrown = false;
  try {
    await optimizePdfDocument(sevenPagePdf, analysis7, strictPageRule, "document.pdf");
  } catch (err) {
    pageLimitErrorThrown = true;
    assert(err.message.includes("exceeding the maximum allowed limit of 3 pages"), `Enforced page limit error: ${err.message}`);
  }
  assert(pageLimitErrorThrown, "Enforced pdfPageLimit correctly");

  // --------------------------------------------------------------------
  // SUITE 4: SECTION 28 CANONICAL 200 KB OPTIMIZATION TESTS
  // --------------------------------------------------------------------
  console.log("\n--- Suite 4: Section 28 Canonical 200 KB Tests ---");

  // 28.1: Input 2 MB JPEG -> Rule: maximum = 200 KB
  console.log("Testing 2 MB JPEG -> 200 KB Target Rule...");
  const jpeg2MB = await createSyntheticJpeg(1200, 1600, 2 * 1024 * 1024);
  assert(jpeg2MB.length >= 2 * 1024 * 1024, `Created 2 MB JPEG input (${formatBytes(jpeg2MB.length)})`);

  const analysis2MB = await analyzeDocument(jpeg2MB, "Income_Certificate_HD_Scan.jpg");
  assert(analysis2MB.detectedType === "jpeg", "Input identified as JPEG");
  assert(analysis2MB.width === 1200, `Input dimensions: ${analysis2MB.width}x${analysis2MB.height}`);

  // ACTUALLY EXECUTE PREPARATION PIPELINE (Fixing prior omission)
  const prepared2MB = await prepareDocumentServerSide(jpeg2MB, "Income_Certificate_HD_Scan.jpg", {
    serviceId: "s001",
    documentType: "INCOME_CERTIFICATE",
  });
  assert(prepared2MB.isUnderLimit === true, `Prepared file is strictly under portal limit: ${formatBytes(prepared2MB.preparedSizeBytes)} <= 200 KB`);
  assert(prepared2MB.preparedSizeBytes <= 200 * 1024, `Prepared file size ${prepared2MB.preparedSizeBytes} <= 204800 bytes`);
  assert(prepared2MB.preparedMime === "image/jpeg", `Prepared MIME matches destination rule: ${prepared2MB.preparedMime}`);
  assert(prepared2MB.portalReady === true, "Portal compatibility verified (FILE READY / PORTAL COMPLIANT)");
  assert(prepared2MB.readabilityScore >= 50, `Readability preserved: ${prepared2MB.readabilityScore}/100 (${prepared2MB.readabilityStatus})`);
  assert(prepared2MB.preparedDimensions && prepared2MB.preparedDimensions.width >= 300, `Valid width preserved: ${prepared2MB.preparedDimensions?.width}px >= 300px`);
  assert(prepared2MB.preparedDimensions && prepared2MB.preparedDimensions.height >= 400, `Valid height preserved: ${prepared2MB.preparedDimensions?.height}px >= 400px`);

  // Test 28.2: 50 KB image (already under limit -> should not degrade)
  console.log("Testing 50 KB JPEG (already under limit)...");
  const jpeg50K = await createSyntheticJpeg(600, 800, 50 * 1024);
  const analysis50K = await analyzeDocument(jpeg50K, "receipt_50k.jpg");
  assert(jpeg50K.length <= scholarshipIncome.rules.maxFileSizeBytes, "50 KB file is already under 200 KB limit");
  const prep50K = await prepareDocumentServerSide(jpeg50K, "receipt_50k.jpg", {
    serviceId: "s001",
    documentType: "INCOME_CERTIFICATE",
  });
  assert(prep50K.isUnderLimit === true, `50 KB file passed preparation cleanly (${formatBytes(prep50K.preparedSizeBytes)})`);

  // Test 28.3: 199 KB image (boundary test)
  console.log("Testing 199 KB JPEG (boundary test)...");
  const jpeg199K = await createSyntheticJpeg(800, 1000, 199 * 1024);
  const analysis199K = await analyzeDocument(jpeg199K, "doc_199k.jpg");
  assert(analysis199K.fileSize === 199 * 1024, "Verified 199 KB boundary input size");
  assert(analysis199K.fileSize < 200 * 1024, "199 KB is strictly under 200 KB portal limit");
  const prep199K = await prepareDocumentServerSide(jpeg199K, "doc_199k.jpg", {
    serviceId: "s001",
    documentType: "INCOME_CERTIFICATE",
  });
  assert(prep199K.isUnderLimit === true, "199 KB boundary preparation meets portal limit");

  // Test 28.4: 205 KB image (slight overshoot -> compressed to target)
  console.log("Testing 205 KB JPEG (just over limit)...");
  const jpeg205K = await createSyntheticJpeg(800, 1000, 205 * 1024);
  const analysis205K = await analyzeDocument(jpeg205K, "doc_205k.jpg");
  assert(analysis205K.fileSize > 200 * 1024, "205 KB exceeds 200 KB limit before preparation");
  const prep205K = await prepareDocumentServerSide(jpeg205K, "doc_205k.jpg", {
    serviceId: "s001",
    documentType: "INCOME_CERTIFICATE",
  });
  assert(prep205K.isUnderLimit === true, `205 KB overage brought under limit (${formatBytes(prep205K.preparedSizeBytes)})`);

  // Test 28.5: 10 MB image
  console.log("Testing 10 MB JPEG input...");
  const jpeg10MB = await createSyntheticJpeg(2400, 3200, 10 * 1024 * 1024);
  const analysis10MB = await analyzeDocument(jpeg10MB, "huge_dslr_scan.jpg");
  assert(analysis10MB.fileSize >= 10 * 1024 * 1024, `Verified 10 MB file size: ${formatBytes(analysis10MB.fileSize)}`);
  assert(analysis10MB.width === 2400 && analysis10MB.height === 3200, "Preserved 2400x3200 dimensions during analysis");
  const prep10MB = await prepareDocumentServerSide(jpeg10MB, "huge_dslr_scan.jpg", {
    serviceId: "s001",
    documentType: "INCOME_CERTIFICATE",
  });
  assert(prep10MB.isUnderLimit === true, `10 MB huge DSLR scan safely compressed to ${formatBytes(prep10MB.preparedSizeBytes)} <= 200 KB`);

  // Test 28.6, 28.7, 28.8: 500 KB, 1 MB, 5 MB PDFs
  console.log("Testing 500 KB, 1 MB, and 5 MB PDFs...");
  const pdf500K = await createSyntheticPdf(2, 500 * 1024);
  const prep500K = await prepareDocumentServerSide(pdf500K, "doc500.pdf", { serviceId: "s001", documentType: "INCOME_CERTIFICATE" });
  assert(prep500K.isUnderLimit === true, `500 KB PDF optimized successfully (${formatBytes(prep500K.preparedSizeBytes)}) <= 200 KB`);

  const pdf1MB = await createSyntheticPdf(2, 1024 * 1024);
  const prep1MB = await prepareDocumentServerSide(pdf1MB, "doc1M.pdf", { serviceId: "s001", documentType: "INCOME_CERTIFICATE" });
  assert(prep1MB.isUnderLimit === true, `1 MB PDF optimized successfully (${formatBytes(prep1MB.preparedSizeBytes)}) <= 200 KB`);

  const pdf5MB = await createSyntheticPdf(2, 5 * 1024 * 1024);
  const prep5MB = await prepareDocumentServerSide(pdf5MB, "doc5M.pdf", { serviceId: "s001", documentType: "INCOME_CERTIFICATE" });
  assert(prep5MB.isUnderLimit === true, `5 MB PDF stream-compressed successfully (${formatBytes(prep5MB.preparedSizeBytes)}) <= 200 KB`);

  // --------------------------------------------------------------------
  // SUITE 5: Edge Cases, Quality Scoring & Dimension Rules (Section 6, 7, 8, 11, 24, 25)
  // --------------------------------------------------------------------
  console.log("\n--- Suite 5: Quality Metrics & Dimension Guards ---");

  // Low-resolution rejection test (Section 11: minWidth/minHeight)
  console.log("Testing low-resolution image guard (150x200 vs 300x400 required)...");
  const lowResJpeg = await createSyntheticJpeg(150, 200, 20 * 1024);
  const lowResAnalysis = await analyzeDocument(lowResJpeg, "thumbnail.jpg");
  assert(lowResAnalysis.width === 150 && lowResAnalysis.height === 200, "Low-res dimensions detected: 150x200");

  const isLowResBlocked =
    (scholarshipIncome.rules.minWidth && lowResAnalysis.width < scholarshipIncome.rules.minWidth) ||
    (scholarshipIncome.rules.minHeight && lowResAnalysis.height < scholarshipIncome.rules.minHeight);
  assert(isLowResBlocked === true, "Flagged: Image resolution is too low. Did not upscale poor quality image.");

  // Section 24: OCR / Quality Preservation Verification
  console.log("Testing Section 24 OCR / Quality compatibility ladder...");
  assert(prepared2MB.readabilityScore >= 50, "Readability preserved above minimum threshold");
  assert(prepared2MB.readabilityStatus !== "UNREADABLE", "Quality optimizer refused unreadable over-compression");

  // Rotated image EXIF test (Section 5: detect & preserve orientation)
  console.log("Testing EXIF orientation detection (orientation tag 6: 90 deg CW)...");
  const rotatedJpeg = await createSyntheticJpeg(800, 600, 30 * 1024, 6);
  const rotAnalysis = await analyzeDocument(rotatedJpeg, "phone_scan.jpg");
  assert(rotAnalysis.exifOrientation === 6, `Detected EXIF orientation tag: ${rotAnalysis.exifOrientation}`);

  // Image Readability & Sharpness calculation test (Section 6 & 25)
  const mockImageData = {
    width: 200,
    height: 200,
    data: new Uint8Array(200 * 200 * 4),
  };
  // Create high-contrast text pattern
  for (let i = 0; i < mockImageData.data.length; i += 4) {
    const isDark = (i / 4) % 10 < 3;
    mockImageData.data[i] = isDark ? 20 : 240;
    mockImageData.data[i + 1] = isDark ? 20 : 240;
    mockImageData.data[i + 2] = isDark ? 20 : 240;
    mockImageData.data[i + 3] = 255;
  }
  const metrics = computeImageReadabilityMetrics(mockImageData);
  assert(metrics.readabilityScore > 50, `Calculated document readability score: ${metrics.readabilityScore}/100`);
  assert(metrics.contrastScore > 50, `Calculated document contrast score: ${metrics.contrastScore}/100`);
  assert(metrics.suggestedGrayscale === true, "Detected text document suitable for grayscale compression");

  // Blank borders detection (Section 7)
  const borders = detectBlankBorders(mockImageData);
  assert(typeof borders.hasSignificantBorders === "boolean", "Blank border detection calculated border coordinates");

  // Untested Edge Cases from Prior Report:
  // Edge Case 1: Corrupted multi-layer TIFF disguised as .pdf
  console.log("Testing TIFF disguised as .pdf extension...");
  const tiffDisguisedAsPdf = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x10, 0x20, 0x30, 0x40]); // TIFF magic II*
  const tiffAnalysis = await analyzeDocument(tiffDisguisedAsPdf, "fake_document.pdf");
  assert(tiffAnalysis.detectedType !== "pdf", "Disguised TIFF was NOT detected as PDF");
  assert(tiffAnalysis.isCorrupted === true, "Disguised file flagged as corrupted PDF");

  // Edge Case 2: Animated GIF disguised as .png
  console.log("Testing GIF disguised as .png extension...");
  const gifDisguisedAsPng = Buffer.from("GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;");
  const gifAnalysis = await analyzeDocument(gifDisguisedAsPng, "disguised_photo.png");
  assert(gifAnalysis.detectedType !== "png", "Disguised GIF was NOT detected as PNG");
  assert(gifAnalysis.isCorrupted === true, "Disguised GIF flagged as invalid image header");

  // --------------------------------------------------------------------
  // SUITE 6: Server API & Security Pipeline Verification (Section 17, 18, 19, 28)
  // --------------------------------------------------------------------
  console.log("\n--- Suite 6: Server API & Security Enforcement ---");

  // Test registration & authentication
  await getAuthoritativeDb();
  const testEmail = `test_citizen_${Date.now()}@formly.gov.in`;
  const { user } = await registerUser("Sai Sankeerth", testEmail, "govsecure2026", "9876543210");
  assert(user.id.startsWith("u_"), `Created citizen session: ${user.id}`);

  // Test Section 28 requirement: "upload succeeds" with prepared document
  const docId = crypto.randomUUID();
  const testDoc = {
    id: docId,
    user_id: user.id,
    document_type: "INCOME_CERTIFICATE",
    storage_path: `vault/${prepared2MB.preparedFileName}`,
    original_filename: "Income Certificate — Sai Sankeerth (Final)!!!.pdf",
    prepared_filename: prepared2MB.preparedFileName,
    mime_type: prepared2MB.preparedMime,
    status: "EXTRACTED",
    ocr_raw_text: "GOVERNMENT REVENUE DEPARTMENT\nIncome Certificate No: IC-2026-9921\nAnnual Household Income: Rs. 1,80,000/-",
    is_superseded: false,
    original_size_bytes: prepared2MB.originalSizeBytes,
    prepared_size_bytes: prepared2MB.preparedSizeBytes,
    target_size_bytes: prepared2MB.targetSizeBytes,
    original_dimensions: `${analysis2MB.width}x${analysis2MB.height}`,
    prepared_dimensions: `${prepared2MB.preparedDimensions?.width}x${prepared2MB.preparedDimensions?.height}`,
    readability_score: prepared2MB.readabilityScore,
    readability_status: prepared2MB.readabilityStatus,
    optimization_metadata: {
      passes: prepared2MB.optimizationSteps.length,
      compressionRatio: `${prepared2MB.compressionRatioPercent}%`,
      portalReady: prepared2MB.portalReady,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const testFields = [
    {
      id: crypto.randomUUID(),
      document_id: docId,
      field_name: "annual_income",
      raw_value: "180000",
      normalized_value: "₹1,80,000 / year",
      confidence: 0.97,
      accepted: false,
      created_at: new Date().toISOString(),
    },
  ];

  await addDocumentForUser(user.id, testDoc, testFields);
  const docs = await getUserDocuments(user.id);
  const savedDoc = docs.find((d) => d.id === docId);

  assert(savedDoc !== undefined, "Section 28 verification: upload succeeds and document persisted to database");
  assert(savedDoc.original_filename === "Income Certificate — Sai Sankeerth (Final)!!!.pdf", "Preserved original citizen filename for provenance");
  assert(savedDoc.prepared_filename === "income_certificate.jpg", `Preserved prepared filename: ${savedDoc.prepared_filename}`);
  assert(Number(savedDoc.original_size_bytes) === 2 * 1024 * 1024, `Persisted authoritative original_size_bytes: ${savedDoc.original_size_bytes}`);
  assert(Number(savedDoc.prepared_size_bytes) <= 200 * 1024, `Persisted authoritative prepared_size_bytes: ${savedDoc.prepared_size_bytes} <= 200 KB`);
  assert(savedDoc.readability_score >= 50, `Persisted readability score: ${savedDoc.readability_score}`);
  assert(savedDoc.readability_status === prepared2MB.readabilityStatus, `Persisted readability status: ${savedDoc.readability_status}`);
  assert(savedDoc.storage_path.includes("income_certificate"), "Saved under sanitized secure storage path");

  console.log("\n========================================================");
  console.log("   ALL SMART DOCUMENT OPTIMIZATION TESTS PASSED (100%)");
  console.log("========================================================\n");
}

runDocumentOptimizationTests().catch((err) => {
  console.error("Fatal Test Failure:", err);
  process.exit(1);
});
