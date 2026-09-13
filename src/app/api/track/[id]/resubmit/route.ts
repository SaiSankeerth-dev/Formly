import { NextRequest, NextResponse } from "next/server";
import { citizenResubmitCorrection, getApplicationById } from "@/lib/server/db";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { resolveActorUuid } from "@/lib/server/pg-db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const app = await getApplicationById(id);

    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    // Security: Only the owner can resubmit corrections
    const ownerId = (app as any).citizen_user_id || app.userId;
    const ownerUuid = await resolveActorUuid("CITIZEN", ownerId);
    const userUuid = await resolveActorUuid("CITIZEN", user.id);
    if (ownerId !== user.id && ownerUuid !== userUuid) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only resubmit your own applications" }, { status: 403 });
    }

    const body = await request.json();
    const { updatedFields } = body;

    const result = await citizenResubmitCorrection(id, updatedFields || {});

    return NextResponse.json({ success: true, application: result });
  } catch (error: any) {
    console.error("[API track/[id]/resubmit POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
