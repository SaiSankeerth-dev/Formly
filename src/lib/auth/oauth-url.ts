/**
 * OAuth Redirect URL Resolution Architecture
 * 
 * Provides deterministic, environment-correct redirect URL resolution for
 * Supabase Google OAuth and email confirmations:
 * 
 * 1. LOCAL DEVELOPMENT:
 *    http://localhost:<ACTUAL_PORT>/auth/callback
 *    - Derived dynamically from active browser origin in client components.
 *    - Never overridden by NEXT_PUBLIC_VERCEL_URL or remote preview domains.
 * 
 * 2. VERCEL PREVIEW ENVIRONMENT:
 *    https://<preview-domain>/auth/callback
 *    - Active only when running on a Vercel preview deployment.
 * 
 * 3. PRODUCTION ENVIRONMENT:
 *    https://<production-domain>/auth/callback
 *    - Derived from configured canonical production URL or production origin.
 */

export type EnvironmentType = "local" | "preview" | "production";

export interface ResolveOAuthUrlOptions {
  origin?: string;
  env?: Record<string, string | undefined>;
  path?: string;
}

/**
 * Identifies the current environment type with strict priority:
 * Localhost origin ALWAYS wins over any ambient preview environment variables.
 */
export function getEnvironmentType(options?: ResolveOAuthUrlOptions): EnvironmentType {
  const env = options?.env || process.env;

  // 1. Inspect origin hostname from option or window
  let hostname = "";
  if (options?.origin) {
    try {
      hostname = new URL(options.origin).hostname.toLowerCase();
    } catch {
      // Ignore URL parse error
    }
  } else if (typeof window !== "undefined" && window.location?.hostname) {
    hostname = window.location.hostname.toLowerCase();
  }

  if (hostname) {
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local")
    ) {
      return "local";
    }

    if (hostname.endsWith(".vercel.app")) {
      return "preview";
    }

    return "production";
  }

  // 2. Server-side / SSR evaluation without browser window
  if (env.VERCEL_ENV === "preview") {
    return "preview";
  }

  if (env.VERCEL_ENV === "production" || (env.NODE_ENV === "production" && !env.NEXT_PUBLIC_APP_URL?.includes("localhost"))) {
    return "production";
  }

  return "local";
}

/**
 * Returns the environment-correct OAuth callback URL.
 * Guaranteed to end with the specified callback path (default: /auth/callback).
 */
export function getOAuthRedirectUrl(options?: ResolveOAuthUrlOptions): string {
  const env = options?.env || process.env;
  const rawPath = options?.path || "/auth/callback";
  const callbackPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  // ---------------------------------------------------------------------------
  // 1. BROWSER RUNTIME (Client Components)
  // ---------------------------------------------------------------------------
  if (typeof window !== "undefined" && window.location?.origin) {
    const browserOrigin = options?.origin || window.location.origin;
    const hostname = window.location.hostname.toLowerCase();

    // LOCALHOST DEVELOPMENT:
    // Strictly bind to the current browser origin (port-aware: 3000, 3001, etc.)
    // NEVER fall back to NEXT_PUBLIC_VERCEL_URL or remote domains when on localhost!
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local")
    ) {
      return `${browserOrigin.replace(/\/+$/, "")}${callbackPath}`;
    }

    // VERCEL PREVIEW:
    if (hostname.endsWith(".vercel.app")) {
      return `${browserOrigin.replace(/\/+$/, "")}${callbackPath}`;
    }

    // PRODUCTION / CUSTOM DOMAIN:
    return `${browserOrigin.replace(/\/+$/, "")}${callbackPath}`;
  }

  // ---------------------------------------------------------------------------
  // 2. EXPLICIT ORIGIN PASSED IN (e.g. from incoming Request headers on server)
  // ---------------------------------------------------------------------------
  if (options?.origin) {
    try {
      const parsed = new URL(options.origin);
      const host = parsed.hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host === "[::1]" ||
        host.endsWith(".local")
      ) {
        return `${parsed.origin.replace(/\/+$/, "")}${callbackPath}`;
      }
      return `${parsed.origin.replace(/\/+$/, "")}${callbackPath}`;
    } catch {
      // Fall through to server-side resolution
    }
  }

  // ---------------------------------------------------------------------------
  // 3. SERVER-SIDE SSR EVALUATION (Fallback when no browser window or request)
  // ---------------------------------------------------------------------------
  const envType = getEnvironmentType(options);

  if (envType === "local") {
    const localUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${localUrl.replace(/\/+$/, "")}${callbackPath}`;
  }

  if (envType === "preview") {
    const previewHost = env.NEXT_PUBLIC_VERCEL_URL || env.VERCEL_URL;
    if (previewHost) {
      const formatted = previewHost.startsWith("http") ? previewHost : `https://${previewHost}`;
      return `${formatted.replace(/\/+$/, "")}${callbackPath}`;
    }
  }

  // Production
  const prodUrl =
    env.NEXT_PUBLIC_SITE_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    env.PRODUCTION_URL ||
    (env.NEXT_PUBLIC_VERCEL_URL ? `https://${env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000");

  const formattedProd = prodUrl.startsWith("http") ? prodUrl : `https://${prodUrl}`;
  return `${formattedProd.replace(/\/+$/, "")}${callbackPath}`;
}

/**
 * Returns safe debug information without exposing sensitive credentials.
 */
export function getOAuthDebugInfo(options?: ResolveOAuthUrlOptions) {
  const envType = getEnvironmentType(options);
  const redirectTo = getOAuthRedirectUrl(options);

  let actualOrigin = options?.origin || "";
  if (!actualOrigin && typeof window !== "undefined") {
    actualOrigin = window.location.origin;
  }

  return {
    environment: envType,
    actualOrigin: actualOrigin || "unknown (server-side)",
    redirectTo,
    callbackPath: "/auth/callback",
    finalRedirectTarget: "/dashboard",
  };
}
