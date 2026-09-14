import { NextResponse } from "next/server";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { pgQuery, getAuthoritativeDb } from "@/lib/server/pg-db";
import { normalizeIndianPhoneNumber } from "@/lib/auth/phone-auth";
import { signSessionToken } from "@/lib/server/db";

/**
 * GET /api/citizen/phone-verify
 * Checks phone verification status of the authenticated citizen.
 */
export async function GET(request: Request) {
  try {
    const citizenUser = await getAuthenticatedCitizenUser(request);
    if (!citizenUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await getAuthoritativeDb();

    // Check Supabase Auth identity phone state
    let supabasePhone = "";
    let supabasePhoneConfirmed = false;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabasePhone = user.phone || "";
        supabasePhoneConfirmed = Boolean(user.phone_confirmed_at);
      }
    } catch {}

    // Check database profile record
    const profiles = await pgQuery<any>(
      `SELECT phone, phone_verified, phone_verified_at FROM profiles WHERE id = $1 OR user_id = $1`,
      [citizenUser.id]
    ).catch(() => []);

    const dbProfile = profiles[0] || null;
    const isVerified = Boolean(
      dbProfile?.phone_verified ||
      supabasePhoneConfirmed
    );

    const phone = dbProfile?.phone || supabasePhone || citizenUser.phone || "";

    return NextResponse.json({
      success: true,
      phone,
      phone_verified: isVerified,
      phone_verified_at: dbProfile?.phone_verified_at || null,
      userId: citizenUser.id,
    });
  } catch (err: any) {
    console.error("[PHONE_VERIFY_GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to inspect phone verification status." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/citizen/phone-verify
 * Confirms phone verification in the database for the authenticated citizen.
 * Uses auth.uid() identity strictly - does not trust client-supplied user IDs.
 */
export async function POST(request: Request) {
  try {
    const citizenUser = await getAuthenticatedCitizenUser(request);
    if (!citizenUser) {
      return NextResponse.json({ success: false, error: "Unauthorized: Citizen session required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawPhone = body.phone || citizenUser.phone;

    const validation = normalizeIndianPhoneNumber(rawPhone);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const normalizedPhone = validation.e164;
    const userId = citizenUser.id;

    await getAuthoritativeDb();

    // 1. Update profiles table for the authenticated user ID
    await pgQuery(
      `INSERT INTO profiles (id, user_id, phone, phone_verified, phone_verified_at, created_at, updated_at)
       VALUES ($1, $1, $2, true, NOW(), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         phone = $2,
         phone_verified = true,
         phone_verified_at = NOW(),
         updated_at = NOW()`,
      [userId, normalizedPhone]
    ).catch(() => {});

    // 2. Update users table for foreign keys
    await pgQuery(
      `UPDATE users SET
         phone = $1,
         "updatedAt" = NOW()
       WHERE id = $2`,
      [normalizedPhone, userId]
    ).catch(() => {});

    // 3. Update or create profile_fields for phone_number and mobile
    const now = new Date().toISOString();
    const phoneFieldId = `pf_${userId}_phone_number`;
    const mobileFieldId = `pf_${userId}_mobile`;

    await pgQuery(
      `INSERT INTO profile_fields (id, user_id, field_name, value, confidence, verified, confirmed_at, created_at, updated_at)
       VALUES ($1, $2, 'phone_number', $3, 1.0, true, $4, $4, $4)
       ON CONFLICT (id) DO UPDATE SET
         value = $3,
         verified = true,
         confirmed_at = $4,
         updated_at = $4`,
      [phoneFieldId, userId, normalizedPhone, now]
    ).catch(() => {});

    await pgQuery(
      `INSERT INTO profile_fields (id, user_id, field_name, value, confidence, verified, confirmed_at, created_at, updated_at)
       VALUES ($1, $2, 'mobile', $3, 1.0, true, $4, $4, $4)
       ON CONFLICT (id) DO UPDATE SET
         value = $3,
         verified = true,
         confirmed_at = $4,
         updated_at = $4`,
      [mobileFieldId, userId, normalizedPhone, now]
    ).catch(() => {});

    // 4. Sync to Supabase server client if accessible
    try {
      const supabase = await createClient();
      await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            user_id: userId,
            phone: normalizedPhone,
            phone_verified: true,
            updated_at: now,
          },
          { onConflict: "id" }
        );
    } catch {}

    // 5. Issue session token for persistent session across tabs and refreshes
    const citizenToken = signSessionToken({
      userId,
      name: citizenUser.name || "Citizen",
      email: citizenUser.email || "",
      phone: normalizedPhone,
      role: "Applicant / Citizen",
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await pgQuery(
      `INSERT INTO sessions (token, "userId", "expiresAt") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [citizenToken, userId, expiresAt]
    ).catch(() => {});

    const response = NextResponse.json({
      success: true,
      phone: normalizedPhone,
      phone_verified: true,
      userId,
      token: citizenToken,
      message: "Phone number verified and linked successfully.",
    });

    const isSecure = process.env.NODE_ENV === "production";
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

    return response;
  } catch (err: any) {
    console.error("[PHONE_VERIFY_POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to confirm phone verification." },
      { status: 500 }
    );
  }
}
