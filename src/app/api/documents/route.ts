import { NextResponse } from "next/server";
import crypto from "crypto";
import { authenticateSession, getUserDocuments, addDocumentForUser, getUserExtractedFields } from "@/lib/server/db";
import { extractDocumentFields } from "@/lib/ocr/ocr-engine";
import { DocumentType, DocumentRow, ExtractedField } from "@/types";
import { cookies } from "next/headers";
import { getDocumentProfile, sanitizeFileName, formatBytes } from "@/lib/documents/document-profiles";
import { analyzeDocument } from "@/lib/documents/document-analyzer";
import { prepareDocumentServerSide } from "@/lib/documents/server-document-preparer";

async function getAuthenticatedUser(request: Request) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("FORMLY_CITIZEN_SESSION")?.value ||
    cookieStore.get("formly_citizen_session")?.value ||
    cookieStore.get("seva_saarthi_session")?.value ||
    (request.headers.get("Authorization")?.startsWith("Bearer ")
      ? request.headers.get("Authorization")?.substring(7)
      : null);

  if (!token) return null;
  return await authenticateSession(token);
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const docs = await getUserDocuments(user.id);
  const extracted = await getUserExtractedFields(user.id);

  return NextResponse.json({
    success: true,
    data: docs.map((doc) => ({
      ...doc,
      extracted_fields: extracted.filter((ef) => ef.document_id === doc.id),
    })),
  });
}


export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("document_type") as DocumentType) || "OTHER";
    const serviceId = (formData.get("service_id") as string) || "default";
    const metaRaw = formData.get("preparation_metadata") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Server-side profile and rules lookup (Section 17: Never trust client alone)
    const profile = getDocumentProfile(serviceId, documentType);
    const rule = profile.rules;

    // Reject dangerous executable extensions
    const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".msi", ".dll", ".js", ".vbs", ".scr", ".ps1"];
    if (dangerousExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      return NextResponse.json(
        { success: false, error: "Security violation: Executable files are strictly forbidden." },
        { status: 400 }
      );
    }

    // Inspect file content with magic bytes analyzer
    const analysis = await analyzeDocument(file, file.name);
    if (analysis.isCorrupted) {
      return NextResponse.json(
        { success: false, error: analysis.errorMessage || "File is corrupted or has an invalid structure." },
        { status: 400 }
      );
    }
    if (analysis.isEncryptedPdf) {
      return NextResponse.json(
        { success: false, error: "This PDF is password protected. Upload an unlocked copy." },
        { status: 400 }
      );
    }

    let uploadFile: File | Blob = file;
    let preparedResult: any = null;

    // A 200 KB upload limit should NOT mean rejecting the citizen's document;
    // Seva Saarthi automatically prepares the file to meet destination portal rules.
    if (file.size > rule.maxFileSizeBytes) {
      try {
        preparedResult = await prepareDocumentServerSide(file, file.name, {
          serviceId,
          documentType,
        });

        if (preparedResult.isUnderLimit) {
          uploadFile = preparedResult.preparedBlob;
        } else {
          return NextResponse.json(
            {
              success: false,
              error:
                preparedResult.qualityIssues[0] ||
                `This document cannot be safely compressed to ${formatBytes(
                  rule.maxFileSizeBytes
                )} without reducing readability.`,
              suggestedActions: preparedResult.suggestedActions,
            },
            { status: 422 }
          );
        }
      } catch (prepErr: any) {
        return NextResponse.json(
          {
            success: false,
            error: prepErr.message || "Failed to automatically optimize document for destination portal.",
          },
          { status: 400 }
        );
      }
    }

    // Validate MIME against allowed types
    const isMimeAllowed = rule.allowedMimeTypes.some(
      (allowed) =>
        allowed === analysis.mimeType ||
        (analysis.mimeType === "image/jpeg" && allowed === "image/jpg")
    );
    if (!isMimeAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: `File type '${analysis.mimeType}' is not accepted. Allowed types: ${rule.allowedExtensions.join(", ").toUpperCase()}`,
        },
        { status: 400 }
      );
    }

    // Parse preparation metadata if supplied from client, or populate from server auto-preparation
    let optMeta: Record<string, any> | null = null;
    if (metaRaw) {
      try {
        optMeta = JSON.parse(metaRaw);
      } catch {
        optMeta = null;
      }
    } else if (preparedResult) {
      optMeta = {
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
        autoPreparedByServer: true,
      };
    }

    // Generate safe storage name
    const safeName = sanitizeFileName(
      file.name,
      documentType,
      analysis.detectedType === "pdf" ? "pdf" : "jpg"
    );

    const docId = crypto.randomUUID();
    const ocrResult = await extractDocumentFields(
      uploadFile instanceof File
        ? uploadFile
        : { name: safeName, type: (uploadFile as any).type || "application/pdf", size: uploadFile.size },
      documentType
    );

    const newDoc: DocumentRow = {
      id: docId,
      user_id: user.id,
      document_type: ocrResult.documentType,
      storage_path: `vault/${safeName}`,
      original_filename: file.name,
      prepared_filename: safeName,
      mime_type: (uploadFile as any).type || analysis.mimeType || file.type || "application/octet-stream",
      status: "EXTRACTED",
      ocr_raw_text: ocrResult.rawText,
      is_superseded: false,
      original_size_bytes: optMeta?.originalSizeBytes || file.size,
      prepared_size_bytes: uploadFile.size,
      target_size_bytes: optMeta?.targetSizeBytes || Math.floor(rule.maxFileSizeBytes * 0.9),
      original_dimensions: optMeta?.originalDimensions
        ? typeof optMeta.originalDimensions === "object"
          ? `${optMeta.originalDimensions.width}x${optMeta.originalDimensions.height}`
          : String(optMeta.originalDimensions)
        : null,
      prepared_dimensions: optMeta?.preparedDimensions
        ? typeof optMeta.preparedDimensions === "object"
          ? `${optMeta.preparedDimensions.width}x${optMeta.preparedDimensions.height}`
          : String(optMeta.preparedDimensions)
        : null,
      readability_score: optMeta?.readabilityScore ?? (preparedResult?.readabilityScore ?? 85),
      readability_status: optMeta?.readabilityStatus ?? (preparedResult?.readabilityStatus ?? "GOOD"),
      optimization_metadata: optMeta,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const extracted: ExtractedField[] = ocrResult.fields.map((f, i) => ({
      id: crypto.randomUUID(),
      document_id: docId,
      field_name: f.fieldName,
      raw_value: f.rawValue,
      normalized_value: f.normalizedValue || null,
      confidence: f.confidence,
      accepted: false,
      created_at: new Date().toISOString(),
    }));

    await addDocumentForUser(user.id, newDoc, extracted);

    return NextResponse.json({
      success: true,
      message: "Document uploaded, verified, and OCR extracted successfully",
      document: newDoc,
      extracted_fields: extracted,
      service_validation: {
        serviceId: profile.serviceId,
        serviceName: profile.serviceName,
        maxFileSizeBytes: rule.maxFileSizeBytes,
        preparedSizeBytes: file.size,
        portalReady: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Upload failed" }, { status: 500 });
  }
}
