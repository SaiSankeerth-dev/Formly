import { NextResponse } from "next/server";

/**
 * GET /auth/truecaller/mobile-verify?requestId=...
 * 
 * Mobile handoff route for QR code scanning.
 * When scanned by a mobile device camera or opened on mobile,
 * redirects immediately to the Truecaller native SDK deep link.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");

  const appKey =
    process.env.TRUECALLER_APP_KEY ||
    process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY ||
    "oeg7153917a018fd54deeb4e899d4a324e54a";

  const appName = process.env.TRUECALLER_APP_NAME || "SevaSaarthi";

  if (!requestId) {
    return NextResponse.redirect(new URL("/login?error=missing_request_id", request.url));
  }

  const deepLink = `truecallersdk://truesdk/web_verify?type=btmsheet&requestNonce=${encodeURIComponent(
    requestId
  )}&partnerKey=${encodeURIComponent(appKey)}&partnerName=${encodeURIComponent(
    appName
  )}&lang=en&title=login`;

  // Render an HTML page that triggers the intent with fallback
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening Truecaller Verification...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 380px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #0087FF;
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 12px;
      margin-top: 16px;
      width: 100%;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="width:48px;height:48px;border-radius:50%;background:#e0f2fe;color:#0087FF;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.82 15.65c-1.22-.05-2.42-.25-3.55-.61-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.55 6.55 8.35 5.35 8.3 4.13c-.04-.63-.56-1.13-1.2-1.13H3.94c-.69 0-1.26.58-1.23 1.27.47 7.79 6.7 14.02 14.49 14.49.69.03 1.27-.54 1.27-1.23v-3.16c0-.64-.5-1.16-1.13-1.2z"/>
      </svg>
    </div>
    <h2 style="font-size:18px;font-weight:800;margin:0 0 8px;">Opening Truecaller...</h2>
    <p style="font-size:13px;color:#64748b;margin:0 0 16px;">
      Please grant 1-tap consent on your Truecaller app to complete verification for Seva Saarthi.
    </p>
    <a href="${deepLink}" class="btn">Tap to Open Truecaller</a>
    <p style="font-size:11px;color:#94a3b8;margin-top:16px;">
      Don't have Truecaller? You can return and verify with standard SMS OTP.
    </p>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${deepLink}";
    }, 400);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
