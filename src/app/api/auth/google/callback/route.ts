import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findOrCreateGoogleUser, getUserProfileFields } from "@/lib/server/db";
import { checkOnboardingStatus } from "@/lib/constants/profile";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const rawProto = request.headers.get("x-forwarded-proto");
  const proto = rawProto ? rawProto.split(",")[0].trim() : (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const returnedState = requestUrl.searchParams.get("state");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // Validate CSRF state parameter if state cookie is present
  try {
    const cookieStore = await cookies();
    const oauthStateCookie = cookieStore.get("oauth_state")?.value;
    if (oauthStateCookie && returnedState && oauthStateCookie !== returnedState) {
      console.error("[Direct Google OAuth] State parameter mismatch");
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
  } catch (cookieErr) {
    console.warn("[Direct Google OAuth] Unable to read cookies for state check:", cookieErr);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[Direct Google OAuth] Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch user profile from Google UserInfo endpoint
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      console.error("[Direct Google OAuth] UserInfo request failed:", await userInfoRes.text());
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    const googleUser = await userInfoRes.json();
    const email = googleUser.email;
    const name = googleUser.name || googleUser.given_name || "";
    const avatar = googleUser.picture || "";
    const providerAccountId = googleUser.sub;

    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    const { user, token } = await findOrCreateGoogleUser({
      email,
      name,
      avatar,
      providerAccountId,
    });

    // Check citizen onboarding status
    const fields = await getUserProfileFields(user.id);
    const status = checkOnboardingStatus(fields, user);

    const redirectPath = status.isComplete
      ? "/dashboard"
      : `/onboarding/profile?step=${status.currentStep || 1}`;

    const res = NextResponse.redirect(new URL(redirectPath, origin));

    res.cookies.set({
      name: "FORMLY_CITIZEN_SESSION",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    res.cookies.set({
      name: "seva_saarthi_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    res.cookies.delete("FORMLY_GOV_SESSION");
    res.cookies.delete("formly_gov_session");
    res.cookies.delete("oauth_state");

    return res;
  } catch (err) {
    console.error("[Direct Google OAuth] Unexpected callback error:", err);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }
}
