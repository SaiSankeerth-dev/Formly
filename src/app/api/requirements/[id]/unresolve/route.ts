import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    success: true,
    message: `Requirement ${params.id} manual resolution reverted. Auto-recompute triggered.`,
    requirement_id: params.id,
    locked: false,
  });
}
