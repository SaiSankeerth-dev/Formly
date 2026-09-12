import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/server/db";
import { cookies } from "next/headers";

function extractTokenFromRequest(request: Request, cookieStore?: any): string | null {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  if (cookieStore) {
    const token =
      cookieStore.get("FORMLY_CITIZEN_SESSION")?.value ||
      cookieStore.get("formly_citizen_session")?.value ||
      cookieStore.get("seva_saarthi_session")?.value;
    if (token) return token;
  }

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

export async function GET(request: Request) {
  try {
    let cookieStore: any = null;
    try {
      cookieStore = await cookies();
    } catch {}

    const token = extractTokenFromRequest(request, cookieStore);

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await authenticateSession(token);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
