import { NextResponse } from "next/server";
import { getUserProfileFields, getUserDocuments, getPanApplications, getCitizenSessions } from "@/lib/server/db";
import { getProfileCompleteness, checkOnboardingStatus } from "@/lib/constants/profile";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { pgQuery, getAuthoritativeDb } from "@/lib/server/pg-db";

export async function GET(request: Request) {
  try {
    // 1. Authenticate user from authoritative session (Supabase Auth / SSR)
    const citizenUser = await getAuthenticatedCitizenUser(request);

    if (!citizenUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Citizen authentication required" },
        { status: 401 }
      );
    }

    const userId = citizenUser.id;

    // 2. Derive all user data strictly by authenticated user ID
    await getAuthoritativeDb();

    let profileFields: any[] = [];
    try {
      profileFields = await getUserProfileFields(userId);
    } catch (err) {
      console.error("[API dashboard GET] DASHBOARD_PROFILE_QUERY_FAILED:", err);
      profileFields = [];
    }

    let docs: any[] = [];
    try {
      docs = await getUserDocuments(userId);
    } catch (err) {
      console.error("[API dashboard GET] DASHBOARD_DOCUMENTS_QUERY_FAILED:", err);
      docs = [];
    }

    let apps: any[] = [];
    try {
      const dbApps = await pgQuery(
        `SELECT * FROM applications WHERE user_id = $1 OR citizen_user_id = $1 ORDER BY created_at DESC`,
        [userId]
      ).catch(() => []);
      const memApps = await getPanApplications({ userId });
      apps = dbApps.length > 0 ? dbApps : (Array.isArray(memApps) ? memApps : []);
    } catch (err) {
      console.error("[API dashboard GET] DASHBOARD_APPLICATIONS_QUERY_FAILED:", err);
      apps = [];
    }

    let sessions: any[] = [];
    try {
      sessions = await getCitizenSessions(userId);
    } catch {
      sessions = [];
    }

    let notifications: any[] = [];
    try {
      notifications = await pgQuery(
        `SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = 'CITIZEN' ORDER BY created_at DESC`,
        [userId]
      ).catch(() => []);
    } catch {
      notifications = [];
    }

    // 3. Compute profile metrics and safe display name
    const onboardingStatus = checkOnboardingStatus(profileFields, citizenUser);
    const completeness = getProfileCompleteness(profileFields);
    const firstName = citizenUser.name ? citizenUser.name.trim().split(/\s+/)[0] : "Citizen";

    return NextResponse.json({
      success: true,
      user: {
        id: citizenUser.id,
        name: citizenUser.name,
        firstName,
        email: citizenUser.email,
        phone: citizenUser.phone || "",
        phone_verified: Boolean((citizenUser as any).phoneVerified || (citizenUser as any).phone_verified),
        role: citizenUser.role,
        avatar: citizenUser.avatar || "",
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
      notifications: Array.isArray(notifications) ? notifications : [],
      recentServices: Array.isArray(sessions) ? sessions : [],
      recentSessions: Array.isArray(sessions) ? sessions : [],
    });
  } catch (err: any) {
    console.error("[API dashboard GET] DASHBOARD_QUERY_FAILED:", err);
    return NextResponse.json(
      {
        success: false,
        error: "DASHBOARD_QUERY_FAILED",
        message: "Failed to load dashboard data. Please check your connection and try again.",
      },
      { status: 500 }
    );
  }
}
