import { NextResponse } from "next/server";
import { authenticateSession, getUserDocuments, getUserExtractedFields, deleteDocumentForUser } from "@/lib/server/db";
import { cookies } from "next/headers";

async function getAuthenticatedUser(request: Request) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("seva_saarthi_session")?.value ||
    (request.headers.get("Authorization")?.startsWith("Bearer ")
      ? request.headers.get("Authorization")?.substring(7)
      : null);

  if (!token) return null;
  return authenticateSession(token);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const docs = getUserDocuments(user.id);
  const doc = docs.find((d) => d.id === id);
  if (!doc) {
    return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
  }

  const allFields = getUserExtractedFields(user.id);
  const fields = allFields.filter((ef) => ef.document_id === id);

  return NextResponse.json({
    success: true,
    document: doc,
    extracted_fields: fields,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = deleteDocumentForUser(user.id, id);

  return NextResponse.json({
    success: deleted,
    message: deleted
      ? `Document ${id} deleted. Referenced profile fields preserved as manual provenance.`
      : "Document not found",
  });
}
