import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(request: Request) {
  try {
    let portalUrl = "https://scholarships.gov.in";
    try {
      const body = await request.json();
      if (body.portalUrl) portalUrl = body.portalUrl;
    } catch {
      // default URL
    }

    const scriptPath = path.resolve(process.cwd(), "scripts", "run-live-agent.mjs");

    console.log(`[Seva Saarthi Server] Launching Playwright Desktop Agent on: ${portalUrl}`);

    // Spawn detached Node process running the Playwright script
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        TARGET_URL: portalUrl,
      },
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: `Launched Google Chrome on ${portalUrl}. The browser window is now visible on your desktop.`,
      targetUrl: portalUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to launch browser" }, { status: 500 });
  }
}
