import { NextRequest, NextResponse } from "next/server";
import { getAIExplanation, getApplicationById } from "@/lib/server/db";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { resolveActorUuid } from "@/lib/server/pg-db";

export async function GET(
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
      return NextResponse.json({ success: false, error: `Application not found: ${id}` }, { status: 404 });
    }

    const SEEDED_DEMO_CASES = new Set(["PAN-2026-0001", "PAN-2026-0002", "PAN-2026-0003", "PAN-2026-0004", "SCH-2026-2345", "HOU-2026-7781"]);
    const isPublicDemoCase = process.env.NODE_ENV !== "production" && SEEDED_DEMO_CASES.has(id);

    if (!isPublicDemoCase) {
      const ownerId = (app as any).citizen_user_id || app.userId;
      const ownerUuid = await resolveActorUuid("CITIZEN", ownerId);
      const userUuid = await resolveActorUuid("CITIZEN", user.id);
      if (ownerId !== user.id && ownerUuid !== userUuid) {
        return NextResponse.json({ success: false, error: "Forbidden: You can only view explanations for your own applications" }, { status: 403 });
      }
    }

    const explanation = await getAIExplanation(app.id || id);

    if (!explanation) {
      return NextResponse.json({ success: false, error: "No AI explanation available for this application" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      explanation: explanation.explanation,
      recommendedActions: JSON.parse(explanation.recommended_actions || "[]"),
      type: explanation.assistance_type,
      sourceReason: explanation.source_reason,
    });
  } catch (error: any) {
    console.error("[API track/[id]/ai-explanation GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
