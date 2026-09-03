import { NextResponse } from "next/server";
import { logoutSession } from "@/lib/server/db";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("seva_saarthi_session")?.value;

    if (token) {
      logoutSession(token);
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.delete("seva_saarthi_session");
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
