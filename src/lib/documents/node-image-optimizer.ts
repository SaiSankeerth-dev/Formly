import { DocumentRule, computeTargetBytes, formatBytes } from "./document-profiles";
import { DocumentAnalysis } from "./document-analyzer";
import {
  ImageOptimizationResult,
  ImageOptimizationStep,
  ImageOptimizationOptions,
  computeImageReadabilityMetrics,
} from "./image-optimizer";

/**
 * Server-side / Node.js image optimizer using sharp
 * Executes identical progressive optimization ladder, quality scoring, and dimension guards
 */
export async function optimizeImageNode(
  file: File | Blob | Uint8Array,
  analysis: DocumentAnalysis,
  options: ImageOptimizationOptions
): Promise<ImageOptimizationResult> {
  const sharp = (await import("sharp")).default;
  const { rule, forceGrayscale, manualCrop, rotationDegrees } = options;
  const targetBytes = computeTargetBytes(rule);
  const passes: ImageOptimizationStep[] = [];
  const suggestedActions: string[] = [];

  let inputBuffer: Buffer;
  if (file instanceof Uint8Array) {
    inputBuffer = Buffer.from(file);
  } else if (Buffer.isBuffer(file)) {
    inputBuffer = file;
  } else if (typeof (file as any).arrayBuffer === "function") {
    const ab = await file.arrayBuffer();
    inputBuffer = Buffer.from(ab);
  } else {
    throw new Error("Invalid file object provided for server-side image optimization.");
  }

  const origSize = inputBuffer.length;
  let pipeline = sharp(inputBuffer);
  const metadata = await pipeline.metadata();

  const origW = metadata.width || analysis.width || 800;
  const origH = metadata.height || analysis.height || 600;

  // Check minimum dimensions (never upscale low-quality scans)
  if (
    (rule.minWidth && origW < rule.minWidth) ||
    (rule.minHeight && origH < rule.minHeight)
  ) {
    return {
      blob: new Blob([new Uint8Array(inputBuffer)], { type: analysis.mimeType || "image/jpeg" }),
      mimeType: analysis.mimeType || "image/jpeg",
      width: origW,
      height: origH,
      originalSizeBytes: origSize,
      finalSizeBytes: origSize,
      targetSizeBytes: targetBytes,
      isUnderLimit: origSize <= rule.maxFileSizeBytes,
      passes: [],
      readabilityScore: 30,
      contrastScore: 30,
      sharpnessScore: 30,
      readabilityStatus: "UNREADABLE",
      isLowResolution: true,
      warningMessage: "Image resolution is too low. Please upload a clearer scan/photo.",
      suggestedActions: [
        "Scan document with higher resolution (minimum 300x400)",
        "Avoid cropping too tightly before upload",
      ],
    };
  }

  // 1. Auto-correct EXIF orientation
  pipeline = pipeline.rotate();

  // 2. Apply manual rotation if requested
  if (rotationDegrees && rotationDegrees !== 0) {
    pipeline = pipeline.rotate(rotationDegrees);
  }

  // 3. Apply manual crop if requested
  if (manualCrop) {
    pipeline = pipeline.extract({
      left: Math.max(0, manualCrop.x),
      top: Math.max(0, manualCrop.y),
      width: Math.min(origW - manualCrop.x, manualCrop.width),
      height: Math.min(origH - manualCrop.y, manualCrop.height),
    });
  }

  // Determine target format
  let outFormat: "jpeg" | "png" | "webp" = "jpeg";
  let outMime = "image/jpeg";
  if (rule.targetFormat === "jpg") {
    outFormat = "jpeg";
    outMime = "image/jpeg";
  } else if (rule.targetFormat === "same" && analysis.mimeType === "image/png" && analysis.hasAlphaChannel) {
    outFormat = "png";
    outMime = "image/png";
  } else {
    outFormat = "jpeg";
    outMime = "image/jpeg";
  }

  // Initial metadata and resize respecting max limits
  let workingW = origW;
  let workingH = origH;

  if (rule.maxWidth && workingW > rule.maxWidth) {
    const scale = rule.maxWidth / workingW;
    workingW = Math.round(workingW * scale);
    workingH = Math.round(workingH * scale);
  }
  if (rule.maxHeight && workingH > rule.maxHeight) {
    const scale = rule.maxHeight / workingH;
    workingW = Math.round(workingW * scale);
    workingH = Math.round(workingH * scale);
  }

  // If no explicit maxWidth/maxHeight is set on the rule, but the image is very large (> 1600px) and exceeds target:
  // Downscale initial working dimensions so high-resolution DSLR / phone photos do not waste passes or exceed limits.
  const maxInitialDocDim = 1600;
  if (!rule.maxWidth && !rule.maxHeight && origSize > targetBytes && (workingW > maxInitialDocDim || workingH > maxInitialDocDim)) {
    const scale = maxInitialDocDim / Math.max(workingW, workingH);
    workingW = Math.max(rule.minWidth || 250, Math.round(workingW * scale));
    workingH = Math.max(rule.minHeight || 250, Math.round(workingH * scale));
  }

  // Determine Grayscale
  const useGrayscale = forceGrayscale || rule.requiredColorMode === "grayscale";
  if (useGrayscale) {
    pipeline = pipeline.grayscale();
  }

  // Helper to test encode at given quality and dimensions
  const encodeTest = async (w: number, h: number, qualityPct: number) => {
    let testPipe = sharp(inputBuffer).rotate();
    if (rotationDegrees && rotationDegrees !== 0) {
      testPipe = testPipe.rotate(rotationDegrees);
    }
    if (useGrayscale) {
      testPipe = testPipe.grayscale();
    }
    testPipe = testPipe.resize(w, h, { fit: "inside", withoutEnlargement: true });

    if (outFormat === "jpeg") {
      return await testPipe.jpeg({ quality: qualityPct, mozjpeg: true }).toBuffer();
    } else if (outFormat === "png") {
      return await testPipe.png({ compressionLevel: 9 }).toBuffer();
    } else {
      return await testPipe.webp({ quality: qualityPct }).toBuffer();
    }
  };

  // Progressive optimization ladder
  let currentQuality = Math.round((rule.imageQuality ?? 0.88) * 100);
  const minQuality = Math.round((rule.minAcceptableQuality ?? 0.55) * 100);
  let curW = workingW;
  let curH = workingH;

  let bestBuffer: Buffer | null = null;
  let passCount = 0;
  const maxPasses = 10;
  interface CandidatePass {
    buffer: Buffer;
    quality: number;
    width: number;
    height: number;
    size: number;
    readabilityScore: number;
  }
  const candidatePasses: CandidatePass[] = [];

  while (passCount < maxPasses) {
    passCount++;
    const testBuf = await encodeTest(curW, curH, currentQuality);
    const size = testBuf.length;

    // Fast readability metrics from raw pixels
    const { data, info } = await sharp(testBuf).raw().toBuffer({ resolveWithObject: true });
    const rawData = new Uint8ClampedArray(data.length * (4 / info.channels));
    // Normalize into RGBA array for computeImageReadabilityMetrics
    for (let i = 0, j = 0; i < data.length; i += info.channels, j += 4) {
      rawData[j] = data[i];
      rawData[j + 1] = info.channels >= 3 ? data[i + 1] : data[i];
      rawData[j + 2] = info.channels >= 3 ? data[i + 2] : data[i];
      rawData[j + 3] = 255;
    }
    const metrics = computeImageReadabilityMetrics({
      data: rawData,
      width: info.width,
      height: info.height,
    } as ImageData);

    passes.push({
      pass: passCount,
      width: curW,
      height: curH,
      quality: currentQuality / 100,
      sizeBytes: size,
      grayscale: useGrayscale,
      action: `Quality ${currentQuality}% (${formatBytes(size)}) - Readability ${metrics.readabilityScore}/100`,
    });

    candidatePasses.push({
      buffer: testBuf,
      quality: currentQuality,
      width: curW,
      height: curH,
      size,
      readabilityScore: metrics.readabilityScore,
    });

    bestBuffer = testBuf;

    // Check if target is satisfied
    if (size <= targetBytes) {
      break;
    }

    const minW = rule.minWidth || 250;
    const minH = rule.minHeight || 250;

    // Adaptive step down:
    if (currentQuality > minQuality + 10 && size <= targetBytes * 1.5) {
      // Moderate excess: drop quality first
      currentQuality = Math.max(minQuality, currentQuality - 12);
    } else if (curW > minW * 1.1 && curH > minH * 1.1) {
      // Large excess or quality near minQuality: downscale dimensions adaptively
      const ratio = Math.sqrt(targetBytes / size) * 0.95;
      const scaleStep = Math.min(0.85, Math.max(0.60, ratio));
      const nextW = Math.max(minW, Math.round(curW * scaleStep));
      const nextH = Math.max(minH, Math.round(curH * scaleStep));
      if (nextW < curW || nextH < curH) {
        curW = nextW;
        curH = nextH;
        currentQuality = Math.max(minQuality, Math.min(currentQuality, 75));
      } else if (currentQuality > minQuality) {
        currentQuality = minQuality;
      } else {
        break;
      }
    } else if (currentQuality > minQuality) {
      currentQuality = minQuality;
    } else {
      break;
    }
  }

  // Section 24: OCR / Quality Compatibility Selection
  // If multiple passes are <= portal limit, pick the one with the highest readability/contrast
  const qualifyingPasses = candidatePasses.filter((c) => c.size <= rule.maxFileSizeBytes);
  let selectedPass = candidatePasses[candidatePasses.length - 1];

  if (qualifyingPasses.length > 0) {
    qualifyingPasses.sort((a, b) => {
      if (Math.abs(a.readabilityScore - b.readabilityScore) >= 10) {
        return b.readabilityScore - a.readabilityScore; // Prefer higher readability
      }
      return a.size - b.size;
    });
    selectedPass = qualifyingPasses[0];
  }

  const finalBuffer = selectedPass ? selectedPass.buffer : (bestBuffer || inputBuffer);
  const finalSize = finalBuffer.length;
  const isUnderLimit = finalSize <= rule.maxFileSizeBytes;

  // Final quality metrics
  const finalRaw = await sharp(finalBuffer).raw().toBuffer({ resolveWithObject: true });
  const finalClamped = new Uint8ClampedArray(finalRaw.data.length * (4 / finalRaw.info.channels));
  for (let i = 0, j = 0; i < finalRaw.data.length; i += finalRaw.info.channels, j += 4) {
    finalClamped[j] = finalRaw.data[i];
    finalClamped[j + 1] = finalRaw.info.channels >= 3 ? finalRaw.data[i + 1] : finalRaw.data[i];
    finalClamped[j + 2] = finalRaw.info.channels >= 3 ? finalRaw.data[i + 2] : finalRaw.data[i];
    finalClamped[j + 3] = 255;
  }
  const finalMetrics = computeImageReadabilityMetrics({
    data: finalClamped,
    width: finalRaw.info.width,
    height: finalRaw.info.height,
  } as ImageData);

  let readabilityStatus: "EXCELLENT" | "GOOD" | "BORDERLINE" | "UNREADABLE" = "GOOD";
  let warningMessage: string | undefined;

  if (finalMetrics.readabilityScore >= 75) readabilityStatus = "EXCELLENT";
  else if (finalMetrics.readabilityScore >= 55) readabilityStatus = "GOOD";
  else if (finalMetrics.readabilityScore >= 40) readabilityStatus = "BORDERLINE";
  else readabilityStatus = "UNREADABLE";

  if (!isUnderLimit) {
    warningMessage = `This document cannot be safely compressed to ${formatBytes(
      rule.maxFileSizeBytes
    )} without reducing readability.`;
    suggestedActions.push("Enable Grayscale conversion to reduce size by ~40%");
    suggestedActions.push("Auto Crop blank borders");
    suggestedActions.push("Scan in tighter framing or reduce scanner DPI to 150-200");
  }

  return {
    blob: new Blob([new Uint8Array(finalBuffer)], { type: outMime }),
    mimeType: outMime,
    width: finalRaw.info.width,
    height: finalRaw.info.height,
    originalSizeBytes: origSize,
    finalSizeBytes: finalSize,
    targetSizeBytes: targetBytes,
    isUnderLimit,
    passes,
    readabilityScore: finalMetrics.readabilityScore,
    contrastScore: finalMetrics.contrastScore,
    sharpnessScore: finalMetrics.sharpnessScore,
    readabilityStatus,
    isLowResolution: false,
    warningMessage,
    suggestedActions,
  };
}
