import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/server/db";
import { cookies } from "next/headers";

async function getAuthenticatedUser(request: Request) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("seva_saarthi_session")?.value ||
    (request.headers.get("Authorization")?.startsWith("Bearer ")
      ? request.headers.get("Authorization")?.substring(7)
      : null);

  if (!token) return null;
  return authenticateSession(token);
}

export async function POST(request: Request) {
  try {
    let portalUrl = "";
    try {
      const body = await request.json();
      if (body.portalUrl) portalUrl = body.portalUrl;
    } catch {
      // A live portal URL must be supplied by the verified service registry.
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!portalUrl || !/^https:\/\//i.test(portalUrl)) {
      return NextResponse.json({ success: false, error: "A verified HTTPS official portal URL is required." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      mode: "BROWSER_EXTENSION_HANDOFF",
      message: "Open the official portal in your browser. Sign in there yourself, then start Seva Saarthi from the extension.",
      targetUrl: portalUrl,
      controls: ["LOGIN", "OTP", "CAPTCHA", "PAYMENT", "DECLARATION", "FINAL_SUBMIT"],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to launch browser" }, { status: 500 });
  }
}
