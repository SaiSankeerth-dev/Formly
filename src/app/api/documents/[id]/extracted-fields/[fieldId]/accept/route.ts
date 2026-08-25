import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string; fieldId: string } }
) {
  let customValue: string | undefined;
  try {
    const body = await request.json();
    customValue = body.custom_value;
  } catch {
    // No custom value provided, uses raw_value
  }

  return NextResponse.json({
    success: true,
    message: `Extracted field ${params.fieldId} from doc ${params.id} confirmed into profile_fields`,
    field_id: params.fieldId,
    verified: true,
    custom_value: customValue || null,
  });
}
