import { NextResponse } from "next/server";
import { acceptExtractedFieldForUser } from "@/lib/server/db";
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

  let customValue: string | undefined;
  try {
    const body = await request.json();
    customValue = body.custom_value;
  } catch {
    // No custom value provided, uses raw_value
  }

  const updatedProfileField = acceptExtractedFieldForUser(user.id, id, fieldId, customValue);

  return NextResponse.json({
    success: true,
    message: `Extracted field ${fieldId} from doc ${id} confirmed into profile_fields`,
    field_id: fieldId,
    verified: true,
    data: updatedProfileField,
    custom_value: customValue || null,
  });
}
