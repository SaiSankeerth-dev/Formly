import { NextRequest, NextResponse } from "next/server";
import { getPanApplications, getApplications, createPanApplication, checkIdempotency, recordIdempotency } from "@/lib/server/db";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const apps = await getApplications({ userId: user.id });
    return NextResponse.json({ success: true, applications: apps, count: apps.length });
  } catch (error: any) {
    console.error("[API applications GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Citizen login required" }, { status: 401 });
    }

    const idempotencyKey = request.headers.get("idempotency-key") || request.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const { isDuplicate, response } = await checkIdempotency(idempotencyKey, "CREATE_APPLICATION");
      if (isDuplicate) {
        return NextResponse.json(response, { status: 200 });
      }
    }

    const body = await request.json();
    const { applicantName, applicantEmail, applicantPhone, citizenData, consentGranted, serviceId } = body;

    if (!consentGranted) {
      return NextResponse.json(
        { success: false, error: "Statutory DPDP consent is mandatory for application submission" },
        { status: 400 }
      );
    }

    if (!citizenData || !citizenData.fullName || !citizenData.dateOfBirth) {
      return NextResponse.json(
        { success: false, error: "Missing mandatory citizen demographic fields" },
        { status: 400 }
      );
    }

    // Always enforce the authenticated user's ID to prevent identity spoofing
    const app = await createPanApplication({
      userId: user.id,
      applicantName: applicantName || user.name || citizenData.fullName,
      applicantEmail: applicantEmail || user.email || citizenData.email || "",
      applicantPhone: applicantPhone || user.phone || citizenData.mobile || "1234567890",
      citizenData,
      consentGranted: true,
      serviceId,
    });

    // Sync to Supabase public.applications table if available
    try {
      const supabase = await createClient();
      await supabase.from("applications").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        service_id: serviceId || "PAN",
        service_name: "PAN Card Application",
        state: "SUBMITTED",
        current_step: "OFFICER_REVIEW",
      });
    } catch {}

    const responseData = { success: true, application: app };
    if (idempotencyKey) {
      await recordIdempotency(idempotencyKey, "CREATE_APPLICATION", app.id, responseData);
    }

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: any) {
    console.error("[API applications POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
