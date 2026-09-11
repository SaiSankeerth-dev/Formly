export type DetectedFileType = "pdf" | "jpeg" | "png" | "webp" | "heic" | "unknown";

export interface DocumentAnalysis {
  fileSize: number;
  mimeType: string;
  detectedType: DetectedFileType;
  isEncryptedPdf: boolean;
  pageCount?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation?: "portrait" | "landscape" | "square";
  hasAlphaChannel?: boolean;
  exifOrientation?: number;
  estimatedDpi?: number;
  isCorrupted: boolean;
  errorMessage?: string;
}

/**
 * Detect file type by inspecting magic bytes
 */
export function detectMagicBytes(bytes: Uint8Array): DetectedFileType {
  if (bytes.length < 4) return "unknown";

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return "png";
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  // WebP: RIFF .... WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  // HEIC / HEIF: ....ftypheic or ftypmif1 or ftypmsf1 or ftypheix
  if (bytes.length >= 12) {
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (ftyp === "ftyp") {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
      if (["heic", "heix", "mif1", "msf1", "hevc"].includes(brand)) {
        return "heic";
      }
    }
  }

  return "unknown";
}

/**
 * Parse JPEG binary stream to extract dimensions and EXIF orientation
 */
export function parseJpegMetadata(bytes: Uint8Array): {
  width?: number;
  height?: number;
  exifOrientation?: number;
} {
  let offset = 2; // Skip 0xFF 0xD8
  let width: number | undefined;
  let height: number | undefined;
  let exifOrientation: number | undefined;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;

    // Standalone markers without length
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;

    // SOF markers: SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2), SOF3 (0xC3), SOF9 (0xC9), SOF10 (0xCA)
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)
    ) {
      if (offset + 7 <= bytes.length) {
        height = (bytes[offset + 3] << 8) | bytes[offset + 4];
        width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      }
    }

    // APP1 marker (0xE1): EXIF metadata
    if (marker === 0xe1 && offset + 14 <= bytes.length) {
      const exifHeader = String.fromCharCode(
        bytes[offset + 2],
        bytes[offset + 3],
        bytes[offset + 4],
        bytes[offset + 5]
      );
      if (exifHeader === "Exif") {
        const tiffOffset = offset + 8;
        if (tiffOffset + 8 <= bytes.length) {
          const isLittleEndian = bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49; // 'II' vs 'MM'
          const get16 = (pos: number) =>
            isLittleEndian ? bytes[pos] | (bytes[pos + 1] << 8) : (bytes[pos] << 8) | bytes[pos + 1];
          const get32 = (pos: number) =>
            isLittleEndian
              ? bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)
              : (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];

          const firstIfdOffset = get32(tiffOffset + 4);
          if (firstIfdOffset > 0 && tiffOffset + firstIfdOffset + 2 <= bytes.length) {
            const ifdStart = tiffOffset + firstIfdOffset;
            const entryCount = get16(ifdStart);
            for (let i = 0; i < entryCount; i++) {
              const entryOffset = ifdStart + 2 + i * 12;
              if (entryOffset + 12 > bytes.length) break;
              const tag = get16(entryOffset);
              if (tag === 0x0112) {
                // Orientation tag
                exifOrientation = get16(entryOffset + 8);
                break;
              }
            }
          }
        }
      }
    }

    offset += length;
    if (width && height && exifOrientation) break;
  }

  return { width, height, exifOrientation };
}

/**
 * Parse PNG binary stream to extract dimensions and bit depth
 */
export function parsePngMetadata(bytes: Uint8Array): {
  width?: number;
  height?: number;
  hasAlphaChannel?: boolean;
} {
  if (bytes.length < 24) return {};
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  const colorType = bytes[25]; // 0: grayscale, 2: RGB, 3: indexed, 4: grayscale+alpha, 6: RGBA
  const hasAlphaChannel = colorType === 4 || colorType === 6;
  return { width, height, hasAlphaChannel };
}

/**
 * Parse WebP binary stream to extract dimensions
 */
export function parseWebpMetadata(bytes: Uint8Array): { width?: number; height?: number } {
  if (bytes.length < 30) return {};
  const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  if (chunkType === "VP8 ") {
    // Lossy WebP
    const keyframe = !(bytes[20] & 1);
    if (keyframe && bytes.length >= 30) {
      const width = ((bytes[27] << 8) | bytes[26]) & 0x3fff;
      const height = ((bytes[29] << 8) | bytes[28]) & 0x3fff;
      return { width, height };
    }
  } else if (chunkType === "VP8L") {
    // Lossless WebP
    if (bytes[20] === 0x2f && bytes.length >= 25) {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + ((((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) & 0x3fff);
      return { width, height };
    }
  } else if (chunkType === "VP8X") {
    // Extended WebP
    if (bytes.length >= 30) {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width, height };
    }
  }

  return {};
}

/**
 * Inspect PDF binary content for encryption, page count approximation
 */
export function inspectPdfBytes(bytes: Uint8Array): {
  isEncrypted: boolean;
  pageCount?: number;
  isCorrupted: boolean;
} {
  try {
    // Convert a portion to ASCII string for regex search
    // Using chunking to prevent max call stack size on large files
    const sampleLength = Math.min(bytes.length, 1024 * 1024); // Check up to first 1MB and last 100KB
    let sample = "";
    for (let i = 0; i < sampleLength; i += 8192) {
      const end = Math.min(i + 8192, sampleLength);
      sample += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, end)));
    }

    if (bytes.length > sampleLength) {
      const tailStart = Math.max(sampleLength, bytes.length - 100 * 1024);
      for (let i = tailStart; i < bytes.length; i += 8192) {
        const end = Math.min(i + 8192, bytes.length);
        sample += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, end)));
      }
    }

    // Check for encryption marker (/Encrypt)
    const isEncrypted = /\/Encrypt\s+[0-9]+\s+[0-9]+\s+R/i.test(sample) || /\/Encrypt\s*<</i.test(sample);

    // Approximate page count via /Type\s*\/Page\b (not /Pages)
    const pageMatches = sample.match(/\/Type\s*\/Page\b/g);
    let pageCount: number | undefined;

    // Also check for /Count N in /Pages object
    const countMatch = sample.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/i);
    if (countMatch && countMatch[1]) {
      pageCount = parseInt(countMatch[1], 10);
    } else if (pageMatches) {
      pageCount = pageMatches.length;
    }

    return {
      isEncrypted,
      pageCount: pageCount && pageCount > 0 ? pageCount : 1,
      isCorrupted: false,
    };
  } catch {
    return { isEncrypted: false, isCorrupted: true };
  }
}

/**
 * Primary analysis entry point for a File, Blob, or Buffer
 */
export async function analyzeDocument(file: File | Blob | Uint8Array, fileName?: string): Promise<DocumentAnalysis> {
  let bytes: Uint8Array;
  let fileSize = 0;
  let reportedMime = "application/octet-stream";

  if (file instanceof Uint8Array) {
    bytes = file;
    fileSize = bytes.length;
  } else if (typeof (file as any).arrayBuffer === "function") {
    fileSize = file.size;
    reportedMime = (file as any).type || reportedMime;
    const buf = await file.arrayBuffer();
    bytes = new Uint8Array(buf);
  } else {
    return {
      fileSize: 0,
      mimeType: reportedMime,
      detectedType: "unknown",
      isEncryptedPdf: false,
      isCorrupted: true,
      errorMessage: "Unsupported file object provided for analysis.",
    };
  }

  if (fileSize === 0 || bytes.length === 0) {
    return {
      fileSize: 0,
      mimeType: reportedMime,
      detectedType: "unknown",
      isEncryptedPdf: false,
      isCorrupted: true,
      errorMessage: "The selected file is empty (0 bytes).",
    };
  }

  const detectedType = detectMagicBytes(bytes);
  let isEncryptedPdf = false;
  let pageCount: number | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let hasAlphaChannel: boolean | undefined;
  let exifOrientation: number | undefined;
  let isCorrupted = false;
  let errorMessage: string | undefined;

  switch (detectedType) {
    case "pdf": {
      reportedMime = "application/pdf";
      const pdfInfo = inspectPdfBytes(bytes);
      isEncryptedPdf = pdfInfo.isEncrypted;
      pageCount = pdfInfo.pageCount;
      isCorrupted = pdfInfo.isCorrupted;
      if (isEncryptedPdf) {
        errorMessage = "This PDF is password protected. Upload an unlocked copy.";
      }
      break;
    }
    case "jpeg": {
      reportedMime = "image/jpeg";
      const meta = parseJpegMetadata(bytes);
      width = meta.width;
      height = meta.height;
      exifOrientation = meta.exifOrientation;
      if (!width || !height) {
        isCorrupted = true;
        errorMessage = "Corrupted JPEG: Unable to read image dimensions.";
      }
      break;
    }
    case "png": {
      reportedMime = "image/png";
      const meta = parsePngMetadata(bytes);
      width = meta.width;
      height = meta.height;
      hasAlphaChannel = meta.hasAlphaChannel;
      if (!width || !height) {
        isCorrupted = true;
        errorMessage = "Corrupted PNG: Unable to read image dimensions.";
      }
      break;
    }
    case "webp": {
      reportedMime = "image/webp";
      const meta = parseWebpMetadata(bytes);
      width = meta.width;
      height = meta.height;
      break;
    }
    case "heic": {
      reportedMime = "image/heic";
      break;
    }
    default: {
      isCorrupted = false;
      // If magic bytes were unknown, check file extension for guidance
      const name = fileName || (file as any).name || "";
      if (name.match(/\.pdf$/i)) {
        isCorrupted = true;
        errorMessage = "File has .pdf extension but lacks valid PDF header (corrupted).";
      } else if (name.match(/\.(jpe?g|png)$/i)) {
        isCorrupted = true;
        errorMessage = "Image header is invalid or corrupted.";
      }
    }
  }

  // Calculate orientation and aspect ratio if dimensions are known
  let orientation: "portrait" | "landscape" | "square" | undefined;
  let aspectRatio: number | undefined;
  if (width && height && width > 0 && height > 0) {
    aspectRatio = Number((width / height).toFixed(3));
    if (width > height) orientation = "landscape";
    else if (height > width) orientation = "portrait";
    else orientation = "square";
  }

  return {
    fileSize,
    mimeType: reportedMime,
    detectedType,
    isEncryptedPdf,
    pageCount,
    width,
    height,
    aspectRatio,
    orientation,
    hasAlphaChannel,
    exifOrientation,
    isCorrupted,
    errorMessage,
  };
}
