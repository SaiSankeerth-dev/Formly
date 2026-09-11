import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "START_AGENT") {
      if (!body.payload?.portalUrl || !/^https:\/\//i.test(body.payload.portalUrl)) {
        return NextResponse.json(
          { success: false, error: "A verified HTTPS official portal URL is required." },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        mode: "BROWSER_EXTENSION_HANDOFF",
        sessionId: `browser_${crypto.randomUUID()}`,
        state: "WAITING_FOR_CITIZEN_LOGIN",
        message: "Open the official portal and use the Seva Saarthi extension after signing in there yourself.",
        controls: ["LOGIN", "OTP", "CAPTCHA", "PAYMENT", "DECLARATION", "FINAL_SUBMIT"],
      });
    }

    if (body.action === "CONFIRM_SUBMIT") {
      return NextResponse.json(
        {
          success: false,
          state: "WAITING_FOR_CITIZEN",
          error: "The backend never submits an application or creates an acknowledgement number. Use the real Submit button on the official portal.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, error: "Unknown agent action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Invalid agent request" },
      { status: 400 }
    );
  }
}
