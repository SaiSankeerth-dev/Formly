import { NextResponse } from "next/server";
import { INITIAL_DOCUMENTS, INITIAL_EXTRACTED_FIELDS } from "@/lib/mock-data/initial-state";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const doc = INITIAL_DOCUMENTS.find((d) => d.id === params.id);
  if (!doc) {
    return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
  }

  const fields = INITIAL_EXTRACTED_FIELDS.filter((ef) => ef.document_id === params.id);
  return NextResponse.json({
    success: true,
    document: doc,
    extracted_fields: fields,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    success: true,
    message: `Document ${params.id} deleted. Referenced profile fields preserved as manual provenance.`,
  });
}
