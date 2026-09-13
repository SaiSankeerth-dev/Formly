import { NextRequest, NextResponse } from "next/server";
import { getApplications, createPanApplication } from "@/lib/server/db";
import { validateGovSession, unauthorizedResponse, forbiddenResponse } from "@/lib/server/auth";
import { pgQuery } from "@/lib/server/pg-db";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const auth = await validateGovSession(request);
    if (!auth.success) {
      return auth.error?.toLowerCase().includes("forbidden")
        ? forbiddenResponse(auth.error!)
        : unauthorizedResponse(auth.error!);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const stage = searchParams.get("stage") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const apps = await getApplications({ status, stage, priority, search, userId });
    return NextResponse.json({ success: true, applications: apps, count: apps.length });
  } catch (error: any) {
    console.error("[API gov/applications GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateGovSession(request);
    if (!auth.success) {
      return auth.error?.toLowerCase().includes("forbidden")
        ? forbiddenResponse(auth.error!)
        : unauthorizedResponse(auth.error!);
    }

    const body = await request.json();
    const { applicantName, applicantEmail, applicantPhone, citizenData, consentGranted } = body;

    if (!applicantName || !applicantEmail || !citizenData) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for PAN application" },
        { status: 400 }
      );
    }

    // Server-derived citizen ownership:
    // Resolve citizen identity by verified email in database, or register a verified citizen record
    let targetCitizenUserId = "";
    if (applicantEmail) {
      const existing = await pgQuery<{ id: string }>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
        [applicantEmail.trim()]
      );
      if (existing.length > 0) {
        targetCitizenUserId = existing[0].id;
      }
    }

    if (!targetCitizenUserId) {
      const newCitizenId = `u_${crypto.randomUUID()}`;
      const newSalt = crypto.randomBytes(16).toString("hex");
      await pgQuery(
        `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role)
         VALUES ($1, $2, $3, $4, 'GOV_INTAKE_REGISTRATION', $5, 'Applicant / Citizen')
         ON CONFLICT DO NOTHING`,
        [newCitizenId, applicantName.trim(), applicantEmail.trim().toLowerCase(), applicantPhone?.trim() || "", newSalt]
      );
      targetCitizenUserId = newCitizenId;
    }

    const app = await createPanApplication({
      userId: targetCitizenUserId,
      applicantName,
      applicantEmail,
      applicantPhone: applicantPhone || "",
      citizenData,
      consentGranted: consentGranted ?? true,
    });

    return NextResponse.json({ success: true, application: app }, { status: 201 });
  } catch (error: any) {
    console.error("[API gov/applications POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
