import { NextResponse } from "next/server";
import {
  getUserProfileFields,
  getUserDocuments,
  getUserRequirementStatuses,
  recomputeRequirementStatuses,
} from "@/lib/server/db";
import { INITIAL_SERVICES, INITIAL_REQUIREMENTS } from "@/lib/mock-data/initial-state";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const service = INITIAL_SERVICES.find((s) => s.id === resolvedParams.id) || INITIAL_SERVICES[0];
  const reqs = INITIAL_REQUIREMENTS.filter((r) => r.service_id === service.id);

  const user = await getAuthenticatedCitizenUser(request);

  let statuses = user ? await getUserRequirementStatuses(user.id, service.id) : [];
  if (user && statuses.length === 0) {
    statuses = await recomputeRequirementStatuses(user.id, service.id);
  }

  const profile = user ? await getUserProfileFields(user.id) : [];
  const docs = user ? await getUserDocuments(user.id) : [];

  const items = reqs.map((req) => {
    const statusRow = statuses.find((rs: any) => rs.requirement_id === req.id);
    const status = statusRow?.status || "MISSING";
    const satisfiedByDoc = statusRow?.satisfied_by_document_id
      ? docs.find((d: any) => d.id === statusRow.satisfied_by_document_id) || null
      : null;
    const satisfiedByProfile = statusRow?.satisfied_by_field_name
      ? profile.find((pf: any) => pf.field_name === statusRow.satisfied_by_field_name) || null
      : null;

    return {
      requirement: req,
      status,
      satisfiedByDocument: satisfiedByDoc,
      satisfiedByProfileField: satisfiedByProfile,
      resolvedNote: statusRow?.resolved_note || null,
      locked: statusRow?.locked || false,
    };
  });

  const total = items.filter((i) => i.requirement.required).length;
  const satisfied = items.filter((i) => i.requirement.required && i.status === "SATISFIED").length;
  const manuallyResolved = items.filter((i) => i.requirement.required && i.status === "MANUALLY_RESOLVED").length;
  const missing = items.filter((i) => i.requirement.required && i.status === "MISSING").length;
  const percentage = total > 0 ? Math.round(((satisfied + manuallyResolved) / total) * 100) : 0;

  return NextResponse.json({
    success: true,
    service,
    total_requirements: total,
    satisfied_count: satisfied,
    missing_count: missing,
    manually_resolved_count: manuallyResolved,
    percentage_complete: percentage,
    items,
  });
}
