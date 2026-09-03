import { NextResponse } from "next/server";
import { authenticateSession, rejectExtractedFieldForUser } from "@/lib/server/db";
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

  const success = rejectExtractedFieldForUser(user.id, params.id, params.fieldId);

  return NextResponse.json({
    success,
    message: `Extracted field ${params.fieldId} rejected and not written to profile_fields`,
  });
}
