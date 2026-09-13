import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileFields, getUserDocuments, getPanApplications, getCitizenSessions } from "@/lib/server/db";
import { getProfileCompleteness, checkOnboardingStatus } from "@/lib/constants/profile";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { pgQuery, getAuthoritativeDb } from "@/lib/server/pg-db";

export async function GET(request: Request) {
  try {
    // 1. Authenticate user from server Supabase session
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    let citizenUser: {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: string;
      avatar: string;
    } | null = null;

    if (authUser && !authError) {
      citizenUser = {
        id: authUser.id,
        name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split("@")[0] ||
          "Citizen",
        email: authUser.email || "",
        phone: authUser.user_metadata?.phone || authUser.phone || "",
        role: "Applicant / Citizen",
        avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || "",
      };
    } else {
      const fallbackUser = await getAuthenticatedCitizenUser(request);
      if (fallbackUser) {
        citizenUser = {
          id: fallbackUser.id,
          name: fallbackUser.name,
          email: fallbackUser.email,
          phone: fallbackUser.phone || "",
          role: fallbackUser.role,
          avatar: (fallbackUser as any).avatar || "",
        };
      }
    }

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
