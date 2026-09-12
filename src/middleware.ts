import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, Next internal files, public media, and health check
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/agent") ||
    pathname.startsWith("/api/health") ||
    pathname.includes(".") // static files: favicon.ico, images, svgs, etc.
  ) {
    return NextResponse.next();
  }

  // 2. Retrieve isolated session cookies
  const govSession =
    request.cookies.get("FORMLY_GOV_SESSION")?.value ||
    request.cookies.get("formly_gov_session")?.value;

  const citizenSession =
    request.cookies.get("FORMLY_CITIZEN_SESSION")?.value ||
    request.cookies.get("formly_citizen_session")?.value ||
    request.cookies.get("seva_saarthi_session")?.value;

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
  // BOUNDARY 2: CITIZEN PLATFORM
  // =============================================================
  const isCitizenLogin = pathname === "/login" || pathname === "/signup";
  if (isCitizenLogin) {
    // If already authenticated as citizen, go to citizen dashboard
    // Notice: Having a govSession does NOT redirect to citizen dashboard!
    if (citizenSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protected citizen routes
  const protectedCitizenPrefixes = [
    "/dashboard",
    "/documents",
    "/profile",
    "/onboarding",
    "/vault",
    "/tasks",
    "/checklist",
    "/assistant",
    "/settings",
  ];

  const isProtectedCitizenRoute =
    protectedCitizenPrefixes.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    ) ||
    (pathname.startsWith("/applications") && !pathname.includes("/status") && !pathname.startsWith("/applications/track"));

  if (isProtectedCitizenRoute) {
    // Protected Citizen Routes: require valid citizenSession
    // Notice: A government session does NOT grant access to citizen dashboard
    if (!citizenSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
