# Security Findings — Baseline Inventory

**Baseline Date:** September 2026  
**Methodology:** Static Code Analysis, Dynamic Route Probing, Architectural Threat Modeling (OWASP Top 10 API & Web)

---

## High-Level Finding Summary

| ID | Vulnerability Classification | CWE | Severity | Status at Baseline |
|:---:|:---|:---:|:---:|:---:|
| **SEC-01** | Unauthenticated Autofill Exposing Static Citizen Profile | CWE-306 / CWE-200 | **CRITICAL** | OPEN |
| **SEC-02** | Government Application Creation Accepting Client-Supplied `userId` | CWE-639 / CWE-284 | **CRITICAL** | OPEN |
| **SEC-03** | Hardcoded Fallback Session Signing Secret | CWE-798 / CWE-321 | **CRITICAL** | OPEN |
| **SEC-04** | Public Seeded Demo Tracking Bypass | CWE-200 / CWE-284 | **HIGH** | OPEN |
| **SEC-05** | Browser Extension Script Parsing & Syntax Failures | CWE-704 | **HIGH** | OPEN |
| **SEC-06** | Hidden / Swallowed Supabase Errors Masking Database Health | CWE-390 / CWE-209 | **HIGH** | OPEN |
| **SEC-07** | Notifications Endpoint Crashing (HTTP 500) on String ID to UUID Cast | CWE-704 / CWE-20 | **MEDIUM** | OPEN |
| **SEC-08** | Missing Google OAuth Credentials Preventing Real Flow | CWE-287 | **MEDIUM** | OPEN |

---

## Detailed Vulnerability Profiles

### SEC-01: Unauthenticated Autofill Exposing Citizen Profile
- **Severity:** CRITICAL
- **CVSS 3.1 Score:** 8.6 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)
- **Component:** `src/app/api/agent/autofill/route.ts`
- **Description:** The `GET` handler in `/api/agent/autofill` returns a JSON object containing full applicant details (Full Name, Date of Birth, Phone, Email, Gender, Father's Name, Mother's Name, Aadhaar Number, Bank Account Number, IFSC) to any unauthenticated caller on the public internet.
- **Remediation Requirement:** Wrap route in `getAuthenticatedCitizenUser(request)`. Reject anonymous requests with HTTP 401. Populate payload only from the verified user's own profile rows in Supabase.

### SEC-02: Government Application Creation Accepts Arbitrary `userId`
- **Severity:** CRITICAL
- **CVSS 3.1 Score:** 8.1 (CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:L/I:H/A:N)
- **Component:** `src/app/api/gov/applications/route.ts`
- **Description:** When an officer creates an application record via `POST /api/gov/applications`, the endpoint accepts an unverified `userId` from the request body or falls back to a default mock user. It does not verify whether this `userId` corresponds to a legitimate registered citizen.
- **Remediation Requirement:** Strictly validate citizen identity against the database; disallow arbitrary string IDs; verify caller authorization in the government intake workflow.

### SEC-03: Hardcoded Fallback Session Signing Secret
- **Severity:** CRITICAL
- **CVSS 3.1 Score:** 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Component:** `src/lib/server/db.ts:90-94`
- **Description:** The HMAC signature verification for citizen session tokens uses `"formly_secure_session_secret_key_2026_sih_prod_auth"` if environment variables `SESSION_SECRET` and `SUPABASE_JWT_SECRET` are not set.
- **Remediation Requirement:** In production, throw a startup/runtime exception (Fail-Closed) if the secret is absent or equal to the default development string.

### SEC-04: Public Seeded Demo Tracking Bypass
- **Severity:** HIGH
- **CVSS 3.1 Score:** 5.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)
- **Component:** `src/app/api/track/[id]/route.ts`
- **Description:** A hardcoded set of IDs (`PAN-2026-0001` through `PAN-2026-0004`, `SCH-2026-2345`, `HOU-2026-7781`) bypasses all authentication and ownership checks, returning citizen names and case histories to any unauthenticated requester.
- **Remediation Requirement:** Disable public bypass in production (`process.env.NODE_ENV === "production"`). Restrict demo tracking strictly to automated test suites.

### SEC-05: Browser Extension Script Parsing & Syntax Failures
- **Severity:** HIGH
- **Component:** `extension/` (`background.js`, `content.js`, `page-analyzer.js`, etc.)
- **Description:** The browser extension contained scripts that failed `node --check` syntax validation, rendering the extension unparseable in standard Chromium engines.
- **Remediation Requirement:** Ensure 100% of extension JavaScript passes `node --check` and conforms to Chrome Manifest V3 specifications.

### SEC-06: Hidden / Swallowed Supabase Errors
- **Severity:** HIGH
- **Component:** `src/lib/server/db.ts`, `src/lib/server/pg-db.ts`, `src/app/api/**`
- **Description:** Multiple database call sites wrap Supabase requests in `try { ... } catch {}` blocks without logging, alerting, or bubbling the failure to operators, falsely conveying a healthy Supabase connection when local PGlite is silently servicing requests.
- **Remediation Requirement:** Surface database connection errors in server logs; make Supabase the explicit authoritative production store.
