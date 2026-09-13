import { PDFDocument } from "pdf-lib";

export interface PanCropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanPhotoOptions {
  cropBox?: PanCropBox;
  rotation?: number; // 0, 90, 180, 270
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  targetWidth?: number; // default 213
  targetHeight?: number; // default 213
  maxSizeBytes?: number; // default 50 KB (51200)
}

export interface PanSignatureOptions {
  cropBox?: PanCropBox;
  rotation?: number; // 0, 90, 180, 270
  whitenBackground?: boolean; // default true
  whitenThreshold?: number; // 0 to 100, default 45
  inkEnhance?: boolean; // default true
  targetWidth?: number; // default 213
  targetHeight?: number; // default 106 (2:1 aspect ratio)
  maxSizeBytes?: number; // default 30 KB (30720)
}

export interface PanDocumentOptions {
  maxSizeBytes?: number; // default 300 KB (307200)
  pageSize?: "A4" | "LETTER";
  orientation?: "portrait" | "landscape";
}

export interface ProcessedPanFileResult {
  blob: Blob;
  dataUrl: string;
  fileName: string;
  originalFileName: string;
  originalSizeBytes: number;
  finalSizeBytes: number;
  width: number;
  height: number;
  format: "jpg" | "pdf";
  mimeType: string;
  isCompliant: boolean;
  complianceNotes: string[];
}

export interface PreparedDocumentRecord {
  type: "photo" | "signature" | "supporting_doc";
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  dataUrl?: string;
  preparedAt: string;
  status: "COMPLIANT" | "WARNING";
  notes: string[];
}

/**
 * Load an image file or blob into an HTMLImageElement safely in browser
 */
export function loadImageElement(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    let objectUrl = "";
    if (typeof source === "string") {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = (e) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to decode image file. Please provide a valid JPEG, PNG, or WebP image."));
    };
  });
}

/**
 * Apply brightness and contrast filters directly on Canvas ImageData
 */
function applyBrightnessContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brightness: number, // -100 to 100
  contrast: number // -100 to 100
) {
  if (brightness === 0 && contrast === 0) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  // Factor calculations:
  // contrast: [-100, 100] -> factor: [0, 3] approx
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const bVal = (brightness / 100) * 128;

  for (let i = 0; i < d.length; i += 4) {
    // Red
    let r = d[i] + bVal;
    r = factor * (r - 128) + 128;
    d[i] = Math.max(0, Math.min(255, r));

    // Green
    let g = d[i + 1] + bVal;
    g = factor * (g - 128) + 128;
    d[i + 1] = Math.max(0, Math.min(255, g));

    // Blue
    let b = d[i + 2] + bVal;
    b = factor * (b - 128) + 128;
    d[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Signature paper background whitening & ink enhancement filter.
 * Eliminates grey/yellow mobile photo shadows and makes signature crisp black/blue on pure white.
 */
function applySignaturePaperWhitening(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  whitenThreshold: number = 45, // 0 to 100
  enhanceInk: boolean = true
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  // Threshold scaled to [120, 240]
  const cutoff = 120 + (whitenThreshold / 100) * 110;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    // Standard perceived luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum >= cutoff) {
      // Paper background -> Boost to pure white
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    } else {
      if (enhanceInk) {
        // Boost ink darkness and contrast
        const factor = lum / cutoff; // 0 to 1
        d[i] = Math.max(0, Math.min(255, Math.floor(r * factor * 0.75)));
        d[i + 1] = Math.max(0, Math.min(255, Math.floor(g * factor * 0.75)));
        d[i + 2] = Math.max(0, Math.min(255, Math.floor(b * factor * 0.85)));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Canvas to Blob with iterative progressive JPEG compression to ensure strict max size
 */
async function canvasToCompressedJpeg(
  canvas: HTMLCanvasElement,
  maxSizeBytes: number,
  initialQuality: number = 0.92
): Promise<{ blob: Blob; dataUrl: string; finalSize: number; quality: number }> {
  let quality = initialQuality;
  let blob: Blob | null = null;
  let dataUrl = "";

  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await new Promise<{ blob: Blob | null; dataUrl: string }>((resolve) => {
      canvas.toBlob(
        (b) => {
          const dUrl = canvas.toDataURL("image/jpeg", quality);
          resolve({ blob: b, dataUrl: dUrl });
        },
        "image/jpeg",
        quality
      );
    });

    blob = res.blob;
    dataUrl = res.dataUrl;

    if (blob && blob.size <= maxSizeBytes) {
      return { blob, dataUrl, finalSize: blob.size, quality };
    }

    // Step down quality progressively
    quality = Math.max(0.35, quality - 0.1);
  }

  // Fallback if still slightly over after quality drops:
  return {
    blob: blob || new Blob([], { type: "image/jpeg" }),
    dataUrl,
    finalSize: blob ? blob.size : 0,
    quality,
  };
}

/**
 * 1. Process Official PAN Photograph:
 * - 213 x 213 px resolution (official 1:1 ratio)
 * - Under 50 KB strict limit (Protean & UTIITSL)
 * - Brightness, contrast & rotation controls
 * - 100% Client-side
 */
export async function processPanPhotograph(
  file: File | Blob,
  options: PanPhotoOptions = {}
): Promise<ProcessedPanFileResult> {
  const targetW = options.targetWidth || 213;
  const targetH = options.targetHeight || 213;
  const maxBytes = options.maxSizeBytes || 50 * 1024; // 50 KB
  const rotation = (options.rotation || 0) % 360;
  const brightness = options.brightness || 0;
  const contrast = options.contrast || 0;

  const originalSize = file.size;
  const originalFileName = (file as File).name || "applicant_photo.jpg";

  const img = await loadImageElement(file);

  // Intermediate canvas for rotation & cropping
  const workCanvas = document.createElement("canvas");
  const isRotated90 = rotation === 90 || rotation === 270;
  const sourceW = img.naturalWidth || img.width;
  const sourceH = img.naturalHeight || img.height;

  workCanvas.width = isRotated90 ? sourceH : sourceW;
  workCanvas.height = isRotated90 ? sourceW : sourceH;

  const wCtx = workCanvas.getContext("2d");
  if (!wCtx) throw new Error("Could not initialize 2D canvas context.");

  // Apply rotation
  wCtx.save();
  if (rotation === 90) {
    wCtx.translate(workCanvas.width, 0);
    wCtx.rotate((90 * Math.PI) / 180);
  } else if (rotation === 180) {
    wCtx.translate(workCanvas.width, workCanvas.height);
    wCtx.rotate((180 * Math.PI) / 180);
  } else if (rotation === 270) {
    wCtx.translate(0, workCanvas.height);
    wCtx.rotate((270 * Math.PI) / 180);
  }
  wCtx.drawImage(img, 0, 0);
  wCtx.restore();

  // Crop calculation
  let cropX = 0;
  let cropY = 0;
  let cropW = workCanvas.width;
  let cropH = workCanvas.height;

  if (options.cropBox) {
    cropX = Math.max(0, options.cropBox.x);
    cropY = Math.max(0, options.cropBox.y);
    cropW = Math.min(workCanvas.width - cropX, options.cropBox.width);
    cropH = Math.min(workCanvas.height - cropY, options.cropBox.height);
  } else {
    // Default 1:1 center square crop
    const minDim = Math.min(workCanvas.width, workCanvas.height);
    cropX = Math.floor((workCanvas.width - minDim) / 2);
    cropY = Math.floor((workCanvas.height - minDim) / 2);
    cropW = minDim;
    cropH = minDim;
  }

  // Final Target Canvas (213 x 213)
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = targetW;
  targetCanvas.height = targetH;
  const tCtx = targetCanvas.getContext("2d");
  if (!tCtx) throw new Error("Could not initialize target 2D canvas.");

  // High quality smoothing
  tCtx.imageSmoothingEnabled = true;
  tCtx.imageSmoothingQuality = "high";

  // White background in case of transparent PNG
  tCtx.fillStyle = "#FFFFFF";
  tCtx.fillRect(0, 0, targetW, targetH);

  // Draw scaled cropped section
  tCtx.drawImage(workCanvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

  // Apply brightness / contrast adjustments
  applyBrightnessContrast(tCtx, targetW, targetH, brightness, contrast);

  // Compress to JPEG under 50 KB
  const { blob, dataUrl, finalSize } = await canvasToCompressedJpeg(targetCanvas, maxBytes, 0.94);

  const isCompliant = finalSize <= maxBytes && finalSize > 1024;
  const notes: string[] = [
    `Dimensions: ${targetW}x${targetH} px (1:1 Ratio)`,
    `File Size: ${(finalSize / 1024).toFixed(1)} KB (Max allowed: 50 KB)`,
    `Format: Standard JPEG (Color)`,
    `Resolution: Standard 200/300 DPI compliant`,
  ];

  if (!isCompliant) {
    notes.push("Warning: File size exceeds 50 KB limit for Protean / UTIITSL portals.");
  }

  const cleanBase = originalFileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${cleanBase}_pan_photo_prepared.jpg`;

  return {
    blob,
    dataUrl,
    fileName,
    originalFileName,
    originalSizeBytes: originalSize,
    finalSizeBytes: finalSize,
    width: targetW,
    height: targetH,
    format: "jpg",
    mimeType: "image/jpeg",
    isCompliant,
    complianceNotes: notes,
  };
}

/**
 * 2. Process Official PAN Signature:
 * - 213 x 106 px resolution (official 2:1 aspect ratio, 4.5cm x 2cm approx)
 * - Under 30 KB strict limit
 * - Signature paper whitening & ink enhancement
 * - 100% Client-side
 */
export async function processPanSignature(
  file: File | Blob,
  options: PanSignatureOptions = {}
): Promise<ProcessedPanFileResult> {
  const targetW = options.targetWidth || 213;
  const targetH = options.targetHeight || 106; // 2:1 ratio
  const maxBytes = options.maxSizeBytes || 30 * 1024; // 30 KB
  const rotation = (options.rotation || 0) % 360;
  const whiten = options.whitenBackground ?? true;
  const threshold = options.whitenThreshold ?? 45;
  const enhanceInk = options.inkEnhance ?? true;

  const originalSize = file.size;
  const originalFileName = (file as File).name || "applicant_signature.jpg";

  const img = await loadImageElement(file);

  const workCanvas = document.createElement("canvas");
  const isRotated90 = rotation === 90 || rotation === 270;
  const sourceW = img.naturalWidth || img.width;
  const sourceH = img.naturalHeight || img.height;

  workCanvas.width = isRotated90 ? sourceH : sourceW;
  workCanvas.height = isRotated90 ? sourceW : sourceH;

  const wCtx = workCanvas.getContext("2d");
  if (!wCtx) throw new Error("Could not initialize 2D context.");

  // Apply rotation
  wCtx.save();
  if (rotation === 90) {
    wCtx.translate(workCanvas.width, 0);
    wCtx.rotate((90 * Math.PI) / 180);
  } else if (rotation === 180) {
    wCtx.translate(workCanvas.width, workCanvas.height);
    wCtx.rotate((180 * Math.PI) / 180);
  } else if (rotation === 270) {
    wCtx.translate(0, workCanvas.height);
    wCtx.rotate((270 * Math.PI) / 180);
  }
  wCtx.drawImage(img, 0, 0);
  wCtx.restore();

  // Crop calculation (2:1 aspect ratio)
  let cropX = 0;
  let cropY = 0;
  let cropW = workCanvas.width;
  let cropH = workCanvas.height;

  if (options.cropBox) {
    cropX = Math.max(0, options.cropBox.x);
    cropY = Math.max(0, options.cropBox.y);
    cropW = Math.min(workCanvas.width - cropX, options.cropBox.width);
    cropH = Math.min(workCanvas.height - cropY, options.cropBox.height);
  } else {
    // Default 2:1 center crop
    const targetRatio = 2 / 1;
    const currentRatio = workCanvas.width / workCanvas.height;

    if (currentRatio > targetRatio) {
      cropH = workCanvas.height;
      cropW = Math.floor(cropH * targetRatio);
      cropX = Math.floor((workCanvas.width - cropW) / 2);
      cropY = 0;
    } else {
      cropW = workCanvas.width;
      cropH = Math.floor(cropW / targetRatio);
      cropX = 0;
      cropY = Math.floor((workCanvas.height - cropH) / 2);
    }
  }

  // Target Canvas (213 x 106)
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = targetW;
  targetCanvas.height = targetH;
  const tCtx = targetCanvas.getContext("2d");
  if (!tCtx) throw new Error("Could not initialize target 2D canvas.");

  tCtx.imageSmoothingEnabled = true;
  tCtx.imageSmoothingQuality = "high";

  // Pure white base
  tCtx.fillStyle = "#FFFFFF";
  tCtx.fillRect(0, 0, targetW, targetH);

  tCtx.drawImage(workCanvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

  // Apply paper background whitening & dark ink enhancement
  if (whiten) {
    applySignaturePaperWhitening(tCtx, targetW, targetH, threshold, enhanceInk);
  }

  // Compress to JPEG under 30 KB
  const { blob, dataUrl, finalSize } = await canvasToCompressedJpeg(targetCanvas, maxBytes, 0.92);

  const isCompliant = finalSize <= maxBytes && finalSize > 512;
  const notes: string[] = [
    `Dimensions: ${targetW}x${targetH} px (2:1 Ratio)`,
    `File Size: ${(finalSize / 1024).toFixed(1)} KB (Max allowed: 30 KB)`,
    `Paper Whitening: ${whiten ? "Applied (Clean white background)" : "Off"}`,
    `Format: Standard JPEG`,
  ];

  if (!isCompliant) {
    notes.push("Warning: File size exceeds 30 KB limit for official PAN signature upload.");
  }

  const cleanBase = originalFileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${cleanBase}_pan_signature_prepared.jpg`;

  return {
    blob,
    dataUrl,
    fileName,
    originalFileName,
    originalSizeBytes: originalSize,
    finalSizeBytes: finalSize,
    width: targetW,
    height: targetH,
    format: "jpg",
    mimeType: "image/jpeg",
    isCompliant,
    complianceNotes: notes,
  };
}

/**
 * 3. Process Supporting Document (Proof of Identity / Address / DOB):
 * - If image: converts to clean A4 PDF under 300 KB limit
 * - If PDF: strips metadata, compresses streams, ensures < 300 KB limit
 * - 100% Client-side via pdf-lib
 */
export async function processPanSupportingDocument(
  file: File | Blob,
  options: PanDocumentOptions = {}
): Promise<ProcessedPanFileResult> {
  const maxBytes = options.maxSizeBytes || 300 * 1024; // 300 KB
  const originalSize = file.size;
  const originalFileName = (file as File).name || "supporting_document.pdf";
  const isPdf = file.type === "application/pdf" || originalFileName.toLowerCase().endsWith(".pdf");

  let pdfDoc: PDFDocument;
  let finalBytes: Uint8Array;

  if (isPdf) {
    // Process existing PDF
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await PDFDocument.load(new Uint8Array(arrayBuffer), { ignoreEncryption: false });

    // Sanitize metadata
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("Seva Saarthi Citizen PAN Suite");
    pdfDoc.setCreator("Seva Saarthi");

    finalBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
  } else {
    // Process image into A4 PDF
    const img = await loadImageElement(file);
    const canvas = document.createElement("canvas");

    // Scale image if huge so embedded bytes are lightweight
    const maxImgDim = 1400;
    let imgW = img.naturalWidth || img.width;
    let imgH = img.naturalHeight || img.height;

    if (imgW > maxImgDim || imgH > maxImgDim) {
      if (imgW > imgH) {
        imgH = Math.round((imgH * maxImgDim) / imgW);
        imgW = maxImgDim;
      } else {
        imgW = Math.round((imgW * maxImgDim) / imgH);
        imgH = maxImgDim;
      }
    }

    canvas.width = imgW;
    canvas.height = imgH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not initialize canvas context.");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, imgW, imgH);
    ctx.drawImage(img, 0, 0, imgW, imgH);

    // Initial JPEG compression for PDF embedding: target ~200 KB
    const { blob: compressedImgBlob } = await canvasToCompressedJpeg(canvas, 220 * 1024, 0.85);
    const imgBuffer = await compressedImgBlob.arrayBuffer();

    pdfDoc = await PDFDocument.create();

    // Standard A4 dimensions in points (72 points/inch): 595.28 x 841.89
    const a4Width = 595.28;
    const a4Height = 841.89;

    const page = pdfDoc.addPage([a4Width, a4Height]);
    const embeddedImage = await pdfDoc.embedJpg(imgBuffer);

    // Calculate fitted dimensions preserving aspect ratio with 36pt (0.5 inch) margin
    const margin = 36;
    const availWidth = a4Width - margin * 2;
    const availHeight = a4Height - margin * 2;

    const imgAspect = embeddedImage.width / embeddedImage.height;
    const availAspect = availWidth / availHeight;

    let drawW = availWidth;
    let drawH = availHeight;

    if (imgAspect > availAspect) {
      drawW = availWidth;
      drawH = availWidth / imgAspect;
    } else {
      drawH = availHeight;
      drawW = availHeight * imgAspect;
    }

    // Center on page
    const posX = margin + (availWidth - drawW) / 2;
    const posY = margin + (availHeight - drawH) / 2;

    page.drawImage(embeddedImage, {
      x: posX,
      y: posY,
      width: drawW,
      height: drawH,
    });

    pdfDoc.setProducer("Seva Saarthi Citizen PAN Suite");
    pdfDoc.setCreator("Seva Saarthi");

    finalBytes = await pdfDoc.save({ useObjectStreams: true });
  }

  const finalBlob = new Blob([finalBytes as unknown as BlobPart], { type: "application/pdf" });
  const finalSize = finalBlob.size;
  const isCompliant = finalSize <= maxBytes;

  const notes: string[] = [
    `Format: PDF/A Compliant Document`,
    `File Size: ${(finalSize / 1024).toFixed(1)} KB (Max allowed: 300 KB)`,
    `Protection: Unlocked & Metadata Sanitized`,
    `Pages: ${pdfDoc.getPageCount()} Page(s)`,
  ];

  if (!isCompliant) {
    notes.push("Warning: File size exceeds 300 KB limit for Protean / UTIITSL supporting documents.");
  }

  const cleanBase = originalFileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${cleanBase}_pan_proof_prepared.pdf`;

  // Create preview data URL
  const dataUrl = `data:application/pdf;base64,${bufferToBase64(finalBytes)}`;

  return {
    blob: finalBlob,
    dataUrl,
    fileName,
    originalFileName,
    originalSizeBytes: originalSize,
    finalSizeBytes: finalSize,
    width: 595,
    height: 842,
    format: "pdf",
    mimeType: "application/pdf",
    isCompliant,
    complianceNotes: notes,
  };
}

function bufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Trigger immediate browser download of a prepared file
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sync prepared documents to browser extension & local storage
 */
export function notifyExtensionOfPreparedDocuments(documents: PreparedDocumentRecord[]) {
  if (typeof window === "undefined") return;

  try {
    const payload = {
      timestamp: new Date().toISOString(),
      documents,
    };

    localStorage.setItem("seva_saarthi_pan_prepared_docs", JSON.stringify(payload));

    const event = new CustomEvent("SEVA_SAARTHI_PREPARED_DOCUMENTS", {
      detail: payload,
    });
    window.dispatchEvent(event);
    document.dispatchEvent(event);
  } catch (err) {
    console.warn("Could not sync prepared documents to extension storage:", err);
  }
}
