import { NextResponse } from "next/server";
import { INITIAL_DOCUMENTS, INITIAL_EXTRACTED_FIELDS } from "@/lib/mock-data/initial-state";
import { extractDocumentFields } from "@/lib/ocr/ocr-engine";
import { DocumentType } from "@/types";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: INITIAL_DOCUMENTS.map((doc) => ({
      ...doc,
      extracted_fields: INITIAL_EXTRACTED_FIELDS.filter((ef) => ef.document_id === doc.id),
    })),
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("document_type") as DocumentType) || "OTHER";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File exceeds 10MB limit" }, { status: 400 });
    }

    const docId = `doc_${Date.now()}`;
    const ocrResult = await extractDocumentFields(file, documentType);

    const newDoc = {
      id: docId,
      user_id: "u0000000-0000-0000-0000-000000000001",
      document_type: ocrResult.documentType,
      storage_path: `vault/${file.name}`,
      original_filename: file.name,
      mime_type: file.type,
      status: "EXTRACTED",
      ocr_raw_text: ocrResult.rawText,
      is_superseded: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const extracted = ocrResult.fields.map((f, i) => ({
      id: `ef_${Date.now()}_${i}`,
      document_id: docId,
      field_name: f.fieldName,
      raw_value: f.rawValue,
      normalized_value: f.normalizedValue || null,
      confidence: f.confidence,
      accepted: false,
      created_at: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      message: "Document uploaded and OCR extracted successfully",
      document: newDoc,
      extracted_fields: extracted,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Upload failed" }, { status: 500 });
  }
}
