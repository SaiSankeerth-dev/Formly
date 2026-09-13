import { NextRequest, NextResponse } from "next/server";
import { pgQuery, getAuthoritativeDb, resolveActorUuid } from "@/lib/server/pg-db";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userUuid = await resolveActorUuid("CITIZEN", user.id);

    await getAuthoritativeDb();
    const dbNotifications = await pgQuery(
      `SELECT * FROM notifications
       WHERE recipient_id = $1 AND recipient_type = 'CITIZEN'
       ORDER BY created_at DESC`,
      [userUuid]
    );

    let supabaseNotifications: any[] = [];
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userUuid)
        .eq("recipient_type", "CITIZEN")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        supabaseNotifications = data;
      }
    } catch {}

    // Deduplicate by unique notification ID
    const notificationMap = new Map<string, any>();
    for (const n of dbNotifications) {
      notificationMap.set(n.id, n);
    }
    for (const n of supabaseNotifications) {
      if (!notificationMap.has(n.id)) {
        notificationMap.set(n.id, n);
      }
    }

    const notifications = Array.from(notificationMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: notifications.filter((n: any) => !n.read_at).length,
    });
  } catch (error: any) {
    console.error("[API notifications GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userUuid = await resolveActorUuid("CITIZEN", user.id);

    await getAuthoritativeDb();
    await pgQuery(
      `UPDATE notifications
       SET read_at = now()
       WHERE recipient_id = $1 AND recipient_type = 'CITIZEN' AND read_at IS NULL`,
      [userUuid]
    );

    try {
      const supabase = await createClient();
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", userUuid)
        .eq("recipient_type", "CITIZEN")
        .is("read_at", null);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API notifications PATCH all]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
