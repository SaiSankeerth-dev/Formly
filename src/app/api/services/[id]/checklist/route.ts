import { NextResponse } from "next/server";
import {
  INITIAL_SERVICES,
  INITIAL_REQUIREMENTS,
  INITIAL_REQUIREMENT_STATUS,
  INITIAL_DOCUMENTS,
  INITIAL_PROFILE_FIELDS,
} from "@/lib/mock-data/initial-state";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const service = INITIAL_SERVICES.find((s) => s.id === params.id) || INITIAL_SERVICES[0];
  const reqs = INITIAL_REQUIREMENTS.filter((r) => r.service_id === service.id);

  const items = reqs.map((req) => {
    const statusRow = INITIAL_REQUIREMENT_STATUS.find((rs) => rs.requirement_id === req.id);
    const status = statusRow?.status || "MISSING";
    const satisfiedByDoc = statusRow?.satisfied_by_document_id
      ? INITIAL_DOCUMENTS.find((d) => d.id === statusRow.satisfied_by_document_id) || null
      : null;
    const satisfiedByProfile = statusRow?.satisfied_by_field_name
      ? INITIAL_PROFILE_FIELDS.find((pf) => pf.field_name === statusRow.satisfied_by_field_name) || null
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
