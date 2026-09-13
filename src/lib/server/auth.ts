import { NextRequest, NextResponse } from "next/server";
import { authenticateSession, getEmployeeBySession, UserRecord, EmployeeRecord } from "./db";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { pgQuery } from "./pg-db";

export interface GovAuthContext {
  user: Omit<UserRecord, "passwordHash" | "salt">;
  employee: EmployeeRecord;
}

export type GovSessionResult =
  | { success: true; user: GovAuthContext["user"]; employee: EmployeeRecord; error?: undefined }
  | { success: false; user?: undefined; employee?: undefined; error: string; status: number };

export interface CitizenAuthContext {
  user: Omit<UserRecord, "passwordHash" | "salt">;
}

export type CitizenSessionResult =
  | { success: true; user: CitizenAuthContext["user"]; error?: undefined }
  | { success: false; user?: undefined; error: string; status: number };

export function extractCitizenToken(request?: Request | NextRequest, cookieStore?: any): string | null {
  if (cookieStore) {
    const token =
      cookieStore.get("FORMLY_CITIZEN_SESSION")?.value ||
      cookieStore.get("formly_citizen_session")?.value ||
      cookieStore.get("seva_saarthi_session")?.value;
    if (token) return token;
  }

  if (request) {
    const headers = (request as any).headers;
    if (headers && typeof headers.get === "function") {
      const authHeader = headers.get("Authorization") || headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7).trim();
      }
    }

    if ("cookies" in request && typeof (request as any).cookies?.get === "function") {
      const token =
        (request as any).cookies.get("FORMLY_CITIZEN_SESSION")?.value ||
        (request as any).cookies.get("formly_citizen_session")?.value ||
        (request as any).cookies.get("seva_saarthi_session")?.value;
      if (token) return token;
    }

    if (headers && typeof headers.get === "function") {
      const cookieHeader = headers.get("cookie") || "";
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
    }
  }

  return null;
}

export async function getAuthenticatedCitizenUser(
  request?: Request | NextRequest
): Promise<Omit<UserRecord, "passwordHash" | "salt"> | null> {
  // 1. Primary: Supabase Auth via @supabase/ssr single source of truth
  try {
    let cookieStore: any = null;
    try {
      cookieStore = await cookies();
    } catch {}

    const supabase = await createClient(cookieStore);
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (authUser && !error) {
      let profileName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || "";
      let profilePhone = authUser.user_metadata?.phone || authUser.phone || "";
      let profileAvatar = authUser.user_metadata?.avatar_url || "";

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .or(`id.eq.${authUser.id},user_id.eq.${authUser.id}`)
          .maybeSingle();

        if (profile) {
          if (profile.full_name) profileName = profile.full_name;
          if (profile.phone) profilePhone = profile.phone;
          if (profile.avatar_url) profileAvatar = profile.avatar_url;
        }
      } catch {}

      const citizenUser: Omit<UserRecord, "passwordHash" | "salt"> = {
        id: authUser.id,
        name: profileName || authUser.email?.split("@")[0] || "Citizen",
        email: authUser.email || "",
        phone: profilePhone,
        role: "Applicant / Citizen",
        createdAt: authUser.created_at || new Date().toISOString(),
        authProvider: authUser.app_metadata?.provider || "supabase",
        avatar: profileAvatar,
      };

      // Ensure user record exists in PostgreSQL to satisfy relational foreign keys
      try {
        await pgQuery(
          `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role, "createdAt")
           VALUES ($1, $2, $3, $4, 'supabase_auth', 'supabase_auth', 'Applicant / Citizen', $5)
           ON CONFLICT (id) DO UPDATE SET 
             name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
             email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone)`,
          [citizenUser.id, citizenUser.name, citizenUser.email, citizenUser.phone, citizenUser.createdAt]
        );
        await pgQuery(
          `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [citizenUser.id, citizenUser.email]
        ).catch(() => {});
      } catch {}

      return citizenUser;
    }
  } catch (supabaseErr) {
    // Non-fatal, fallback to local session
  }

  // 2. Secondary / Local fallback for offline/seeded test accounts
  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {}

  const token = extractCitizenToken(request, cookieStore);
  if (token) {
    const user = await authenticateSession(token);
    if (user) return user;
  }

  return null;
}

export async function validateCitizenSession(request: NextRequest): Promise<CitizenSessionResult> {
  const user = await getAuthenticatedCitizenUser(request);
  if (!user) {
    return { success: false, status: 401, error: "Unauthorized: Citizen session required" };
  }
  return { success: true, user };
}

export async function validateGovSession(request: NextRequest): Promise<GovSessionResult> {
  const sessionToken =
    request.cookies.get("FORMLY_GOV_SESSION")?.value ||
    request.cookies.get("formly_gov_session")?.value;

  if (!sessionToken) {
    return { success: false, status: 401, error: "Unauthorized: No government session found" };
  }

  const user = await authenticateSession(sessionToken);
  if (!user) {
    return { success: false, status: 401, error: "Unauthorized: Invalid or expired government session" };
  }

  // Derive employee identity from server-side session
  const employee = await getEmployeeBySession(sessionToken);
  if (!employee) {
    return {
      success: false,
      status: 403,
      error: "Forbidden: No authorized employee profile bound to this account",
    };
  }

  if (!employee.is_active) {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Employee account is suspended or inactive",
    };
  }

  const validRoles = ["DEPARTMENT_OFFICER", "DEPARTMENT_ADMIN", "SYSTEM_ADMIN"];
  if (!validRoles.includes(employee.role)) {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Insufficient role privileges for statutory government operations",
    };
  }

  return { success: true, user, employee };
}

export async function validateGovRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<GovSessionResult> {
  const auth = await validateGovSession(request);
  if (!auth.success) return auth;

  if (!allowedRoles.includes(auth.employee.role)) {
    return {
      success: false,
      status: 403,
      error: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(", ")}`,
    };
  }

  return auth;
}

export function unauthorizedResponse(error: string = "Unauthorized") {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export function forbiddenResponse(error: string = "Forbidden") {
  return NextResponse.json({ success: false, error }, { status: 403 });
}
