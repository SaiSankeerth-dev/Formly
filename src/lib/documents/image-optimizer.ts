import { DocumentRule, computeTargetBytes, formatBytes } from "./document-profiles";
import { DocumentAnalysis } from "./document-analyzer";

export interface ImageOptimizationStep {
  pass: number;
  width: number;
  height: number;
  quality: number;
  sizeBytes: number;
  grayscale: boolean;
  action: string;
}

export interface ImageOptimizationOptions {
  rule: DocumentRule;
  forceGrayscale?: boolean;
  manualCrop?: { x: number; y: number; width: number; height: number };
  autoCropBlankBorders?: boolean;
  rotationDegrees?: number; // 0, 90, 180, 270
}

export interface ImageOptimizationResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  originalSizeBytes: number;
  finalSizeBytes: number;
  targetSizeBytes: number;
  isUnderLimit: boolean;
  passes: ImageOptimizationStep[];
  readabilityScore: number;
  contrastScore: number;
  sharpnessScore: number;
  readabilityStatus: "EXCELLENT" | "GOOD" | "BORDERLINE" | "UNREADABLE";
  isLowResolution: boolean;
  warningMessage?: string;
  suggestedActions: string[];
}

/**
 * Fast pixel-based calculation of image contrast and sharpness (Laplacian variance proxy)
 */
export function computeImageReadabilityMetrics(imageData: ImageData): {
  readabilityScore: number;
  contrastScore: number;
  sharpnessScore: number;
  suggestedGrayscale: boolean;
} {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  if (pixelCount === 0) {
    return { readabilityScore: 0, contrastScore: 0, sharpnessScore: 0, suggestedGrayscale: false };
  }

  let lumSum = 0;
  let lumSqSum = 0;
  let laplacianSum = 0;
  let colorDifferenceSum = 0;

  // Sample every Nth pixel for speed on large canvases
  const stride = Math.max(1, Math.floor(Math.sqrt(pixelCount) / 150));
  let sampled = 0;

  // 1. Contrast and Color Saturation
  for (let i = 0; i < data.length; i += 4 * stride) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    lumSum += lum;
    lumSqSum += lum * lum;
    colorDifferenceSum += Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
    sampled++;
  }

  const meanLum = lumSum / sampled;
  const varianceLum = Math.max(0, lumSqSum / sampled - meanLum * meanLum);
  const stdDev = Math.sqrt(varianceLum); // Typical range 20 - 90
  const contrastScore = Math.min(100, Math.round((stdDev / 70) * 100));

  // If color difference is low, document is mostly black & white text or grayscale scan
  const avgColorDiff = colorDifferenceSum / sampled;
  const suggestedGrayscale = avgColorDiff < 18;

  // 2. Sharpness / Edge energy using horizontal/vertical difference gradient
  let edgeSampled = 0;
  for (let y = 1; y < height - 1; y += stride * 2) {
    for (let x = 1; x < width - 1; x += stride * 2) {
      const idx = (y * width + x) * 4;
      const left = ((y * width + (x - 1)) * 4);
      const right = ((y * width + (x + 1)) * 4);
      const top = (((y - 1) * width + x) * 4);
      const bottom = (((y + 1) * width + x) * 4);

      const centerLum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const leftLum = 0.299 * data[left] + 0.587 * data[left + 1] + 0.114 * data[left + 2];
      const rightLum = 0.299 * data[right] + 0.587 * data[right + 1] + 0.114 * data[right + 2];
      const topLum = 0.299 * data[top] + 0.587 * data[top + 1] + 0.114 * data[top + 2];
      const bottomLum = 0.299 * data[bottom] + 0.587 * data[bottom + 1] + 0.114 * data[bottom + 2];

      const lap = Math.abs(4 * centerLum - leftLum - rightLum - topLum - bottomLum);
      laplacianSum += lap;
      edgeSampled++;
    }
  }

  const meanEdge = edgeSampled > 0 ? laplacianSum / edgeSampled : 0;
  const sharpnessScore = Math.min(100, Math.round((meanEdge / 35) * 100));

  // Combined readability score (60% sharpness + 40% contrast)
  const readabilityScore = Math.min(100, Math.round(sharpnessScore * 0.6 + contrastScore * 0.4));

  return { readabilityScore, contrastScore, sharpnessScore, suggestedGrayscale };
}

/**
 * Detect white/blank borders around document for auto-cropping
 */
export function detectBlankBorders(
  imageData: ImageData,
  threshold: number = 240
): { top: number; bottom: number; left: number; right: number; hasSignificantBorders: boolean } {
  const { data, width, height } = imageData;

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  const isRowBlank = (y: number) => {
    let nonBlank = 0;
    const yOffset = y * width * 4;
    for (let x = 0; x < width; x += 4) {
      const idx = yOffset + x * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < threshold) nonBlank++;
      if (nonBlank > width * 0.02) return false;
    }
    return true;
  };

  const isColBlank = (x: number) => {
    let nonBlank = 0;
    for (let y = 0; y < height; y += 4) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < threshold) nonBlank++;
      if (nonBlank > height * 0.02) return false;
    }
    return true;
  };

  while (top < height * 0.25 && isRowBlank(top)) top++;
  while (bottom > height * 0.75 && isRowBlank(bottom)) bottom--;
  while (left < width * 0.25 && isColBlank(left)) left++;
  while (right > width * 0.75 && isColBlank(right)) right--;

  const croppedW = right - left;
  const croppedH = bottom - top;
  const hasSignificantBorders = top > 15 || height - bottom > 15 || left > 15 || width - right > 15;

  return {
    top: Math.max(0, top - 4),
    bottom: Math.min(height, bottom + 4),
    left: Math.max(0, left - 4),
    right: Math.min(width, right + 4),
    hasSignificantBorders: hasSignificantBorders && croppedW > 100 && croppedH > 100,
  };
}

/**
 * Smart progressive optimizer for Image files (JPEG, PNG, WebP)
 */
export async function optimizeImageFile(
  file: File | Blob,
  analysis: DocumentAnalysis,
  options: ImageOptimizationOptions
): Promise<ImageOptimizationResult> {
  const { rule, forceGrayscale, manualCrop, autoCropBlankBorders, rotationDegrees } = options;
  const targetBytes = computeTargetBytes(rule);
  const passes: ImageOptimizationStep[] = [];
  const suggestedActions: string[] = [];

  // Check minimum dimensions before touching image (never upscale low-quality scans)
  const origW = analysis.width || 800;
  const origH = analysis.height || 600;

  if (
    (rule.minWidth && origW < rule.minWidth) ||
    (rule.minHeight && origH < rule.minHeight)
  ) {
    return {
      blob: file,
      mimeType: analysis.mimeType,
      width: origW,
      height: origH,
      originalSizeBytes: file.size,
      finalSizeBytes: file.size,
      targetSizeBytes: targetBytes,
      isUnderLimit: file.size <= rule.maxFileSizeBytes,
      passes: [],
      readabilityScore: 30,
      contrastScore: 30,
      sharpnessScore: 30,
      readabilityStatus: "UNREADABLE",
      isLowResolution: true,
      warningMessage: "Image resolution is too low. Please upload a clearer scan/photo.",
      suggestedActions: ["Scan document with higher resolution (minimum 300x400)", "Avoid cropping too tightly before upload"],
    };
  }

  // Load image into HTML Image object (browser environment)
  let img: HTMLImageElement;
  let objectUrl: string = "";
  try {
    img = new Image();
    objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to decode image in browser canvas."));
    });
  } catch (err: any) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw new Error(`Image decoding failed: ${err.message}`);
  }

  // Determine initial dimensions respecting max limits and preserving aspect ratio
  let curW = img.naturalWidth || origW;
  let curH = img.naturalHeight || origH;

  // Apply EXIF orientation swap if 90 or 270 deg
  if (analysis.exifOrientation && [5, 6, 7, 8].includes(analysis.exifOrientation)) {
    const temp = curW;
    curW = curH;
    curH = temp;
  }

  // Apply manual crop if specified
  let cropX = 0;
  let cropY = 0;
  let cropW = curW;
  let cropH = curH;

  if (manualCrop) {
    cropX = Math.max(0, manualCrop.x);
    cropY = Math.max(0, manualCrop.y);
    cropW = Math.min(curW - cropX, manualCrop.width);
    cropH = Math.min(curH - cropY, manualCrop.height);
  }

  // Respect maximum dimension constraint
  let scale = 1.0;
  if (rule.maxWidth && cropW > rule.maxWidth) {
    scale = Math.min(scale, rule.maxWidth / cropW);
  }
  if (rule.maxHeight && cropH > rule.maxHeight) {
    scale = Math.min(scale, rule.maxHeight / cropH);
  }

  // If no explicit maxWidth/maxHeight is set on the rule, but the image is very large (> 1600px) and exceeds target:
  const maxInitialDocDim = 1600;
  if (!rule.maxWidth && !rule.maxHeight && file.size > targetBytes && (cropW > maxInitialDocDim || cropH > maxInitialDocDim)) {
    scale = Math.min(scale, maxInitialDocDim / Math.max(cropW, cropH));
  }

  curW = Math.round(cropW * scale);
  curH = Math.round(cropH * scale);

  // Setup Canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Unable to create 2D canvas context.");
  }

  canvas.width = curW;
  canvas.height = curH;

  // Render with optional rotation
  ctx.save();
  if (rotationDegrees && rotationDegrees !== 0) {
    const rad = (rotationDegrees * Math.PI) / 180;
    if (rotationDegrees === 90 || rotationDegrees === 270) {
      canvas.width = curH;
      canvas.height = curW;
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, cropX, cropY, cropW, cropH, -curW / 2, -curH / 2, curW, curH);
  } else {
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, curW, curH);
  }
  ctx.restore();

  URL.revokeObjectURL(objectUrl);

  // Inspect readability metrics
  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const metrics = computeImageReadabilityMetrics(fullImageData);

  // Check for auto-crop of blank borders if requested or border exists
  if (autoCropBlankBorders) {
    const borders = detectBlankBorders(fullImageData);
    if (borders.hasSignificantBorders) {
      const newW = borders.right - borders.left;
      const newH = borders.bottom - borders.top;
      const croppedData = ctx.getImageData(borders.left, borders.top, newW, newH);
      canvas.width = newW;
      canvas.height = newH;
      ctx.putImageData(croppedData, 0, 0);
      curW = newW;
      curH = newH;
      suggestedActions.push("Auto-cropped blank page borders to reduce file size");
    }
  }

  // Grayscale decision
  let useGrayscale = forceGrayscale || rule.requiredColorMode === "grayscale";
  if (!useGrayscale && rule.requiredColorMode !== "color" && metrics.suggestedGrayscale) {
    // If predominantly text and grayscale reduces size, use grayscale
    useGrayscale = true;
  }

  if (useGrayscale) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Target format: JPEG is optimal for documents, unless PNG is requested with transparency
  let outMime = "image/jpeg";
  if (rule.targetFormat === "jpg") outMime = "image/jpeg";
  else if (rule.targetFormat === "same" && analysis.mimeType) {
    outMime = analysis.mimeType === "image/png" && analysis.hasAlphaChannel ? "image/png" : "image/jpeg";
  }

  // Helper to convert canvas to Blob
  const canvasToBlob = (quality: number): Promise<Blob> =>
    new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), outMime, quality);
    });

  // Iterative progressive optimization loop
  let currentQuality = rule.imageQuality ?? 0.88;
  const minQuality = rule.minAcceptableQuality ?? 0.55;
  let bestBlob: Blob | null = null;
  let passCount = 0;
  const maxPasses = 10; // Safety guard: bounded iterations

  while (passCount < maxPasses) {
    passCount++;
    const testBlob = await canvasToBlob(currentQuality);
    const size = testBlob.size;

    passes.push({
      pass: passCount,
      width: canvas.width,
      height: canvas.height,
      quality: currentQuality,
      sizeBytes: size,
      grayscale: useGrayscale,
      action: `Quality ${Math.round(currentQuality * 100)}% (${formatBytes(size)})`,
    });

    bestBlob = testBlob;

    // Check if target is satisfied
    if (size <= targetBytes) {
      break;
    }

    const minW = rule.minWidth || 250;
    const minH = rule.minHeight || 250;

    if (currentQuality > minQuality + 0.10 && size <= targetBytes * 1.5) {
      // Moderate excess: drop quality first
      currentQuality = Math.max(minQuality, Number((currentQuality - 0.12).toFixed(2)));
    } else if (canvas.width > minW * 1.1 && canvas.height > minH * 1.1) {
      // Large excess: downscale dimensions adaptively
      const ratio = Math.sqrt(targetBytes / size) * 0.95;
      const scaleStep = Math.min(0.85, Math.max(0.60, ratio));
      const nextW = Math.max(minW, Math.round(canvas.width * scaleStep));
      const nextH = Math.max(minH, Math.round(canvas.height * scaleStep));

      if (nextW < canvas.width || nextH < canvas.height) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = nextW;
        tempCanvas.height = nextH;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0, nextW, nextH);
          canvas.width = nextW;
          canvas.height = nextH;
          ctx.drawImage(tempCanvas, 0, 0);
        }
        currentQuality = Math.max(minQuality, Math.min(Number((currentQuality + 0.05).toFixed(2)), 0.75));
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

  const finalBlob = bestBlob || (await canvasToBlob(minQuality));
  const finalSize = finalBlob.size;
  const isUnderLimit = finalSize <= rule.maxFileSizeBytes;

  // Final quality assessment
  let readabilityStatus: "EXCELLENT" | "GOOD" | "BORDERLINE" | "UNREADABLE" = "GOOD";
  let warningMessage: string | undefined;

  if (metrics.readabilityScore >= 75) readabilityStatus = "EXCELLENT";
  else if (metrics.readabilityScore >= 55) readabilityStatus = "GOOD";
  else if (metrics.readabilityScore >= 40) readabilityStatus = "BORDERLINE";
  else readabilityStatus = "UNREADABLE";

  if (!isUnderLimit) {
    warningMessage = `This document cannot be safely compressed to ${formatBytes(
      rule.maxFileSizeBytes
    )} without reducing readability.`;
    suggestedActions.push("Enable Grayscale conversion to reduce size by ~40%");
    suggestedActions.push("Auto Crop blank borders");
    suggestedActions.push("Scan in tighter framing or reduce scanner DPI to 150-200");
  } else if (readabilityStatus === "BORDERLINE" || readabilityStatus === "UNREADABLE") {
    warningMessage = "Document compressed successfully, but text clarity is low.";
    suggestedActions.push("Ensure source scan has high contrast");
  }

  return {
    blob: finalBlob,
    mimeType: outMime,
    width: canvas.width,
    height: canvas.height,
    originalSizeBytes: file.size,
    finalSizeBytes: finalSize,
    targetSizeBytes: targetBytes,
    isUnderLimit,
    passes,
    readabilityScore: metrics.readabilityScore,
    contrastScore: metrics.contrastScore,
    sharpnessScore: metrics.sharpnessScore,
    readabilityStatus,
    isLowResolution: false,
    warningMessage,
    suggestedActions,
  };
}
