/**
 * Deterministic Post-Authentication Routing Engine for Seva Saarthi
 * 
 * Rules:
 * 1. No authenticated user -> /login
 * 2. Intended destination preserved (e.g. from=/profile, next=/vault) if safe
 * 3. Authenticated user + incomplete profile -> /onboarding/profile
 * 4. Authenticated user + complete profile -> /dashboard
 */

export interface ResolveDestinationOptions {
  fromParam?: string | null;
  nextParam?: string | null;
  requestedDestination?: string | null;
  isComplete?: boolean;
  profileCompleted?: boolean;
  authenticated?: boolean;
}

export function isSafeInternalRoute(urlPath?: string | null): boolean {
  if (!urlPath || typeof urlPath !== "string") return false;
  const path = urlPath.trim();
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/login") &&
    !path.startsWith("/signup") &&
    !path.startsWith("/gov") &&
    !path.startsWith("/government") &&
    !path.includes("javascript:") &&
    !path.includes("data:")
  );
}

export function resolvePostAuthDestination(
  userOrOptions?:
    | { id?: string; email?: string; role?: string }
    | ResolveDestinationOptions
    | null,
  options?: ResolveDestinationOptions
): string {
  // If first argument is an options object
  if (
    userOrOptions &&
    typeof userOrOptions === "object" &&
    ("authenticated" in userOrOptions ||
      "requestedDestination" in userOrOptions ||
      "profileCompleted" in userOrOptions ||
      "isComplete" in userOrOptions)
  ) {
    const opt = userOrOptions as ResolveDestinationOptions;
    if (opt.authenticated === false) {
      return "/login";
    }
    const candidate = opt.requestedDestination || opt.fromParam || opt.nextParam;
    if (candidate && isSafeInternalRoute(candidate)) {
      return candidate.trim();
    }
    const complete = opt.profileCompleted ?? opt.isComplete;
    return complete ? "/dashboard" : "/onboarding/profile";
  }

  const user = userOrOptions as { id?: string; email?: string; role?: string } | null | undefined;
  if (!user || !user.id) {
    return "/login";
  }

  // 1. Check preserved destination query parameter (e.g. ?from=/profile or ?next=/applications)
  const candidate =
    options?.fromParam || options?.nextParam || options?.requestedDestination;
  if (candidate && isSafeInternalRoute(candidate)) {
    return candidate.trim();
  }

  // 2. Check profile completeness status
  const complete = options?.isComplete ?? options?.profileCompleted;
  if (complete) {
    return "/dashboard";
  }

  // 3. New / incomplete user goes to onboarding wizard
  return "/onboarding/profile";
}
