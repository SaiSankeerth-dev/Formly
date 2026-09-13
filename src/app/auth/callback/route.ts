import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { pgQuery, getAuthoritativeDb } from "@/lib/server/pg-db";
import { getUserProfileFields, signSessionToken } from "@/lib/server/db";
import { checkOnboardingStatus } from "@/lib/constants/profile";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");

  // Determine origin safely for local dev, Vercel preview, and production domains
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const rawProto = request.headers.get("x-forwarded-proto");
  const proto = rawProto ? rawProto.split(",")[0].trim() : (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  if (errorParam || errorDesc) {
    console.error("[Supabase Auth Callback] Error returned:", errorParam, errorDesc);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.user) {
      console.error("[Supabase Auth Callback] exchangeCodeForSession failed:", error?.message);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    const user = data.user;
    const session = data.session;
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Citizen";
    const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
    const phone = user.user_metadata?.phone || user.phone || "";

    // Synchronize citizen user into Postgres with safe account linking (no duplicate accounts)
    let effectiveUserId = user.id;
    try {
      await getAuthoritativeDb();
      const existing = await pgQuery<any>(
        `SELECT id, name, avatar, phone FROM users WHERE LOWER(email) = LOWER($1)`,
        [user.email || ""]
      );

      if (existing.length > 0) {
        effectiveUserId = existing[0].id;
        await pgQuery(
          `UPDATE users SET 
             "authProvider" = COALESCE("authProvider", 'google'),
             avatar = COALESCE(NULLIF($2, ''), avatar),
             name = COALESCE(NULLIF($3, ''), name),
             "updatedAt" = now()
           WHERE id = $1`,
          [effectiveUserId, avatar, fullName]
        ).catch(() => {});
      } else {
        await pgQuery(
          `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role, "createdAt", "authProvider", avatar)
           VALUES ($1, $2, $3, $4, 'supabase_oauth', 'supabase_oauth', 'Applicant / Citizen', $5, 'google', $6)
           ON CONFLICT (email) DO UPDATE SET 
             name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
             avatar = COALESCE(NULLIF(EXCLUDED.avatar, ''), users.avatar),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone)`,
          [user.id, fullName, user.email || "", phone, user.created_at || new Date().toISOString(), avatar]
        ).catch(() => {});
      }

      await pgQuery(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email || ""]
      ).catch(() => {});
    } catch (syncErr) {
      console.warn("[Supabase Auth Callback] Postgres user sync non-fatal warning:", syncErr);
    }

    // Check profile completeness in Supabase & local records
    let isComplete = false;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (profile && profile.full_name && (profile.date_of_birth || profile.gender || profile.occupation || profile.phone)) {
        isComplete = true;
      }
    } catch {
      isComplete = false;
    }

    if (!isComplete) {
      try {
        const fields = await getUserProfileFields(effectiveUserId);
        const status = checkOnboardingStatus(fields, { email: user.email, phone });
        if (status.isComplete) {
          isComplete = true;
        } else if (effectiveUserId !== user.id) {
          const altFields = await getUserProfileFields(user.id);
          const altStatus = checkOnboardingStatus(altFields, { email: user.email, phone });
          if (altStatus.isComplete) {
            isComplete = true;
          }
        }
      } catch {
        isComplete = false;
      }
    }

    // Generate authoritative stateless citizen session token and persist session
    const citizenToken = signSessionToken({
      userId: effectiveUserId,
      name: fullName,
      email: user.email || "",
      phone,
      role: "Applicant / Citizen",
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await pgQuery(
      `INSERT INTO sessions (token, "userId", "expiresAt") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [citizenToken, effectiveUserId, expiresAt]
    ).catch(() => {});

    // Determine safe destination (never redirect citizen OAuth to government portal)
    const rawDestination = isComplete ? "/dashboard" : "/onboarding/profile?step=1";
    const destination = rawDestination.startsWith("/gov") ? "/dashboard" : rawDestination;
    const response = NextResponse.redirect(new URL(destination, origin));

    // Forward Supabase PKCE session cookies
    cookieStore.getAll().forEach((c) => {
      if (c.name !== "FORMLY_CITIZEN_SESSION" && c.name !== "seva_saarthi_session") {
        response.cookies.set(c.name, c.value);
      }
    });

    // Set citizen session cookies with verified HMAC token
    response.cookies.set({
      name: "FORMLY_CITIZEN_SESSION",
      value: citizenToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.set({
      name: "seva_saarthi_session",
      value: citizenToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    // Enforce strict citizen/government isolation: clear all government cookies
    response.cookies.delete("FORMLY_GOV_SESSION");
    response.cookies.delete("formly_gov_session");
    response.cookies.delete("gov_session_token");
    response.cookies.delete("gov_remember_token");

    return response;
  } catch (err: any) {
    console.error("[Supabase Auth Callback] Unexpected exchange error:", err?.message || err);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }
}
