import { NextResponse } from "next/server";
import { authenticateSession, getUserProfileFields, getUserDocuments, getPanApplications, getCitizenSessions } from "@/lib/server/db";
import { getProfileCompleteness, checkOnboardingStatus } from "@/lib/constants/profile";
import { cookies } from "next/headers";

function extractTokenFromRequest(request: Request, cookieStore?: any): string | null {
  // 1. Check Bearer Authorization Header
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Next.js cookieStore if available
  if (cookieStore) {
    const token =
      cookieStore.get("FORMLY_CITIZEN_SESSION")?.value ||
      cookieStore.get("formly_citizen_session")?.value ||
      cookieStore.get("seva_saarthi_session")?.value;
    if (token) return token;
  }

  // 3. Robust fallback: Parse standard request Cookie header directly
  const cookieHeader = request.headers.get("cookie") || "";
  if (cookieHeader) {
    const pairs = cookieHeader.split(";");
    for (const pair of pairs) {
      const [k, v] = pair.trim().split("=");
      if (
        k === "FORMLY_CITIZEN_SESSION" ||
        k === "formly_citizen_session" ||
        k === "seva_saarthi_session"
      ) {
        return decodeURIComponent(v || "");
      }
    }
  }

  return null;
}

async function getAuthenticatedUser(request: Request) {
  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {}

  const token = extractTokenFromRequest(request, cookieStore);
  if (!token) return null;
  return await authenticateSession(token);
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Citizen session required" },
        { status: 401 }
      );
    }

    // Server-isolated data queries for this authenticated user ONLY
    const [profileFields, docs, apps, sessions] = await Promise.all([
      getUserProfileFields(user.id),
      getUserDocuments(user.id),
      getPanApplications({ userId: user.id }),
      getCitizenSessions(user.id),
    ]);

    const onboardingStatus = checkOnboardingStatus(profileFields, user);
    const completeness = getProfileCompleteness(profileFields);
    const firstName = user.name ? user.name.trim().split(/\s+/)[0] : "Citizen";

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        firstName,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
      },
      profile: {
        completed: onboardingStatus.isComplete,
        currentStep: onboardingStatus.currentStep,
        completionScore: completeness.strength,
        emptyCount: completeness.emptyCount,
        fields: onboardingStatus.profileMap,
      },
      documents: Array.isArray(docs) ? docs : [],
      applications: Array.isArray(apps) ? apps : [],
      recentServices: Array.isArray(sessions) ? sessions : [],
      recentSessions: Array.isArray(sessions) ? sessions : [],
    });
  } catch (err: any) {
    console.error("[API dashboard GET] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to load dashboard" }, { status: 500 });
  }
}
