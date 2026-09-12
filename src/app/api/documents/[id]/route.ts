import { NextResponse } from "next/server";
import { authenticateSession, getUserDocuments, getUserExtractedFields, deleteDocumentForUser, updateDocumentForUser } from "@/lib/server/db";
import { cookies } from "next/headers";

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
  const docs = await getUserDocuments(user.id);
  const doc = docs.find((d: any) => d.id === id);
  if (!doc) {
    return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
  }

  const allFields = await getUserExtractedFields(user.id);
  const fields = allFields.filter((ef: any) => ef.document_id === id);

  return NextResponse.json({
    success: true,
    document: doc,
    extracted_fields: fields,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const { prepared_size_bytes, status } = body;
    await updateDocumentForUser(user.id, id, { prepared_size_bytes, status });
    return NextResponse.json({
      success: true,
      message: `Document ${id} updated successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update document" }, { status: 500 });
  }
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
  const deleted = await deleteDocumentForUser(user.id, id);

  return NextResponse.json({
    success: deleted,
    message: deleted
      ? `Document ${id} deleted. Referenced profile fields preserved as manual provenance.`
      : "Document not found",
  });
}
