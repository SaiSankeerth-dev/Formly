# Authentication & Authorization Matrix — Baseline Inventory

**Baseline Date:** September 2026  
**Security Posture:** DUAL-ORIGIN / MULTI-PROVIDER ARCHITECTURE

---

## 1. Identity Providers & Session Mechanisms

| Subsystem | Session Identifier | Token Architecture | Storage Mechanism | Secret / Key Configuration | Expiration Policy |
|---|---|---|---|---|---|
| **Citizen Platform (Supabase)** | `sb-<ref>-auth-token` | Supabase JWT with `auth.uid()` | HTTP-only Cookies | `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Managed by Supabase Auth (Refresh Token flow) |
| **Citizen Platform (Local Fallback)** | `FORMLY_CITIZEN_SESSION`, `seva_saarthi_session` | HMAC-SHA256 Signed JSON: `formly_<b64>.<sig>` | HTTP-only Cookie | `SESSION_SECRET` with hardcoded fallback in `db.ts:93` | 30 days (`exp = now + 30d`) |
| **Government Operations** | `FORMLY_GOV_SESSION`, `formly_gov_session` | Bearer Employee Token / Hex identifier | HTTP-only Cookie | Validated against server `employees` and `sessions` tables | 24 hours to 30 days |
| **Google OAuth** | Google ID Token & Access Token | OAuth 2.0 PKCE / Server Callback | Cookies / Redirect | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Missing in baseline) | Standard Google grant |

---

## 2. Authorization Rules & Role Boundaries

```text
               ┌──────────────────────────────┐
               │    UNAUTHENTICATED PUBLIC    │
               │  (/, /login, /services, ...) │
               └──────────────┬───────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
   ┌───────────────────────┐     ┌───────────────────────┐
   │    CITIZEN SESSION    │     │   GOVERNMENT SESSION  │
   │  (Supabase / Citizen) │     │ (Officer/Admin Employee)│
   └───────────┬───────────┘     └───────────┬───────────┘
               │                             │
    [Citizen Platform Access]     [Government Console Access]
    • /dashboard                  • /gov/dashboard
    • /documents (User-scoped)    • /gov/queue
    • /profile (Self-only)        • /gov/workspace/[id]
    • /applications (Own apps)    • /gov/exceptions
    • /track/[id] (IDOR guarded)  • /gov/audit
                                  • /gov/interoperability
```

---

## 3. Vulnerability Analysis in Baseline Auth

### 3A. Hardcoded Fallback Session Secret
- **Location:** `src/lib/server/db.ts:90-94`
- **Flaw:** If neither `SESSION_SECRET` nor `SUPABASE_JWT_SECRET` is defined in the environment, the server defaults to `"formly_secure_session_secret_key_2026_sih_prod_auth"`.
- **Exploitation:** Any attacker knowing the public open-source codebase can forge valid citizen HMAC session tokens and impersonate any user.
- **Remediation:** In production (`NODE_ENV === "production"`), the server must **FAIL CLOSED** if the signing secret is absent.

### 3B. Unauthenticated Autofill Route
- **Location:** `src/app/api/agent/autofill/route.ts:234-287`
- **Flaw:** `GET /api/agent/autofill` returned full citizen personal profile data (`DEFAULT_USER`) without requiring any session cookie or Authorization header.
- **Exploitation:** Direct public scraping of citizen identity, phone, email, Aadhaar, bank details.
- **Remediation:** Strict requirement for authenticated citizen session deriving data directly from `user.id`.

### 3C. Arbitrary Client `userId` in Government Applications
- **Location:** `src/app/api/gov/applications/route.ts:48-50`
- **Flaw:** Officer endpoint allowed client payload to specify an arbitrary `userId`, falling back to a hardcoded UUID `u_0bc5a3b6-f059-4ab2-9870-46a9c25178b7`.
- **Exploitation:** Privilege abuse, IDOR, creating spoofed records attributed to unauthorized citizen IDs.
- **Remediation:** Server must derive or validate citizen ownership against registered database users or verify authenticated context.

### 3D. Public Seeded Demo Tracking Bypass
- **Location:** `src/app/api/track/[id]/route.ts:25-28`
- **Flaw:** `SEEDED_DEMO_CASES` allowed anyone on the public internet without authentication to track cases `PAN-2026-0001` through `PAN-2026-0004`.
- **Remediation:** Isolate demo bypass strictly to non-production/test environments; in production, all tracking must require verified ownership or officer role.
