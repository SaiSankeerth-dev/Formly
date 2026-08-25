import { NextResponse } from "next/server";
import { INITIAL_PROFILE_FIELDS } from "@/lib/mock-data/initial-state";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: INITIAL_PROFILE_FIELDS,
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { field_name, value } = body;

    if (!field_name) {
      return NextResponse.json({ success: false, error: "field_name is required" }, { status: 400 });
    }

    const updatedField = {
      id: `pf_${Date.now()}`,
      user_id: "u0000000-0000-0000-0000-000000000001",
      field_name,
      value: value || "",
      source_document_id: null,
      confidence: null,
      verified: true,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Profile field '${field_name}' updated successfully`,
      data: updatedField,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }
}
