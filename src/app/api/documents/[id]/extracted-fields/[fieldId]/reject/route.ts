import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string; fieldId: string } }
) {
  return NextResponse.json({
    success: true,
    message: `Extracted field ${params.fieldId} from doc ${params.id} rejected and discarded`,
  });
}
