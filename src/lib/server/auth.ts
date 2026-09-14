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
    } catch {
      // Ignore Next.js headers failure in non-SSR context
    }

    if (!cookieStore && request) {
      if ("cookies" in request && typeof (request as any).cookies?.getAll === "function") {
        cookieStore = (request as any).cookies;
      } else {
        const headers = (request as any).headers;
        const cookieHeader = headers && typeof headers.get === "function" ? headers.get("cookie") : "";
        if (cookieHeader) {
          const parsed = cookieHeader.split(";").map((pair: string) => {
            const idx = pair.indexOf("=");
            if (idx === -1) return null;
            return {
              name: pair.slice(0, idx).trim(),
              value: decodeURIComponent(pair.slice(idx + 1).trim()),
            };
          }).filter(Boolean);
          cookieStore = {
            getAll: () => parsed,
            get: (name: string) => parsed.find((c: any) => c.name === name),
            set: () => {},
          };
        }
      }
    }

    const supabase = await createClient(cookieStore);
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (authUser && !error) {
      let profileName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || "";
      let profilePhone = authUser.user_metadata?.phone || authUser.phone || "";
      let profileAvatar = authUser.user_metadata?.avatar_url || "";
      let isPhoneVerified = Boolean(authUser.phone_confirmed_at);

      let isProfileCompleted = false;
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
          if (profile.phone_verified) isPhoneVerified = true;
          if (profile.profile_completed) isProfileCompleted = true;
        }
      } catch {}

      try {
        const dbProfiles = await pgQuery<any>(
          `SELECT full_name, phone, phone_verified, profile_completed FROM profiles WHERE id = $1 OR user_id = $1`,
          [authUser.id]
        ).catch(() => []);
        if (dbProfiles[0]?.full_name) profileName = dbProfiles[0].full_name;
        if (dbProfiles[0]?.phone_verified) isPhoneVerified = true;
        if (dbProfiles[0]?.phone && !profilePhone) profilePhone = dbProfiles[0].phone;
        if (dbProfiles[0]?.profile_completed) isProfileCompleted = true;
      } catch {}

      const citizenUser: Omit<UserRecord, "passwordHash" | "salt"> & { profileCompleted?: boolean; profile_completed?: boolean } = {
        id: authUser.id,
        name: profileName || authUser.email?.split("@")[0] || "Citizen",
        email: authUser.email || "",
        phone: profilePhone,
        phoneVerified: isPhoneVerified,
        role: "Applicant / Citizen",
        createdAt: authUser.created_at || new Date().toISOString(),
        authProvider: authUser.app_metadata?.provider || "supabase",
        avatar: profileAvatar,
        profileCompleted: isProfileCompleted,
        profile_completed: isProfileCompleted,
      };

      // Ensure user record exists in PostgreSQL to satisfy relational foreign keys
      try {
        if (citizenUser.email && citizenUser.email.trim().length > 0) {
          const existingByEmail = await pgQuery<any>(
            `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
            [citizenUser.email, citizenUser.id]
          );
          if (existingByEmail.length > 0) {
            const oldId = existingByEmail[0].id;
            await pgQuery(`UPDATE applications SET user_id = $1, citizen_user_id = $1 WHERE user_id = $2 OR citizen_user_id = $2`, [citizenUser.id, oldId]).catch(() => {});
            await pgQuery(`UPDATE documents SET user_id = $1 WHERE user_id = $2`, [citizenUser.id, oldId]).catch(() => {});
            await pgQuery(`UPDATE profile_fields SET user_id = $1 WHERE user_id = $2`, [citizenUser.id, oldId]).catch(() => {});
            await pgQuery(`UPDATE addresses SET user_id = $1 WHERE user_id = $2`, [citizenUser.id, oldId]).catch(() => {});
            await pgQuery(`UPDATE sessions SET "userId" = $1 WHERE "userId" = $2`, [citizenUser.id, oldId]).catch(() => {});
            await pgQuery(`UPDATE notifications SET recipient_id = $1 WHERE recipient_id = $2`, [citizenUser.id, oldId]).catch(() => {});
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
              [citizenUser.id, oldId]
            ).catch(() => {});
            await pgQuery(`DELETE FROM profiles WHERE (id = $2 OR user_id = $2) AND id != $1 AND user_id != $1`, [citizenUser.id, oldId]).catch(() => {});
            await pgQuery(`UPDATE profiles SET id = $1, user_id = $1 WHERE id = $2 OR user_id = $2`, [citizenUser.id, oldId]).catch(() => {});
            await pgQuery(
              `UPDATE users SET
                 id = $1,
                 name = COALESCE(NULLIF($2, ''), name),
                 phone = COALESCE(NULLIF($3, ''), phone),
                 "updatedAt" = NOW()
               WHERE id = $4`,
              [citizenUser.id, citizenUser.name, citizenUser.phone, oldId]
            ).catch(() => {});
          } else {
            await pgQuery(
              `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role, "createdAt")
               VALUES ($1, $2, $3, $4, 'supabase_auth', 'supabase_auth', 'Applicant / Citizen', $5)
               ON CONFLICT (id) DO UPDATE SET 
                 name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
                 email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
                 phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone)`,
              [citizenUser.id, citizenUser.name, citizenUser.email, citizenUser.phone, citizenUser.createdAt]
            ).catch(() => {});
          }
        } else {
          // Phone-only citizen: create deterministic unique email identifier for users table
          const phoneIdentifier = citizenUser.phone
            ? `${citizenUser.phone.replace(/[^0-9]/g, "")}@phone.sevasaarthi.gov.in`
            : `${citizenUser.id}@phone.sevasaarthi.gov.in`;
          await pgQuery(
            `INSERT INTO users (id, name, email, phone, "passwordHash", salt, role, "createdAt")
             VALUES ($1, $2, $3, $4, 'supabase_auth', 'supabase_auth', 'Applicant / Citizen', $5)
             ON CONFLICT (id) DO UPDATE SET 
               name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
               phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone)`,
            [citizenUser.id, citizenUser.name, phoneIdentifier, citizenUser.phone, citizenUser.createdAt]
          ).catch(() => {});
        }
        await pgQuery(
          `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [citizenUser.id, citizenUser.email || `${citizenUser.id}@phone.sevasaarthi.gov.in`]
        ).catch(() => {});
      } catch {}

      return citizenUser;
    }
  } catch (supabaseErr) {
    // Non-fatal, fallback to verified session token
  }

  // 2. Secondary: Authenticate verified stateless session token (signed via SESSION_SECRET)
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

  const validRoles = ["DEPARTMENT_OFFICER", "DEPARTMENT_ADMIN", "SYSTEM_ADMIN", "OFFICER"];
  if (!validRoles.includes(employee.role as string)) {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Insufficient role privileges for statutory government operations",
    };
  }

  const normalizedRole = ((employee.role as string) === "OFFICER" ? "DEPARTMENT_OFFICER" : employee.role) as "DEPARTMENT_OFFICER" | "DEPARTMENT_ADMIN" | "SYSTEM_ADMIN";
  return { success: true, user, employee: { ...employee, role: normalizedRole } };
}

export async function validateGovRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<GovSessionResult> {
  const auth = await validateGovSession(request);
  if (!auth.success) return auth;

  const effectiveRole = (auth.employee.role as string) === "OFFICER" ? "DEPARTMENT_OFFICER" : auth.employee.role;
  const normalizedAllowed = allowedRoles.flatMap((r) =>
    r === "DEPARTMENT_OFFICER" ? ["DEPARTMENT_OFFICER", "OFFICER"] : [r]
  );

  if (!normalizedAllowed.includes(auth.employee.role) && !allowedRoles.includes(effectiveRole)) {
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
