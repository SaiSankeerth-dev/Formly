import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { findOrCreateGoogleUser, getUserProfileFields } from "@/lib/server/db";
import { checkOnboardingStatus } from "@/lib/constants/profile";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");

  // Determine origin safely for local dev, Vercel preview, and production domains
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const rawProto = request.headers.get("x-forwarded-proto");
  const proto = rawProto ? rawProto.split(",")[0].trim() : (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  if (errorParam || errorDesc) {
    console.error("[Google OAuth Callback] Error returned:", errorParam, errorDesc);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "placeholder-anon-key";

      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component / route handler setAll
            }
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[Google OAuth Callback] exchangeCodeForSession failed:", error.message);
        return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
      }

      if (data?.user?.email) {
        const authUser = data.user;
        const email = authUser.email!;
        const name =
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.user_metadata?.display_name ||
          "";
        const avatarUrl =
          authUser.user_metadata?.avatar_url ||
          authUser.user_metadata?.picture ||
          "";
        const providerId = authUser.id;

        const { user, token } = await findOrCreateGoogleUser({
          email,
          name,
          avatar: avatarUrl,
          providerAccountId: providerId,
        });

        // Determine destination based on whether citizen profile onboarding is complete
        const fields = await getUserProfileFields(user.id);
        const status = checkOnboardingStatus(fields, user);

        const redirectUrl = new URL(
          status.isComplete ? "/dashboard" : `/onboarding/profile?step=${status.currentStep || 1}`,
          origin
        );

        const response = NextResponse.redirect(redirectUrl);

        // Set citizen session cookies
        response.cookies.set({
          name: "FORMLY_CITIZEN_SESSION",
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });

        response.cookies.set({
          name: "seva_saarthi_session",
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });

        // Invalidate any active government session cookies to ensure strict separation
        response.cookies.delete("FORMLY_GOV_SESSION");
        response.cookies.delete("formly_gov_session");

        return response;
      }
    } catch (err: any) {
      console.error("[Google OAuth Callback] Unexpected processing error:", err);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
