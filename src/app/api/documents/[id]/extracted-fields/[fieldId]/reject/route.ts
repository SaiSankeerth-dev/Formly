import { NextResponse } from "next/server";
import { rejectExtractedFieldForUser } from "@/lib/server/db";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const user = await getAuthenticatedCitizenUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id, fieldId } = await params;
  const success = await rejectExtractedFieldForUser(user.id, id, fieldId);

  return NextResponse.json({
    success,
    message: `Extracted field ${fieldId} rejected and not written to profile_fields`,
  });
}
