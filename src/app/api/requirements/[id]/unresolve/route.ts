import { NextResponse } from "next/server";
import { unmarkRequirementResolvedForUser } from "@/lib/server/db";
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
  unmarkRequirementResolvedForUser(user.id, id);

  return NextResponse.json({
    success: true,
    message: `Requirement ${id} manual resolution reverted. Auto-recompute completed.`,
    requirement_id: id,
    locked: false,
  });
}
