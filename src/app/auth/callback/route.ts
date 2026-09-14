import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { type CookieOptions } from "@supabase/ssr";
import { pgQuery, getAuthoritativeDb } from "@/lib/server/pg-db";
import { getUserProfileFields, signSessionToken } from "@/lib/server/db";
import { checkOnboardingStatus } from "@/lib/constants/profile";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");

  // Determine origin and secure protocol safely for local dev, Vercel preview, and production domains
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const rawProto = request.headers.get("x-forwarded-proto");
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = isLocal ? "http" : (rawProto ? rawProto.split(",")[0].trim() : "https");
  const origin = `${proto}://${host}`;
  const isSecure = proto === "https";

  // Safe development logging
  console.log(`[AUTH CALLBACK] callback_reached=true code_present=${Boolean(code)}`);

  if (errorParam || errorDesc) {
    console.error("[AUTH CALLBACK] OAuth provider error returned:", errorParam, errorDesc);
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
  }

  if (!code) {
    console.error("[AUTH CALLBACK] Missing authorization code in query params");
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
  }

  try {
    const cookieStore = await cookies();
    const responseCookies: Array<{ name: string; value: string; options?: CookieOptions }> = [];

    // Create server Supabase client capturing all cookie mutations
    const supabase = await createClient({
      cookieStore,
      onSetCookies: (cookiesToSet) => {
        responseCookies.push(...cookiesToSet);
      },
    });

    // Exchange PKCE authorization code for authenticated Supabase session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.user) {
      console.error("[AUTH CALLBACK] exchange_result=failure error=", exchangeError?.message || "No user data returned");
      return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
    }

    console.log(`[AUTH CALLBACK] exchange_result=success session_created=true`);

    // Authoritative user identity derived from Supabase Auth
    const {
      data: { user: authUser },
      error: getUserError,
    } = await supabase.auth.getUser();

    const user = authUser || data.user;
    if (!user || !user.id) {
      console.error("[AUTH CALLBACK] Failed to resolve authenticated user after code exchange:", getUserError?.message);
      return NextResponse.redirect(`${origin}/login?error=session_establishment_failed`);
    }

    console.log(`[AUTH CALLBACK] user_id=${user.id}`);

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Citizen";
    const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
    const phone = user.user_metadata?.phone || user.phone || "";

    // Profile lookup & creation using the authoritative Supabase auth UUID (user.id)
    let profileExists = false;
    let isComplete = false;

    try {
      await getAuthoritativeDb();

      // 1. Check existing profile in database for this authoritative user ID
      const existingProfiles = await pgQuery<any>(
        `SELECT * FROM profiles WHERE id = $1 OR user_id = $1`,
        [user.id]
      );

      if (existingProfiles.length > 0) {
        profileExists = true;
      } else {
        // 2. Insert new profile for this authenticated Google user without fake PII
        await pgQuery(
          `INSERT INTO profiles (id, user_id, full_name, phone, created_at, updated_at)
           VALUES ($1, $1, $2, $3, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
             updated_at = NOW()`,
          [user.id, fullName, phone]
        ).catch(() => {});
        profileExists = true;
      }

      // 3. Safe Account Linking: If user registered earlier with email/password, link to authoritative user.id
      if (user.email) {
        const existingUsers = await pgQuery<any>(
          `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
          [user.email, user.id]
        );
        if (existingUsers.length > 0) {
          const oldId = existingUsers[0].id;
          await pgQuery(`UPDATE applications SET user_id = $1, citizen_user_id = $1 WHERE user_id = $2 OR citizen_user_id = $2`, [user.id, oldId]).catch(() => {});
          await pgQuery(`UPDATE documents SET user_id = $1 WHERE user_id = $2`, [user.id, oldId]).catch(() => {});
          await pgQuery(`UPDATE profile_fields SET user_id = $1 WHERE user_id = $2`, [user.id, oldId]).catch(() => {});
          await pgQuery(`UPDATE addresses SET user_id = $1 WHERE user_id = $2`, [user.id, oldId]).catch(() => {});
          await pgQuery(`UPDATE sessions SET "userId" = $1 WHERE "userId" = $2`, [user.id, oldId]).catch(() => {});
          await pgQuery(`UPDATE notifications SET recipient_id = $1 WHERE recipient_id = $2`, [user.id, oldId]).catch(() => {});

          // Merge profile fields from old profile into new profile if new profile exists
          await pgQuery(
            `UPDATE profiles
             SET
               full_name = COALESCE(NULLIF(profiles.full_name, ''), old_p.full_name),
               phone = COALESCE(NULLIF(profiles.phone, ''), old_p.phone),
               date_of_birth = COALESCE(profiles.date_of_birth, old_p.date_of_birth),
               gender = COALESCE(NULLIF(profiles.gender, ''), old_p.gender),
               occupation = COALESCE(NULLIF(profiles.occupation, ''), old_p.occupation),
               education = COALESCE(NULLIF(profiles.education, ''), old_p.education),
               avatar_url = COALESCE(NULLIF(profiles.avatar_url, ''), old_p.avatar_url),
               phone_verified = (COALESCE(profiles.phone_verified, false) OR COALESCE(old_p.phone_verified, false)),
               phone_verified_at = COALESCE(profiles.phone_verified_at, old_p.phone_verified_at)
             FROM (SELECT * FROM profiles WHERE id = $2 OR user_id = $2) AS old_p
             WHERE profiles.id = $1 OR profiles.user_id = $1`,
            [user.id, oldId]
          ).catch(() => {});
          await pgQuery(`DELETE FROM profiles WHERE (id = $2 OR user_id = $2) AND id != $1 AND user_id != $1`, [user.id, oldId]).catch(() => {});
          await pgQuery(`UPDATE profiles SET id = $1, user_id = $1 WHERE id = $2 OR user_id = $2`, [user.id, oldId]).catch(() => {});
          await pgQuery(
            `UPDATE users SET
               id = $1,
               name = COALESCE(NULLIF($2, ''), name),
               avatar = COALESCE(NULLIF($3, ''), avatar),
               phone = COALESCE(NULLIF($4, ''), phone),
               "authProvider" = 'google',
               "updatedAt" = NOW()
             WHERE id = $5`,
            [user.id, fullName, avatar, phone, oldId]
          ).catch(() => {});
        }
      }

      // 4. Synchronize user record for foreign key constraints (relational tables)
      await pgQuery(
        `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role, "createdAt", "authProvider", avatar, "updatedAt")
         VALUES ($1, $2, $3, $4, 'supabase_oauth', 'supabase_oauth', 'Applicant / Citizen', NOW(), 'google', $5, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
           avatar = COALESCE(NULLIF(EXCLUDED.avatar, ''), users.avatar),
           "authProvider" = 'google',
           "updatedAt" = NOW()`,
        [user.id, fullName, user.email || "", phone, avatar]
      ).catch(() => {});

      await pgQuery(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email || ""]
      ).catch(() => {});

      // 5. Canonical profile completeness check
      try {
        const fields = await getUserProfileFields(user.id);
        const status = checkOnboardingStatus(fields, { email: user.email, phone });
        isComplete = status.isComplete;
      } catch {
        isComplete = false;
      }
    } catch (syncErr) {
      console.warn("[AUTH CALLBACK] Non-fatal profile/user sync notice:", syncErr);
    }

    console.log(`[AUTH CALLBACK] profile_exists=${profileExists} is_complete=${isComplete}`);

    // Destination: Direct uncompleted profiles to /onboarding/profile, completed to /dashboard (or requested 'next')
    const nextParam = requestUrl.searchParams.get("next");
    const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
    const destination = isComplete ? (safeNext || "/dashboard") : "/onboarding/profile";

    console.log(`[AUTH CALLBACK] redirect=${destination}`);

    const response = NextResponse.redirect(new URL(destination, origin));

    // Write all Supabase session cookies onto the response with path="/"
    responseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...options,
        path: "/",
        sameSite: "lax",
        secure: isSecure,
      });
    });

    // Issue verified stateless citizen session token for backward compatibility
    const citizenToken = signSessionToken({
      userId: user.id,
      name: fullName,
      email: user.email || "",
      phone,
      role: "Applicant / Citizen",
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await pgQuery(
      `INSERT INTO sessions (token, "userId", "expiresAt") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [citizenToken, user.id, expiresAt]
    ).catch(() => {});

    response.cookies.set({
      name: "FORMLY_CITIZEN_SESSION",
      value: citizenToken,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.set({
      name: "seva_saarthi_session",
      value: citizenToken,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    // Enforce strict citizen/government platform isolation: clear all government cookies
    response.cookies.delete("FORMLY_GOV_SESSION");
    response.cookies.delete("formly_gov_session");
    response.cookies.delete("gov_session_token");
    response.cookies.delete("gov_remember_token");

    return response;
  } catch (err: any) {
    console.error("[AUTH CALLBACK] Fatal callback exception:", err?.message || err);
    return NextResponse.redirect(`${origin}/login?error=callback_exception`);
  }
}
