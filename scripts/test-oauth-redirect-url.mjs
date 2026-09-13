import assert from "assert";
import { getOAuthRedirectUrl, getEnvironmentType, getOAuthDebugInfo } from "../src/lib/auth/oauth-url.ts";

console.log("================================================================================");
console.log("   SEVA SAARTHI: OAUTH REDIRECT URL & ENVIRONMENT RESOLUTION TEST SUITE");
console.log("================================================================================\n");

// TEST 1: Local Development on Default Port 3000
console.log("--- 1. Testing Localhost on Port 3000 ---");
const local3000 = getOAuthRedirectUrl({ origin: "http://localhost:3000" });
console.log(`Localhost 3000 redirect URL: ${local3000}`);
assert.strictEqual(local3000, "http://localhost:3000/auth/callback", "Must match http://localhost:3000/auth/callback");
assert.strictEqual(getEnvironmentType({ origin: "http://localhost:3000" }), "local");
console.log("✓ PASS: Localhost 3000 resolves to http://localhost:3000/auth/callback\n");

// TEST 2: Local Development on Custom Port (e.g. 3001, 8080)
console.log("--- 2. Testing Localhost on Dynamic Ports (3001, 8080) ---");
const local3001 = getOAuthRedirectUrl({ origin: "http://localhost:3001" });
assert.strictEqual(local3001, "http://localhost:3001/auth/callback", "Must match http://localhost:3001/auth/callback");

const local8080 = getOAuthRedirectUrl({ origin: "http://localhost:8080" });
assert.strictEqual(local8080, "http://localhost:8080/auth/callback", "Must match http://localhost:8080/auth/callback");
console.log("✓ PASS: Dynamic local ports correctly preserved\n");

// TEST 3: 127.0.0.1 IP Origin
console.log("--- 3. Testing 127.0.0.1 Loopback Origin ---");
const localIp = getOAuthRedirectUrl({ origin: "http://127.0.0.1:3000" });
assert.strictEqual(localIp, "http://127.0.0.1:3000/auth/callback");
assert.strictEqual(getEnvironmentType({ origin: "http://127.0.0.1:3000" }), "local");
console.log("✓ PASS: 127.0.0.1 loopback origin correctly identified as local\n");

// TEST 4: Critical Isolation - Vercel Env Vars MUST NOT override Localhost
console.log("--- 4. Testing Ambient Vercel Env Var Isolation during Local Dev ---");
const localWithVercelEnv = getOAuthRedirectUrl({
  origin: "http://localhost:3000",
  env: {
    NEXT_PUBLIC_VERCEL_URL: "seva-saarthi-sankeerths615-2103s-projects.vercel.app",
    VERCEL_URL: "seva-saarthi-sankeerths615-2103s-projects.vercel.app",
    VERCEL_ENV: "preview",
  },
});
console.log(`Localhost with Vercel env present: ${localWithVercelEnv}`);
assert.strictEqual(
  localWithVercelEnv,
  "http://localhost:3000/auth/callback",
  "CRITICAL: Ambient Vercel env vars must NOT hijack localhost redirect!"
);
assert.ok(
  !localWithVercelEnv.includes("vercel.app"),
  "Local redirect MUST NEVER contain vercel.app"
);
console.log("✓ PASS: Localhost is protected from Vercel preview URL hijacking\n");

// TEST 5: Vercel Preview Environment
console.log("--- 5. Testing Vercel Preview Deployment Resolution ---");
const previewOrigin = getOAuthRedirectUrl({
  origin: "https://seva-saarthi-preview-branch.vercel.app",
});
assert.strictEqual(previewOrigin, "https://seva-saarthi-preview-branch.vercel.app/auth/callback");
assert.strictEqual(getEnvironmentType({ origin: "https://seva-saarthi-preview-branch.vercel.app" }), "preview");

// SSR Preview
const previewSsr = getOAuthRedirectUrl({
  env: {
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_VERCEL_URL: "preview-deployment-abc.vercel.app",
  },
});
assert.strictEqual(previewSsr, "https://preview-deployment-abc.vercel.app/auth/callback");
console.log("✓ PASS: Vercel Preview environment resolves correctly\n");

// TEST 6: Production Custom Domain
console.log("--- 6. Testing Production Environment Resolution ---");
const prodOrigin = getOAuthRedirectUrl({
  origin: "https://seva-saarthi.gov.in",
});
assert.strictEqual(prodOrigin, "https://seva-saarthi.gov.in/auth/callback");
assert.strictEqual(getEnvironmentType({ origin: "https://seva-saarthi.gov.in" }), "production");

// SSR Production
const prodSsr = getOAuthRedirectUrl({
  env: {
    VERCEL_ENV: "production",
    NEXT_PUBLIC_APP_URL: "https://seva-saarthi.gov.in",
  },
});
assert.strictEqual(prodSsr, "https://seva-saarthi.gov.in/auth/callback");
console.log("✓ PASS: Production environment resolves to canonical domain\n");

// TEST 7: Safe Debug Information Output
console.log("--- 7. Testing Safe Debug Information Formatting ---");
const debug = getOAuthDebugInfo({ origin: "http://localhost:3000" });
assert.strictEqual(debug.environment, "local");
assert.strictEqual(debug.actualOrigin, "http://localhost:3000");
assert.strictEqual(debug.redirectTo, "http://localhost:3000/auth/callback");
assert.strictEqual(debug.callbackPath, "/auth/callback");
assert.strictEqual(debug.finalRedirectTarget, "/dashboard");
// Ensure no secrets exist in debug output
assert.strictEqual(Object.keys(debug).some((k) => k.toLowerCase().includes("secret") || k.toLowerCase().includes("token")), false);
console.log("✓ PASS: Debug output provides required diagnostics without leaking secrets\n");

console.log("================================================================================");
console.log("   ALL 7 OAUTH REDIRECT REGRESSION TESTS PASSED (100% SUCCESS)");
console.log("================================================================================");
