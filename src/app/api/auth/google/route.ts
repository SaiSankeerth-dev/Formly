import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const rawProto = request.headers.get("x-forwarded-proto");
  const proto = rawProto ? rawProto.split(",")[0].trim() : (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Return friendly error redirect if Google OAuth client ID is not configured
    return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set({
    name: "oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
