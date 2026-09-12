import { NextResponse } from "next/server";
import { loginUser, getEmployeeBySession } from "@/lib/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = true } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const { user, token } = await loginUser(email, password);

    // Reject government officers attempting to log in on citizen portal
    const employee = await getEmployeeBySession(token);
    const isGovRole =
      Boolean(employee && employee.is_active) ||
      user.role === "DEPARTMENT_OFFICER" ||
      user.role === "DEPARTMENT_ADMIN" ||
      user.role === "SYSTEM_ADMIN" ||
      user.role === "OFFICER" ||
      (typeof user.role === "string" && (
        user.role.toLowerCase().includes("officer") ||
        user.role.toLowerCase().includes("department")
      ));

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

    const cookieConfig: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };

    if (rememberMe !== false) {
      cookieConfig.maxAge = 30 * 24 * 60 * 60; // 30 days
    }

    response.cookies.set({
      name: "FORMLY_CITIZEN_SESSION",
      value: token,
      ...cookieConfig,
    });

    response.cookies.set({
      name: "seva_saarthi_session",
      value: token,
      ...cookieConfig,
    });

    response.cookies.delete("FORMLY_GOV_SESSION");
    response.cookies.delete("formly_gov_session");

    return response;
  } catch (err: any) {
    if (err?.isGovernment) {
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
    return NextResponse.json({ success: false, error: "Email or password is incorrect." }, { status: 401 });
  }
}
