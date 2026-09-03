import { NextResponse } from "next/server";
import { loginUser } from "@/lib/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const { user, token } = loginUser(email, password);

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user,
      token,
    });

    response.cookies.set({
      name: "seva_saarthi_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Invalid credentials" }, { status: 401 });
  }
}
