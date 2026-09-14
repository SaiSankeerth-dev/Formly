import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
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

  const isCitizenPlatform =
    !isGovPlatform &&
    (port === "3000" ||
      host.endsWith(":3000") ||
      forwardedPort === "3000" ||
      forwardedHost.endsWith(":3000"));

  // 1. Skip static assets, Next internal files, auth callback, public media, and health check
  if (
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.includes(".") // static files: favicon.ico, images, svgs, etc.
  ) {
    return NextResponse.next();
  }

  // 1b. If an OAuth code arrives at any non-callback URL (e.g. root '/' due to Site URL fallback), forward directly to /auth/callback
  if (pathname !== "/auth/callback" && request.nextUrl.searchParams.has("code")) {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.search = request.nextUrl.search;
    return NextResponse.redirect(callbackUrl);
  }

  // 2. Retrieve isolated session cookies
  const govSession =
    request.cookies.get("FORMLY_GOV_SESSION")?.value ||
    request.cookies.get("formly_gov_session")?.value;

  const citizenSession =
    request.cookies.get("FORMLY_CITIZEN_SESSION")?.value ||
    request.cookies.get("formly_citizen_session")?.value ||
    request.cookies.get("seva_saarthi_session")?.value;

  // =============================================================
  // PORT ISOLATION: GOVERNMENT PLATFORM (PORT 3001)
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

    // 2. Canonical redirects for Government platform entry points
    if (pathname === "/login" || pathname === "/signup") {
      return NextResponse.redirect(new URL("/gov/login", request.url));
    }
    if (pathname === "/dashboard" || pathname === "/") {
      return NextResponse.redirect(new URL("/gov/dashboard", request.url));
    }
    if (pathname === "/applications") {
      return NextResponse.redirect(new URL("/gov/applications", request.url));
    }
    if (pathname === "/settings" || pathname.startsWith("/settings/")) {
      return NextResponse.redirect(new URL("/gov/settings", request.url));
    }

    // 3. Block access to Citizen-only pages on Government platform
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
      "/support",
      "/privacy",
      "/terms",
    ];
    const isCitizenAppStatus = pathname.startsWith("/applications/") && pathname.includes("/status");
    if (citizenOnlyPages.some((p) => pathname === p || pathname.startsWith(p + "/")) || isCitizenAppStatus) {
      return new NextResponse(
        `<!DOCTYPE html><html><head><title>Platform Isolation - FORMly</title><style>body{font-family:system-ui,sans-serif;background:#0A1128;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#131d3d;border:1px solid #1e2d5a;border-radius:20px;padding:36px;max-width:520px;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.5);}.badge{background:#e11d48;color:white;padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}.link{display:inline-block;margin-top:20px;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;}</style></head><body><div class="card"><span class="badge">Platform Origin Isolation (Port 3001)</span><h2 style="margin-top:16px;color:#fff;">Government Platform Boundary</h2><p style="color:#94a3b8;font-size:14px;line-height:1.6;">Citizen services (Vault, Profile, Documents, Tasks, Application Status, Schemes) are isolated to the Citizen Platform on <strong>http://localhost:3000</strong> and cannot run inside the Government operations boundary.</p><a class="link" href="http://localhost:3000${pathname}">Open on Citizen Platform (Port 3000) &rarr;</a></div></body></html>`,
        { status: 403, headers: { "content-type": "text/html" } }
      );
    }
  }

  // =============================================================
  // PORT ISOLATION: CITIZEN PLATFORM (PORT 3000)
  // =============================================================
  if (isCitizenPlatform) {
    if (pathname.startsWith("/api/gov") && !pathname.startsWith("/api/gov/auth")) {
      return NextResponse.json(
        { error: "Platform Isolation Violation: Government APIs are isolated to Government Platform (port 3001)." },
        { status: 403 }
      );
    }

    const isGovRouteOnCitizen =
      pathname.startsWith("/government") ||
      pathname.startsWith("/gov") ||
      pathname === "/my-queue" ||
      pathname.startsWith("/my-queue/") ||
      pathname === "/exceptions" ||
      pathname.startsWith("/exceptions/") ||
      pathname === "/interoperability" ||
      pathname.startsWith("/interoperability/") ||
      pathname === "/data-mapper" ||
      pathname.startsWith("/data-mapper/") ||
      pathname === "/workflows" ||
      pathname.startsWith("/workflows/") ||
      pathname === "/audit" ||
      pathname.startsWith("/audit/") ||
      pathname === "/monitoring" ||
      pathname.startsWith("/monitoring/");

    if (isGovRouteOnCitizen) {
      return new NextResponse(
        `<!DOCTYPE html><html><head><title>Platform Isolation - FORMly</title><style>body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:white;border:1px solid #e2e8f0;border-radius:20px;padding:36px;max-width:520px;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.06);}.badge{background:#2563eb;color:white;padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}.link{display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:white;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;}</style></head><body><div class="card"><span class="badge">Platform Origin Isolation (Port 3000)</span><h2 style="margin-top:16px;">Citizen Platform Boundary</h2><p style="color:#64748b;font-size:14px;line-height:1.6;">Government Operations (Officer Queues, Exception Center, Data Mapper, Interoperability, Audit Logs, Settings) are strictly isolated to the Government Platform on <strong>http://localhost:3001</strong>.</p><a class="link" href="http://localhost:3001/dashboard">Open on Government Platform (Port 3001) &rarr;</a></div></body></html>`,
        { status: 403, headers: { "content-type": "text/html" } }
      );
    }
  }

  // 3. Normalize Government Clean URLs & Aliases
  if (pathname === "/vault" || pathname.startsWith("/vault/")) {
    return NextResponse.redirect(new URL("/documents", request.url));
  }
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

  // Translate legacy /government/* paths to /gov/*
  if (pathname === "/government/login") {
    return NextResponse.redirect(new URL("/gov/login", request.url));
  }
  if (pathname === "/government" || pathname === "/government/dashboard") {
    return NextResponse.redirect(new URL("/gov/dashboard", request.url));
  }
  if (pathname.startsWith("/government/applications/")) {
    const id = pathname.replace("/government/applications/", "");
    return NextResponse.redirect(new URL(`/gov/workspace/${id}`, request.url));
  }
  if (pathname === "/government/applications") {
    return NextResponse.redirect(new URL("/gov/queue", request.url));
  }
  if (pathname.startsWith("/government/")) {
    const sub = pathname.replace("/government/", "/gov/");
    return NextResponse.redirect(new URL(sub, request.url));
  }

  // Redirect /gov root to /gov/dashboard
  if (pathname === "/gov") {
    return NextResponse.redirect(new URL("/gov/dashboard", request.url));
  }

  // =============================================================
  // BOUNDARY 1: GOVERNMENT PLATFORM (/gov/*)
  // =============================================================
  const isGovPath = pathname.startsWith("/gov");
  if (isGovPath) {
    const isGovLogin = pathname === "/gov/login";
    const isGovPublicApi = pathname.startsWith("/api/gov/auth");

    // If on government login page:
    if (isGovLogin) {
      if (govSession) {
        return NextResponse.redirect(new URL("/gov/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (isGovPublicApi) {
      return NextResponse.next();
    }

    // Protected Government Routes: require valid govSession
    // Notice: A citizen session does NOT grant access to government routes
    if (!govSession) {
      const loginUrl = new URL("/gov/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // =============================================================
  // BOUNDARY 2: CITIZEN PLATFORM (Supabase SSR Single Source of Truth)
  // =============================================================
  const { supabaseResponse, user: citizenUser } = await updateSession(request);

  // Authenticated if Supabase user is returned or legacy citizen session exists
  const isCitizenAuthenticated = Boolean(citizenUser || citizenSession);

  // 1. If citizen is already authenticated and visits /login or /signup, redirect to /dashboard
  if (isCitizenAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value, { ...c, path: "/" });
    });
    return redirectRes;
  }

  // 2. Allow unauthenticated access to citizen public auth pages
  if (pathname === "/login" || pathname === "/signup") {
    return supabaseResponse;
  }

  // 3. Protected citizen routes require authentication
  const protectedCitizenRoutes = [
    "/dashboard",
    "/profile",
    "/documents",
    "/tasks",
    "/notifications",
    "/checklist",
    "/onboarding",
    "/applications",
    "/settings",
  ];

  const isProtectedCitizenRoute =
    pathname === "/" ||
    protectedCitizenRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));

  if (!isCitizenAuthenticated && isProtectedCitizenRoute) {
    const loginUrl = new URL("/login", request.url);
    const redirectRes = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value, { ...c, path: "/" });
    });
    return redirectRes;
  }

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
