import { NextResponse } from "next/server";
import { logoutSession } from "@/lib/server/db";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];

    // 1. Supabase Auth signOut (invalidates Supabase session & deletes auth cookies)
    try {
      const supabase = await createClient({
        cookieStore,
        onSetCookies: (incoming) => {
          cookiesToSet.push(...incoming);
        },
      });
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

    // Apply Supabase cookie removals with root path
    for (const c of cookiesToSet) {
      response.cookies.set(c.name, c.value, {
        ...c.options,
        path: "/",
      });
    }

    // Explicitly expire all Supabase and citizen session cookies
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (
        c.name.startsWith("sb-") ||
        c.name === "FORMLY_CITIZEN_SESSION" ||
        c.name === "formly_citizen_session" ||
        c.name === "seva_saarthi_session"
      ) {
        response.cookies.set({
          name: c.name,
          value: "",
          maxAge: 0,
          path: "/",
        });
      }
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

