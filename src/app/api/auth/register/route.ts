import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registerUser } from "@/lib/server/db";
import { getOAuthRedirectUrl } from "@/lib/auth/oauth-url";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Full Name is required" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid email address is required" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const origin = new URL(request.url).origin;

    // 1. Primary: Supabase Auth signUp
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
          phone: phone?.trim() || "",
        },
        emailRedirectTo: getOAuthRedirectUrl({ origin }),
      },
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const authUser = data?.user;
    const userId = authUser?.id;

    // 2. Attempt automatic profile initialization in public.profiles
    if (userId) {
      try {
        await supabase.from("profiles").upsert(
          {
            id: userId,
            user_id: userId,
            full_name: name.trim(),
            phone: phone?.trim() || "",
          },
          { onConflict: "id" }
        );
      } catch {
        // Table may be populated by trigger or created later
      }
    }

    // 3. Keep local DB in sync for hybrid offline/testing resilience
    let localToken = "";
    try {
      const localResult = await registerUser(name.trim(), trimmedEmail, password, phone);
      localToken = localResult.token;
    } catch {}

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: userId || "",
        name: name.trim(),
        email: trimmedEmail,
        phone: phone?.trim() || "",
        role: "CITIZEN",
      },
    });

    if (localToken) {
      response.cookies.set({
        name: "FORMLY_CITIZEN_SESSION",
        value: localToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    // Clear any government cookies
    response.cookies.delete("FORMLY_GOV_SESSION");
    response.cookies.delete("formly_gov_session");

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Registration failed" }, { status: 400 });
  }
}
