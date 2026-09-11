import { DocumentType } from "@/types";

export interface DocumentRule {
  maxFileSizeBytes: number;
  safetyMarginFactor: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  requiredDpi?: number;
  pdfPageLimit?: number;
  allowPdfSplitting?: boolean;
  imageQuality?: number;
  minAcceptableQuality?: number;
  minReadableScore?: number;
  compressionMode?: "lossy" | "balanced" | "lossless";
  requiredColorMode?: "any" | "grayscale" | "color";
  orientation?: "auto" | "portrait" | "landscape";
  targetFormat?: "same" | "jpg" | "pdf";
  strictFilename?: boolean;
}

export interface DocumentProfile {
  serviceId: string;
  serviceName: string;
  documentType: DocumentType | string;
  documentLabel: string;
  rules: DocumentRule;
  optimizerStrategy: "image-progressive" | "pdf-stream-optimize" | "pdf-split" | "direct-pass";
}

export function computeTargetBytes(rule: DocumentRule): number {
  return Math.floor(rule.maxFileSizeBytes * (rule.safetyMarginFactor || 0.9));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes % 1024 === 0 ? 0 : 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFileName(originalName: string, docType?: string, extension?: string): string {
  // Extract extension
  const dotIndex = originalName.lastIndexOf(".");
  const origExt = dotIndex !== -1 ? originalName.slice(dotIndex + 1).toLowerCase() : "";
  const finalExt = (extension || origExt || "bin").replace(/^\./, "").toLowerCase();

  // If document type is provided, prioritize semantic safe naming
  if (docType && docType !== "OTHER") {
    const base = docType.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return `${base}.${finalExt}`;
  }

  // Otherwise sanitize original base name:
  // Remove special characters, convert spaces/dashes to underscores, lowercase
  const rawBase = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;
  let cleanBase = rawBase
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!cleanBase) {
    cleanBase = "document";
  }

  return `${cleanBase}.${finalExt}`;
}

export const SERVICE_DOCUMENT_PROFILES: Record<string, Record<string, DocumentProfile>> = {
  // Post Matric Scholarship (Service ID: s001)
  s001: {
    INCOME_CERTIFICATE: {
      serviceId: "s001",
      serviceName: "Post Matric Scholarship",
      documentType: "INCOME_CERTIFICATE",
      documentLabel: "Income Certificate",
      rules: {
        maxFileSizeBytes: 200 * 1024, // 200 KB
        safetyMarginFactor: 0.9, // Target: 180 KB
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
        minWidth: 300,
        minHeight: 400,
        pdfPageLimit: 3,
        allowPdfSplitting: false,
        imageQuality: 0.85,
        minAcceptableQuality: 0.55,
        minReadableScore: 55,
        compressionMode: "balanced",
        requiredColorMode: "any",
        targetFormat: "same",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    AADHAAR: {
      serviceId: "s001",
      serviceName: "Post Matric Scholarship",
      documentType: "AADHAAR",
      documentLabel: "Aadhaar Card",
      rules: {
        maxFileSizeBytes: 200 * 1024, // 200 KB
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
        minWidth: 300,
        minHeight: 400,
        pdfPageLimit: 2,
        allowPdfSplitting: false,
        imageQuality: 0.85,
        minAcceptableQuality: 0.55,
        minReadableScore: 60,
        compressionMode: "balanced",
        requiredColorMode: "any",
        targetFormat: "same",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    COLLEGE_ID: {
      serviceId: "s001",
      serviceName: "Post Matric Scholarship",
      documentType: "COLLEGE_ID",
      documentLabel: "College Bonafide / Student ID",
      rules: {
        maxFileSizeBytes: 200 * 1024,
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
        minWidth: 300,
        minHeight: 300,
        pdfPageLimit: 2,
        imageQuality: 0.85,
        minAcceptableQuality: 0.55,
        minReadableScore: 50,
        compressionMode: "balanced",
        requiredColorMode: "any",
        targetFormat: "same",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    BONAFIDE_CERTIFICATE: {
      serviceId: "s001",
      serviceName: "Post Matric Scholarship",
      documentType: "BONAFIDE_CERTIFICATE",
      documentLabel: "Bonafide Certificate",
      rules: {
        maxFileSizeBytes: 200 * 1024,
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg"],
        allowedExtensions: ["pdf", "jpg", "jpeg"],
        minWidth: 300,
        minHeight: 400,
        pdfPageLimit: 2,
        imageQuality: 0.85,
        minAcceptableQuality: 0.55,
        minReadableScore: 55,
        compressionMode: "balanced",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    MARKSHEET: {
      serviceId: "s001",
      serviceName: "Post Matric Scholarship",
      documentType: "PREVIOUS_MARKSHEET",
      documentLabel: "Qualifying Marksheet",
      rules: {
        maxFileSizeBytes: 200 * 1024,
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
        minWidth: 400,
        minHeight: 500,
        pdfPageLimit: 4,
        imageQuality: 0.85,
        minAcceptableQuality: 0.55,
        minReadableScore: 60,
        compressionMode: "balanced",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    BANK_PASSBOOK: {
      serviceId: "s001",
      serviceName: "Post Matric Scholarship",
      documentType: "BANK_PASSBOOK",
      documentLabel: "Bank Passbook",
      rules: {
        maxFileSizeBytes: 200 * 1024,
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg"],
        allowedExtensions: ["pdf", "jpg", "jpeg"],
        minWidth: 300,
        minHeight: 300,
        pdfPageLimit: 2,
        imageQuality: 0.85,
        minAcceptableQuality: 0.55,
        minReadableScore: 55,
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    PHOTO: {
      serviceId: "s001",
      serviceName: "Post Matric Scholarship",
      documentType: "PHOTO",
      documentLabel: "Applicant Passport Photo",
      rules: {
        maxFileSizeBytes: 100 * 1024, // 100 KB
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["image/jpeg", "image/jpg"],
        allowedExtensions: ["jpg", "jpeg"],
        maxWidth: 800,
        maxHeight: 1000,
        minWidth: 300,
        minHeight: 400,
        imageQuality: 0.9,
        minAcceptableQuality: 0.65,
        minReadableScore: 60,
        compressionMode: "lossy",
        requiredColorMode: "color",
        orientation: "portrait",
        targetFormat: "jpg",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    SIGNATURE: {
      serviceId: "s001",
      serviceName: "Post Matric Scholarship",
      documentType: "SIGNATURE",
      documentLabel: "Applicant Signature",
      rules: {
        maxFileSizeBytes: 50 * 1024, // 50 KB
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["image/jpeg", "image/jpg"],
        allowedExtensions: ["jpg", "jpeg"],
        maxWidth: 600,
        maxHeight: 300,
        minWidth: 150,
        minHeight: 75,
        imageQuality: 0.9,
        minAcceptableQuality: 0.6,
        minReadableScore: 50,
        compressionMode: "lossy",
        orientation: "landscape",
        targetFormat: "jpg",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
  },

  // Instant e-PAN Card Application (Service ID: s003)
  s003: {
    AADHAAR: {
      serviceId: "s003",
      serviceName: "Instant e-PAN Card",
      documentType: "AADHAAR",
      documentLabel: "Aadhaar Card",
      rules: {
        maxFileSizeBytes: 200 * 1024,
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg"],
        allowedExtensions: ["pdf", "jpg", "jpeg"],
        minWidth: 300,
        minHeight: 400,
        pdfPageLimit: 2,
        imageQuality: 0.85,
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    PHOTO: {
      serviceId: "s003",
      serviceName: "Instant e-PAN Card",
      documentType: "PHOTO",
      documentLabel: "Passport Photo",
      rules: {
        maxFileSizeBytes: 100 * 1024,
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["image/jpeg", "image/jpg"],
        allowedExtensions: ["jpg", "jpeg"],
        maxWidth: 800,
        maxHeight: 1000,
        minWidth: 300,
        minHeight: 400,
        imageQuality: 0.9,
        targetFormat: "jpg",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
    SIGNATURE: {
      serviceId: "s003",
      serviceName: "Instant e-PAN Card",
      documentType: "SIGNATURE",
      documentLabel: "Signature",
      rules: {
        maxFileSizeBytes: 50 * 1024,
        safetyMarginFactor: 0.9,
        allowedMimeTypes: ["image/jpeg", "image/jpg"],
        allowedExtensions: ["jpg", "jpeg"],
        maxWidth: 600,
        maxHeight: 300,
        minWidth: 150,
        minHeight: 75,
        imageQuality: 0.9,
        targetFormat: "jpg",
        strictFilename: true,
      },
      optimizerStrategy: "image-progressive",
    },
  },
};

export function getDefaultDocumentProfile(docType: DocumentType | string = "OTHER"): DocumentProfile {
  return {
    serviceId: "default",
    serviceName: "Citizen Document Vault",
    documentType: docType,
    documentLabel: docType.replace(/_/g, " "),
    rules: {
      maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB default limit
      safetyMarginFactor: 0.9, // 4.5 MB target
      allowedMimeTypes: [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
      allowedExtensions: ["pdf", "jpg", "jpeg", "png", "webp"],
      minWidth: 200,
      minHeight: 200,
      pdfPageLimit: 20,
      allowPdfSplitting: true,
      imageQuality: 0.85,
      minAcceptableQuality: 0.5,
      minReadableScore: 45,
      compressionMode: "balanced",
      requiredColorMode: "any",
      strictFilename: false,
    },
    optimizerStrategy: "image-progressive",
  };
}

export function getDocumentProfile(serviceId?: string, documentType?: DocumentType | string): DocumentProfile {
  const normType = (documentType || "OTHER").toUpperCase();
  if (serviceId && SERVICE_DOCUMENT_PROFILES[serviceId]) {
    const serviceProfiles = SERVICE_DOCUMENT_PROFILES[serviceId];
    if (serviceProfiles[normType]) {
      return serviceProfiles[normType];
    }
    // Check if alias matches (e.g. PREVIOUS_MARKSHEET -> MARKSHEET)
    if (normType === "PREVIOUS_MARKSHEET" && serviceProfiles["MARKSHEET"]) {
      return serviceProfiles["MARKSHEET"];
    }
    if (normType === "MARKSHEET" && serviceProfiles["PREVIOUS_MARKSHEET"]) {
      return serviceProfiles["PREVIOUS_MARKSHEET"];
    }
  }

  // Search across other services for default matching this document type
  for (const sId of Object.keys(SERVICE_DOCUMENT_PROFILES)) {
    const sProfile = SERVICE_DOCUMENT_PROFILES[sId][normType];
    if (sProfile) {
      return {
        ...sProfile,
        serviceId: serviceId || sProfile.serviceId,
      };
    }
  }

  return getDefaultDocumentProfile(normType);
}
