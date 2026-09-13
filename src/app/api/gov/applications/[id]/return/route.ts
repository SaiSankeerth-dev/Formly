import { NextRequest, NextResponse } from "next/server";
import { officerReturnApplication, getApplicationById, getAuditLogs } from "@/lib/server/db";
import { validateGovSession, validateGovRole, unauthorizedResponse, forbiddenResponse } from "@/lib/server/auth";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateGovRole(request, ["DEPARTMENT_OFFICER", "DEPARTMENT_ADMIN", "SYSTEM_ADMIN"]);
    if (!auth.success) {
      return auth.error?.toLowerCase().includes("forbidden")
        ? forbiddenResponse(auth.error!)
        : unauthorizedResponse(auth.error!);
    }

    const { id } = await context.params;
    const app = await getApplicationById(id);
    if (!app) {
      return NextResponse.json({ success: false, error: `Application not found: ${id}` }, { status: 404 });
    }

    // Phase 10: Officers cannot mutate another officer's assigned case
    const POOL_OR_DEMO_OFFICERS = new Set(["OFF-POOL-0000", "POOL", "UNASSIGNED"]);
    const isAssignedToOther =
      Boolean(app.assignedOfficerId) &&
      !POOL_OR_DEMO_OFFICERS.has(app.assignedOfficerId) &&
      app.assignedOfficerId !== auth.employee.employee_code &&
      app.assignedOfficerId !== auth.employee.id;
    const isDepartmentOfficer =
      (auth.employee.role as string) === "DEPARTMENT_OFFICER" ||
      (auth.employee.role as string) === "OFFICER";

    if (isAssignedToOther && isDepartmentOfficer) {
      return forbiddenResponse(
        `Forbidden: Application ${id} is assigned to officer ${app.assignedOfficerId}. Only the assigned officer or an administrator may decide this case.`
      );
    }

    const body = await request.json();
    const reason = body.reason || body.correctionReason || body.returnExplanation;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: "Mandatory return reason is required" },
        { status: 400 }
      );
    }

    const result = await officerReturnApplication(
      id,
      auth.employee.employee_code,
      auth.employee.full_name,
      reason
    );

    const logs = await getAuditLogs(id);
    return NextResponse.json({ success: true, application: result, auditLogs: logs });
  } catch (error: any) {
    console.error("[API gov/applications/[id]/return POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
