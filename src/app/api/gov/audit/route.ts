import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs, addAuditLog } from "@/lib/server/db";
import { validateGovSession, unauthorizedResponse, forbiddenResponse } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await validateGovSession(request);
    if (!auth.success) {
      return auth.error?.toLowerCase().includes("forbidden")
        ? forbiddenResponse(auth.error!)
        : unauthorizedResponse(auth.error!);
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId") || undefined;
    const logs = await getAuditLogs(applicationId);
    return NextResponse.json({ success: true, auditLogs: logs, count: logs.length });
  } catch (error: any) {
    console.error("[API gov/audit GET]", error);
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
    const { action, applicationId, source, target, purpose, consentToken, result, details } = body;

    if (!action || typeof action !== "string" || !applicationId || typeof applicationId !== "string") {
      return NextResponse.json(
        { success: false, error: "action and applicationId are required fields" },
        { status: 400 }
      );
    }

    const entry = await addAuditLog({
      action: action.trim(),
      applicationId: applicationId.trim(),
      source: (typeof source === "string" && source.trim()) || "GOV_PORTAL",
      target: (typeof target === "string" && target.trim()) || "APPLICATION_CASE",
      purpose: (typeof purpose === "string" && purpose.trim()) || "Official officer action",
      consentToken: typeof consentToken === "string" ? consentToken.trim() : undefined,
      result: result === "FAILURE" ? "FAILURE" : "SUCCESS",
      details: typeof details === "string" ? details : (details ? JSON.stringify(details) : "Official officer action recorded"),
      requestId: (typeof body.requestId === "string" && body.requestId.trim()) || `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      actor: {
        id: auth.employee.employee_code || auth.employee.id,
        name: auth.employee.full_name,
        role: "OFFICER",
      },
    });

    return NextResponse.json({ success: true, logEntry: entry }, { status: 201 });
  } catch (error: any) {
    console.error("[API gov/audit POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
