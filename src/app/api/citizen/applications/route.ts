import { NextRequest, NextResponse } from "next/server";
import { createPanApplication } from "@/lib/server/db";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { applicantName, applicantEmail, applicantPhone, citizenData, consentGranted } = body;

    if (!applicantName || !applicantEmail || !citizenData) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for application" },
        { status: 400 }
      );
    }

    const app = await createPanApplication({
      userId: user.id,
      applicantName,
      applicantEmail,
      applicantPhone: applicantPhone || "",
      citizenData,
      consentGranted: consentGranted ?? true,
    });

    return NextResponse.json({ success: true, application: app }, { status: 201 });
  } catch (error: any) {
    console.error("[API citizen/applications POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
