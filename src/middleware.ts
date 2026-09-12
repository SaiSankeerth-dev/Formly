import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const forwardedHost = request.headers.get("x-forwarded-host") || "";
  const forwardedPort = request.headers.get("x-forwarded-port") || "";
  const port = request.nextUrl.port || (host.includes(":") ? host.split(":")[1] : "");

  // Detect platform by port or environment variable:
  // Port 3001 is Government Platform.
  // Port 3000 (or default) is Citizen Platform.
  const isGovPlatform =
    port === "3001" ||
    host.endsWith(":3001") ||
    forwardedPort === "3001" ||
    forwardedHost.endsWith(":3001") ||
    process.env.NEXT_PUBLIC_APP_PLATFORM === "government" ||
    process.env.PLATFORM === "government";

  // Skip static assets, Next internal files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/agent") ||
    pathname.includes(".") // static files like favicon.ico, images, fonts
  ) {
    return NextResponse.next();
  }

  // Retrieve session tokens
  const govSession =
    request.cookies.get("FORMLY_GOV_SESSION")?.value ||
    request.cookies.get("formly_gov_session")?.value;

  // =============================================================
  // PLATFORM A: GOVERNMENT PLATFORM (PORT 3001)
  // =============================================================
  if (isGovPlatform) {
    // 1. Block access to Citizen-only API routes on Government platform
    if (
      pathname.startsWith("/api/citizen") ||
      pathname.startsWith("/api/documents") ||
      pathname.startsWith("/api/profile") ||
      pathname.startsWith("/api/requirements") ||
      pathname.startsWith("/api/services") ||
      pathname.startsWith("/api/track")
    ) {
      return NextResponse.json(
        { error: "Platform Isolation Violation: Citizen APIs are restricted to Citizen Platform (port 3000)." },
        { status: 403 }
      );
    }

    // 2. Block access to Citizen-only pages on Government platform
    const citizenOnlyPages = [
      "/documents",
      "/profile",
      "/tasks",
      "/notifications",
      "/help",
      "/checklist",
      "/vault",
      "/services",
      "/discover",
      "/signup",
      "/portal",
      "/track",
      "/assistant",
    ];
    const isCitizenAppStatus = pathname.startsWith("/applications/") && pathname.includes("/status");
    if (citizenOnlyPages.some((p) => pathname === p || pathname.startsWith(p + "/")) || isCitizenAppStatus) {
      return new NextResponse(
        `<!DOCTYPE html><html><head><title>Platform Isolation - Seva Saarthi</title><style>body{font-family:system-ui,sans-serif;background:#0A1128;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#131d3d;border:1px solid #1e2d5a;border-radius:20px;padding:36px;max-width:520px;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.5);}.badge{background:#e11d48;color:white;padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}.link{display:inline-block;margin-top:20px;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;}</style></head><body><div class="card"><span class="badge">Platform Origin Isolation (Port 3001)</span><h2 style="margin-top:16px;color:#fff;">Government Platform Boundary</h2><p style="color:#94a3b8;font-size:14px;line-height:1.6;">Citizen services (Vault, Profile, Documents, Tasks, Application Status, Schemes) are isolated to the Citizen Platform on <strong>http://localhost:3000</strong> and cannot run inside the Government operations boundary.</p><a class="link" href="http://localhost:3000${pathname}">Open on Citizen Platform (Port 3000) &rarr;</a></div></body></html>`,
        { status: 403, headers: { "content-type": "text/html" } }
      );
    }

    // 3. Government Authentication Guard
    const isGovLogin = pathname === "/login" || pathname === "/government/login" || pathname === "/gov/login";
    const isSharedApi = pathname.startsWith("/api/");

    if (!isGovLogin && !isSharedApi && !govSession) {
      const loginUrl = new URL("/login", request.url);
      if (host) loginUrl.host = host;
      return NextResponse.redirect(loginUrl);
    }

    // 4. Clean Government URL Rewriting on Port 3001:
    // (Translates clean URLs to /government/* behind the scenes)
    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.rewrite(new URL("/government/dashboard", request.url));
    }
    if (pathname === "/applications") {
      return NextResponse.rewrite(new URL("/government/applications", request.url));
    }
    const appMatch = pathname.match(/^\/applications\/([A-Za-z0-9_-]+)$/);
    if (appMatch) {
      return NextResponse.rewrite(new URL(`/government/applications/${appMatch[1]}`, request.url));
    }
    if (pathname === "/my-queue") {
      return NextResponse.rewrite(new URL("/government/my-queue", request.url));
    }
    if (pathname === "/exceptions") {
      return NextResponse.rewrite(new URL("/government/exceptions", request.url));
    }
    if (pathname === "/interoperability") {
      return NextResponse.rewrite(new URL("/government/interoperability", request.url));
    }
    if (pathname === "/data-mapper") {
      return NextResponse.rewrite(new URL("/government/data-mapper", request.url));
    }
    if (pathname === "/workflows") {
      return NextResponse.rewrite(new URL("/government/workflows", request.url));
    }
    if (pathname === "/audit") {
      return NextResponse.rewrite(new URL("/government/audit", request.url));
    }
    if (pathname === "/monitoring") {
      return NextResponse.rewrite(new URL("/government/monitoring", request.url));
    }
    if (pathname === "/settings") {
      return NextResponse.rewrite(new URL("/government/settings", request.url));
    }

    // Legacy /gov/* paths redirect to clean paths on port 3001
    if (pathname.startsWith("/gov/workspace/")) {
      const id = pathname.replace("/gov/workspace/", "");
      return NextResponse.redirect(new URL(`/applications/${id}`, request.url));
    }
    if (pathname === "/gov/queue") {
      return NextResponse.redirect(new URL("/applications", request.url));
    }
    if (pathname === "/gov/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname === "/gov") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/gov/")) {
      const cleanSub = pathname.replace("/gov/", "/");
      return NextResponse.redirect(new URL(cleanSub, request.url));
    }

    return NextResponse.next();
  }

  // =============================================================
  // PLATFORM B: CITIZEN PLATFORM (PORT 3000 / DEFAULT)
  // =============================================================
  // Clean government operations rewriting for convenience if accessed directly on port 3000
  if (pathname === "/my-queue") {
    return NextResponse.rewrite(new URL("/gov/queue?tab=my_assignments", request.url));
  }
  if (
    pathname === "/exceptions" ||
    pathname === "/interoperability" ||
    pathname === "/data-mapper" ||
    pathname === "/workflows" ||
    pathname === "/audit" ||
    pathname === "/monitoring"
  ) {
    return NextResponse.rewrite(new URL(`/gov${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
