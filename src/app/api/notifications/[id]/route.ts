import { NextRequest, NextResponse } from "next/server";
import { pgQuery, getAuthoritativeDb, resolveActorUuid } from "@/lib/server/pg-db";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const userUuid = await resolveActorUuid("CITIZEN", user.id);

    await getAuthoritativeDb();
    const result = await pgQuery(
      `UPDATE notifications
       SET read_at = now()
       WHERE id = $1 AND recipient_id = $2 AND recipient_type = 'CITIZEN'
       RETURNING id`,
      [id, userUuid]
    );

    try {
      const supabase = await createClient();
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("recipient_id", userUuid);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API notifications/[id] PATCH]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
