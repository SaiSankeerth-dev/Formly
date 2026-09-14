import { NextResponse } from "next/server";
import { normalizeIndianPhoneNumber } from "@/lib/auth/phone-auth";
import { getAuthoritativeDb, pgQuery } from "@/lib/server/pg-db";
import { signSessionToken } from "@/lib/server/db";
import { checkOnboardingStatus } from "@/lib/constants/profile";
import crypto from "crypto";

/**
 * POST /api/auth/truecaller/verify
 * 
 * Server-side verification for Truecaller Mobile SDK / Web flow.
 * - Authenticates token with Truecaller profile endpoint using Bearer accessToken
 * - Maps verified phone number to authoritative Supabase & relational user profile
 * - Issues citizen session token and sets HTTP-only cookies
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { accessToken, requestId, endpoint } = body;

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Truecaller verification token is required" },
        { status: 400 }
      );
    }

    const appKey =
      process.env.TRUECALLER_APP_KEY ||
      process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY;

    if (!appKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Truecaller verification service is currently unconfigured on the server.",
          isConfigured: false,
        },
        { status: 503 }
      );
    }

    let verifiedPhone = "";
    let verifiedName = "";
    let avatarUrl = "";
    let email = "";

    try {
      const verifyUrl = endpoint || "https://profile4-noneu.truecaller.com/v1/default";
      const isProfileEndpoint = verifyUrl.includes("profile") || verifyUrl.includes("default");

      let tcRes: Response;
      if (isProfileEndpoint) {
        // Truecaller Web SDK profile fetch via GET with Bearer token
        tcRes = await fetch(verifyUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Cache-Control": "no-cache",
          },
        });
      } else {
        // App-level verify fallback
        tcRes = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            appKey,
          },
          body: JSON.stringify({ requestId }),
        });
      }

      if (!tcRes.ok) {
        const errText = await tcRes.text().catch(() => "");
        console.error(`[TRUECALLER_VERIFY] Token verification failed: ${tcRes.status} ${errText}`);
        return NextResponse.json(
          { success: false, error: "Truecaller token verification failed at provider." },
          { status: 401 }
        );
      }

      const tcData = await tcRes.json();
      verifiedPhone =
        tcData.phoneNumbers?.[0] ||
        tcData.phoneNumber ||
        tcData.phone ||
        "";
      verifiedName =
        [tcData.firstName, tcData.lastName].filter(Boolean).join(" ").trim() ||
        tcData.name ||
        "Citizen";
      avatarUrl = tcData.avatarUrl || tcData.image || "";
      email = tcData.email || "";
    } catch (err: any) {
      console.error("[TRUECALLER_VERIFY] Server call failed:", err);
      return NextResponse.json(
        { success: false, error: "Unable to contact Truecaller verification servers." },
        { status: 502 }
      );
    }

    // Normalize verified phone number
    const validation = normalizeIndianPhoneNumber(verifiedPhone);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number received from Truecaller." },
        { status: 422 }
      );
    }

    const normalizedPhone = validation.e164;
    await getAuthoritativeDb();

    // Map or create citizen profile in database
    const existingUsers = await pgQuery<any>(
      `SELECT * FROM users WHERE phone = $1 LIMIT 1`,
      [normalizedPhone]
    );

    let userId = "";
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      await pgQuery(
        `UPDATE users
         SET name = COALESCE(NULLIF($1, ''), name),
             avatar = COALESCE(NULLIF($2, ''), avatar),
             "authProvider" = 'truecaller',
             "updatedAt" = NOW()
         WHERE id = $3`,
        [verifiedName, avatarUrl, userId]
      ).catch(() => {});

      await pgQuery(
        `UPDATE profiles
         SET full_name = COALESCE(NULLIF($1, ''), full_name),
             avatar_url = COALESCE(NULLIF($2, ''), avatar_url),
             phone_verified = true,
             phone_verified_at = NOW(),
             updated_at = NOW()
         WHERE id = $3 OR user_id = $3`,
        [verifiedName, avatarUrl, userId]
      ).catch(() => {});
    } else {
      userId = crypto.randomUUID();
      const citizenEmail = email || `${normalizedPhone.replace(/\D/g, "")}@citizen.formly.local`;

      await pgQuery(
        `INSERT INTO users (id, name, email, phone, role, "createdAt", "authProvider", avatar, "updatedAt")
         VALUES ($1, $2, $3, $4, 'Applicant / Citizen', NOW(), 'truecaller', $5, NOW())
         ON CONFLICT (id) DO UPDATE SET
           phone = EXCLUDED.phone,
           "authProvider" = 'truecaller',
           "updatedAt" = NOW()`,
        [userId, verifiedName || "Citizen", citizenEmail, normalizedPhone, avatarUrl]
      );

      await pgQuery(
        `INSERT INTO profiles (id, user_id, full_name, phone, avatar_url, phone_verified, phone_verified_at, created_at, updated_at)
         VALUES ($1, $1, $2, $3, $4, true, NOW(), NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           phone_verified = true,
           phone_verified_at = NOW(),
           updated_at = NOW()`,
        [userId, verifiedName || "Citizen", normalizedPhone, avatarUrl]
      );

      await pgQuery(
        `INSERT INTO auth.users (id, email, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [userId, citizenEmail, normalizedPhone]
      ).catch(() => {});
    }

    // Check onboarding completeness
    let isComplete = false;
    try {
      const fields = await pgQuery<any>(
        `SELECT field_name, value FROM profile_fields WHERE user_id = $1`,
        [userId]
      );
      const status = checkOnboardingStatus(fields, { phone: normalizedPhone, email });
      isComplete = status.isComplete;
    } catch {
      isComplete = false;
    }

    const token = signSessionToken({
      userId,
      name: verifiedName || "Citizen",
      email: existingUsers[0]?.email || email || `${normalizedPhone.replace(/\D/g, "")}@citizen.formly.local`,
      phone: normalizedPhone,
      role: "Applicant / Citizen",
    });

    const isSecure = process.env.NODE_ENV === "production";
    const response = NextResponse.json({
      success: true,
      message: "Truecaller verification successful",
      user: {
        id: userId,
        name: verifiedName,
        phone: normalizedPhone,
        role: "Applicant / Citizen",
      },
      token,
      completed: isComplete,
      redirectTo: isComplete ? "/dashboard" : "/onboarding/profile",
    });

    response.cookies.set({
      name: "FORMLY_CITIZEN_SESSION",
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.set({
      name: "seva_saarthi_session",
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[TRUECALLER_VERIFY] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Truecaller verification error" },
      { status: 500 }
    );
  }
}
