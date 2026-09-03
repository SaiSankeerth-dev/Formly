import { NextResponse } from "next/server";
import { authenticateSession, acceptExtractedFieldForUser } from "@/lib/server/db";
import { cookies } from "next/headers";

function getAuthenticatedUser(request: Request) {
  const cookieStore = cookies();
  const token =
    cookieStore.get("seva_saarthi_session")?.value ||
    (request.headers.get("Authorization")?.startsWith("Bearer ")
      ? request.headers.get("Authorization")?.substring(7)
      : null);

  if (!token) return null;
  return authenticateSession(token);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; fieldId: string } }
) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let customValue: string | undefined;
  try {
    const body = await request.json();
    customValue = body.custom_value;
  } catch {
    // No custom value provided, uses raw_value
  }

  const updatedProfileField = acceptExtractedFieldForUser(user.id, params.id, params.fieldId, customValue);

  return NextResponse.json({
    success: true,
    message: `Extracted field ${params.fieldId} from doc ${params.id} confirmed into profile_fields`,
    field_id: params.fieldId,
    verified: true,
    data: updatedProfileField,
    custom_value: customValue || null,
  });
}
