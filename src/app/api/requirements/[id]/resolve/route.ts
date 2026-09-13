import { NextResponse } from "next/server";
import { markRequirementResolvedForUser } from "@/lib/server/db";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedCitizenUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let note = "Resolved manually by applicant.";
  try {
    const body = await request.json();
    if (body.note) note = body.note;
  } catch {
    // default note
  }

  const updatedStatus = markRequirementResolvedForUser(user.id, id, note);

  return NextResponse.json({
    success: true,
    message: `Requirement ${id} marked as MANUALLY_RESOLVED (locked from auto-recompute)`,
    data: updatedStatus,
  });
}
