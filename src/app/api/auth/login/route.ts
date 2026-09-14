import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAuthoritativeDb } from "@/lib/server/pg-db";
import { loginUser, getEmployeeBySession, signSessionToken } from "@/lib/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = true } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Isolation check: reject government officers attempting to log in on citizen portal
    try {
      const db = await getAuthoritativeDb();
      const empRes = await db.query(
        `SELECT e.* FROM employees e 
         JOIN auth.users u ON e.auth_user_id = u.id 
         WHERE LOWER(u.email) = $1 AND e.is_active = true LIMIT 1`,
        [trimmedEmail]
      );
      if (empRes.rows && empRes.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "This account belongs to the government portal.",
            isGovernment: true,
            redirectTo: "/gov/login",
          },
          { status: 403 }
        );
      }
    } catch {
      // Non-fatal check
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const rawProto = request.headers.get("x-forwarded-proto");
    const isSecure = rawProto === "https" || process.env.NODE_ENV === "production" || (!host.includes("localhost") && !host.includes("127.0.0.1"));

    // 2. Primary Citizen Authentication: Supabase Auth single source of truth
    const cookieStore = await cookies();
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];
    let authUser: any = null;
    let authError: any = null;

    try {
      const supabase = await createClient({
        cookieStore,
        onSetCookies: (incoming) => {
          cookiesToSet.push(...incoming);
        },
      });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (data?.user && !error) {
        authUser = data.user;
      } else {
        authError = error;
      }
    } catch (err: any) {
      authError = err;
    }

    if (authUser) {
      const userPayload = {
        id: authUser.id,
        email: authUser.email || trimmedEmail,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || trimmedEmail.split("@")[0],
        phone: authUser.user_metadata?.phone || authUser.phone || "",
        role: "Applicant / Citizen",
      };

      const token = signSessionToken({
        userId: authUser.id,
        name: userPayload.name,
        email: userPayload.email,
        phone: userPayload.phone,
        role: "Applicant / Citizen",
      });

      const response = NextResponse.json({
        success: true,
        message: "Login successful",
        user: userPayload,
        token,
      });

      // Forward all Supabase session cookies with root path
      for (const c of cookiesToSet) {
        response.cookies.set(c.name, c.value, {
          ...c.options,
          path: "/",
          sameSite: "lax",
          secure: isSecure,
        });
      }

      // Set fallback citizen session cookie with root path
      response.cookies.set({
        name: "FORMLY_CITIZEN_SESSION",
        value: token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : undefined,
      });
      response.cookies.set({
        name: "seva_saarthi_session",
        value: token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : undefined,
      });

      // Clear any conflicting government session cookies
      response.cookies.set({ name: "FORMLY_GOV_SESSION", value: "", maxAge: 0, path: "/" });
      response.cookies.set({ name: "formly_gov_session", value: "", maxAge: 0, path: "/" });

      return response;
    }

    // 3. Fallback for pre-existing local database accounts
    try {
      const { user, token } = await loginUser(trimmedEmail, password);
      const isGovRole =
        user.role === "DEPARTMENT_OFFICER" ||
        user.role === "DEPARTMENT_ADMIN" ||
        user.role === "SYSTEM_ADMIN" ||
        user.role === "OFFICER";

      if (isGovRole) {
        return NextResponse.json(
          {
            success: false,
            error: "This account belongs to the government portal.",
            isGovernment: true,
            redirectTo: "/gov/login",
          },
          { status: 403 }
        );
      }

      const response = NextResponse.json({
        success: true,
        message: "Login successful",
        user,
        token,
      });

      response.cookies.set({
        name: "FORMLY_CITIZEN_SESSION",
        value: token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : undefined,
      });
      response.cookies.set({
        name: "seva_saarthi_session",
        value: token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : undefined,
      });

      response.cookies.set({ name: "FORMLY_GOV_SESSION", value: "", maxAge: 0, path: "/" });
      response.cookies.set({ name: "formly_gov_session", value: "", maxAge: 0, path: "/" });

      return response;
    } catch {}

    // Return the real error message from Supabase Auth or standard error
    const rawError = authError?.message;
    const errorMessage =
      rawError === "fetch failed" || !rawError
        ? "Email or password is incorrect."
        : rawError;
    return NextResponse.json({ success: false, error: errorMessage }, { status: 401 });
  } catch (err: any) {
    const rawError = err?.message;
    const errorMessage =
      rawError === "fetch failed" || !rawError
        ? "Unable to complete authentication. Please check your connection and try again."
        : rawError;
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
