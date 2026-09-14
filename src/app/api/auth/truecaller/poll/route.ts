import { NextResponse } from "next/server";
import {
  createPendingRequest,
  getVerification,
  consumeVerification,
} from "@/lib/auth/truecaller-store";

/**
 * GET /api/auth/truecaller/poll?requestId=...
 * 
 * Polling endpoint for mobile web and desktop browsers waiting for
 * Truecaller consent verification. Once verified, returns user data and
 * sets authoritative session cookies on the response.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { status: "invalid", error: "Missing requestId parameter" },
        { status: 400 }
      );
    }

    const record = getVerification(requestId);

    if (!record) {
      return NextResponse.json(
        { status: "expired", error: "Verification request not found or expired" },
        { status: 200 }
      );
    }

    if (record.status === "pending") {
      return NextResponse.json({ status: "pending" }, { status: 200 });
    }

    if (record.status === "failed") {
      return NextResponse.json(
        { status: "failed", error: record.error || "Verification rejected by user or server" },
        { status: 200 }
      );
    }

    if (record.status === "consumed") {
      return NextResponse.json(
        { status: "consumed", message: "Verification has already been processed" },
        { status: 200 }
      );
    }

    if (record.status === "verified" && record.data) {
      // Atomically consume to prevent replay
      const consumed = consumeVerification(requestId);
      const data = consumed?.data || record.data;

      const isSecure = process.env.NODE_ENV === "production";
      const response = NextResponse.json({
        status: "verified",
        user: data.user,
        token: data.token,
        redirectTo: data.redirectTo || "/dashboard",
      });

      // Set authoritative HTTP-only session cookies
      response.cookies.set({
        name: "FORMLY_CITIZEN_SESSION",
        value: data.token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });

      response.cookies.set({
        name: "seva_saarthi_session",
        value: data.token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });

      // Clear any government session cookies
      response.cookies.delete("FORMLY_GOV_SESSION");
      response.cookies.delete("formly_gov_session");

      return response;
    }

    return NextResponse.json({ status: "unknown" }, { status: 200 });
  } catch (err: any) {
    console.error("[TRUECALLER_POLL] Error polling status:", err);
    return NextResponse.json(
      { status: "error", error: err?.message || "Internal polling error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/truecaller/poll
 * 
 * Register a new pending requestId nonce before opening Truecaller deep link or QR code
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { requestId, meta } = body;

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid requestId" },
        { status: 400 }
      );
    }

    const record = createPendingRequest(requestId, meta);

    return NextResponse.json({
      success: true,
      requestId: record.requestId,
      expiresAt: record.expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to register request" },
      { status: 500 }
    );
  }
}
