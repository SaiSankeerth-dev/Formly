import { NextResponse } from "next/server";
import { authenticateSession, getUserProfileFields, getUserDocuments, getPanApplications, getCitizenSessions } from "@/lib/server/db";
import { getProfileCompleteness, checkOnboardingStatus } from "@/lib/constants/profile";
import { cookies } from "next/headers";

async function getAuthenticatedUser(request: Request) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("FORMLY_CITIZEN_SESSION")?.value ||
    cookieStore.get("formly_citizen_session")?.value ||
    cookieStore.get("seva_saarthi_session")?.value ||
    (request.headers.get("Authorization")?.startsWith("Bearer ")
      ? request.headers.get("Authorization")?.substring(7)
      : null);

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
      documents: docs,
      applications: apps,
      recentSessions: sessions,
    });
  } catch (err: any) {
    console.error("[API dashboard GET] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to load dashboard" }, { status: 500 });
  }
}
