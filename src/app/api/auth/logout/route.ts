import { NextResponse } from "next/server";
import { logoutSession } from "@/lib/server/db";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Supabase Auth signOut (invalidates Supabase session & deletes auth cookies)
    try {
      const supabase = await createClient(cookieStore);
      await supabase.auth.signOut();
    } catch {}

    // 2. Invalidate local session token if present
    const token =
      cookieStore.get("FORMLY_CITIZEN_SESSION")?.value ||
      cookieStore.get("formly_citizen_session")?.value ||
      cookieStore.get("seva_saarthi_session")?.value;

    if (token) {
      logoutSession(token);
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.delete("FORMLY_CITIZEN_SESSION");
    response.cookies.delete("formly_citizen_session");
    response.cookies.delete("seva_saarthi_session");
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

