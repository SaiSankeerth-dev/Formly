import { NextResponse } from "next/server";
import { normalizeIndianPhoneNumber } from "@/lib/auth/phone-auth";
import { getAuthoritativeDb, pgQuery } from "@/lib/server/pg-db";
import { signSessionToken } from "@/lib/server/db";
import { checkOnboardingStatus } from "@/lib/constants/profile";
import { completeVerification, failVerification } from "@/lib/auth/truecaller-store";
import crypto from "crypto";

/**
 * Truecaller Web Application Callback Route
 * 
 * Configured in Truecaller Developer Portal:
 * Callback URL: https://seva-saarthi-five.vercel.app/auth/truecaller/callback
 * 
 * Handles:
 * 1. POST: Webhook dispatched by Truecaller servers containing { requestId, accessToken, endpoint }
 * 2. GET: Direct browser redirect fallback if flow completes via client-side redirect
 */

interface TruecallerCallbackBody {
  requestId?: string;
  accessToken?: string;
  endpoint?: string;
}

interface TruecallerUserProfile {
  phoneNumbers?: string[];
  phoneNumber?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  avatarUrl?: string;
  image?: string;
  email?: string;
  street?: string;
  city?: string;
  zipcode?: string;
  countryCode?: string;
}

/**
 * Helper: Fetch user profile directly from Truecaller's dynamic verification endpoint
 */
async function fetchTruecallerProfile(
  endpoint: string,
  accessToken: string
): Promise<{ success: true; profile: TruecallerUserProfile } | { success: false; error: string; status: number }> {
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[TRUECALLER_CALLBACK] Profile fetch failed: status=${response.status} msg=${errText}`);
      return {
        success: false,
        error: `Truecaller profile endpoint responded with status ${response.status}`,
        status: response.status,
      };
    }

    const profile = (await response.json()) as TruecallerUserProfile;
    return { success: true, profile };
  } catch (err: any) {
    console.error("[TRUECALLER_CALLBACK] Network error contacting endpoint:", err);
    return {
      success: false,
      error: err?.message || "Failed to contact Truecaller profile endpoint",
      status: 502,
    };
  }
}

/**
 * Helper: Process verified Truecaller profile and map to authoritative Supabase / local DB user
 */
async function processVerifiedTruecallerUser(profile: TruecallerUserProfile) {
  // Extract phone number from various potential Truecaller payload fields
  const rawPhone =
    profile.phoneNumbers?.[0] ||
    profile.phoneNumber ||
    profile.phone ||
    "";

  if (!rawPhone) {
    throw new Error("No phone number found in Truecaller profile");
  }

  const validation = normalizeIndianPhoneNumber(rawPhone);
  if (!validation.valid) {
    throw new Error(`Invalid Indian phone number received from Truecaller: ${rawPhone}`);
  }

  const normalizedPhone = validation.e164;
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Citizen";
  const avatarUrl = profile.avatarUrl || profile.image || "";
  const email = profile.email || `${normalizedPhone.replace(/\D/g, "")}@citizen.formly.local`;

  await getAuthoritativeDb();

  // Check if citizen already exists in relational users table
  const existingUsers = await pgQuery<any>(
    `SELECT * FROM users WHERE phone = $1 LIMIT 1`,
    [normalizedPhone]
  );

  let userId = "";
  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;

    // Update existing user & profile
    await pgQuery(
      `UPDATE users
       SET
         name = COALESCE(NULLIF($1, ''), name),
         avatar = COALESCE(NULLIF($2, ''), avatar),
         "authProvider" = 'truecaller',
         "updatedAt" = NOW()
       WHERE id = $3`,
      [fullName, avatarUrl, userId]
    ).catch(() => {});

    await pgQuery(
      `UPDATE profiles
       SET
         full_name = COALESCE(NULLIF($1, ''), full_name),
         avatar_url = COALESCE(NULLIF($2, ''), avatar_url),
         phone_verified = true,
         phone_verified_at = NOW(),
         updated_at = NOW()
       WHERE id = $3 OR user_id = $3`,
      [fullName, avatarUrl, userId]
    ).catch(() => {});
  } else {
    userId = crypto.randomUUID();

    // Insert into relational users
    await pgQuery(
      `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role, "createdAt", "authProvider", avatar, "updatedAt")
       VALUES ($1, $2, $3, $4, 'truecaller_verified', 'truecaller_verified', 'Applicant / Citizen', NOW(), 'truecaller', $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         phone = EXCLUDED.phone,
         "authProvider" = 'truecaller',
         "updatedAt" = NOW()`,
      [userId, fullName, email, normalizedPhone, avatarUrl]
    ).catch(() => {});

    // Insert into profiles
    await pgQuery(
      `INSERT INTO profiles (id, user_id, full_name, phone, avatar_url, phone_verified, phone_verified_at, created_at, updated_at)
       VALUES ($1, $1, $2, $3, $4, true, NOW(), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         phone_verified = true,
         phone_verified_at = NOW(),
         updated_at = NOW()`,
      [userId, fullName, normalizedPhone, avatarUrl]
    ).catch(() => {});

    // Maintain foreign key alignment with auth.users
    await pgQuery(
      `INSERT INTO auth.users (id, email, phone)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [userId, email, normalizedPhone]
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
    name: fullName,
    email,
    phone: normalizedPhone,
    role: "Applicant / Citizen",
  });

  // Record session in DB
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await pgQuery(
    `INSERT INTO sessions (token, "userId", "expiresAt") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [token, userId, expiresAt]
  ).catch(() => {});

  const userPayload = {
    id: userId,
    name: fullName,
    phone: normalizedPhone,
    email,
    avatar: avatarUrl,
    role: "Applicant / Citizen",
  };

  return {
    userId,
    user: userPayload,
    token,
    normalizedPhone,
    isComplete,
    redirectTo: isComplete ? "/dashboard" : "/onboarding/profile",
  };
}

/**
 * POST /auth/truecaller/callback
 * Webhook triggered by Truecaller backend when citizen grants consent
 */
export async function POST(request: Request) {
  try {
    const body: TruecallerCallbackBody = await request.json().catch(() => ({}));
    const { requestId, accessToken, endpoint } = body;

    console.log("[TRUECALLER_CALLBACK] POST received:", {
      hasRequestId: Boolean(requestId),
      hasAccessToken: Boolean(accessToken),
      endpoint,
    });

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid requestId" },
        { status: 400 }
      );
    }

    if (!accessToken || typeof accessToken !== "string") {
      failVerification(requestId, "Missing Truecaller accessToken");
      return NextResponse.json(
        { success: false, error: "Missing or invalid accessToken" },
        { status: 400 }
      );
    }

    if (!endpoint || typeof endpoint !== "string") {
      failVerification(requestId, "Missing Truecaller profile endpoint");
      return NextResponse.json(
        { success: false, error: "Missing or invalid endpoint" },
        { status: 400 }
      );
    }

    // Step 1: Contact Truecaller profile endpoint
    const profileResult = await fetchTruecallerProfile(endpoint, accessToken);
    if (!profileResult.success) {
      failVerification(requestId, profileResult.error);
      return NextResponse.json(
        { success: false, error: profileResult.error },
        { status: profileResult.status }
      );
    }

    // Step 2: Provision / update citizen and generate session
    const processed = await processVerifiedTruecallerUser(profileResult.profile);

    // Step 3: Complete verification in correlation store so polling client receives session
    completeVerification(requestId, {
      user: processed.user,
      token: processed.token,
      redirectTo: processed.redirectTo,
      phone: processed.normalizedPhone,
      profile: profileResult.profile,
    });

    console.log(`[TRUECALLER_CALLBACK] Verification completed for requestId=${requestId} phone=${processed.normalizedPhone}`);

    return NextResponse.json({
      success: true,
      status: 200,
      message: "Truecaller verification completed successfully",
      requestId,
    });
  } catch (err: any) {
    console.error("[TRUECALLER_CALLBACK] Fatal error processing callback:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error during verification" },
      { status: 500 }
    );
  }
}

/**
 * GET /auth/truecaller/callback
 * Browser redirect fallback if Truecaller completes verification via GET redirect
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestId = requestUrl.searchParams.get("requestId");
  const accessToken = requestUrl.searchParams.get("accessToken");
  const endpoint = requestUrl.searchParams.get("endpoint");

  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const host = rawHost.split(",")[0].trim();
  const rawProto = request.headers.get("x-forwarded-proto");
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = isLocal ? "http" : (rawProto ? rawProto.split(",")[0].trim() : "https");
  const origin = `${proto}://${host}`;
  const isSecure = proto === "https";

  if (!accessToken || !endpoint) {
    return NextResponse.redirect(`${origin}/login?error=truecaller_missing_params`);
  }

  try {
    const profileResult = await fetchTruecallerProfile(endpoint, accessToken);
    if (!profileResult.success) {
      return NextResponse.redirect(
        `${origin}/login?error=truecaller_verification_failed&reason=${encodeURIComponent(profileResult.error)}`
      );
    }

    const processed = await processVerifiedTruecallerUser(profileResult.profile);

    if (requestId) {
      completeVerification(requestId, {
        user: processed.user,
        token: processed.token,
        redirectTo: processed.redirectTo,
        phone: processed.normalizedPhone,
        profile: profileResult.profile,
      });
    }

    const response = NextResponse.redirect(new URL(processed.redirectTo, origin));

    response.cookies.set({
      name: "FORMLY_CITIZEN_SESSION",
      value: processed.token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.set({
      name: "seva_saarthi_session",
      value: processed.token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[TRUECALLER_CALLBACK_GET] Error:", err);
    return NextResponse.redirect(`${origin}/login?error=truecaller_exception`);
  }
}
