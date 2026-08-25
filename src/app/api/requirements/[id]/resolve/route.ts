import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let note = "Resolved manually by applicant.";
  try {
    const body = await request.json();
    if (body.note) note = body.note;
  } catch {
    // default note
  }

  return NextResponse.json({
    success: true,
    message: `Requirement ${params.id} marked as MANUALLY_RESOLVED (F10 locked)`,
    requirement_id: params.id,
    status: "MANUALLY_RESOLVED",
    note,
    locked: true,
  });
}
