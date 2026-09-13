# Known Limitations — Baseline Inventory

**Baseline Date:** September 2026  
**System Status:** PROTOTYPE FOUNDATION WITH SPECIFIC TECHNICAL LIMITATIONS

---

## 1. Database & Persistence Limitations
- **PGlite as Runtime Primary:** Although Supabase configuration keys exist in `.env.local`, the server runtime relies on in-memory or embedded `@electric-sql/pglite` instances. Production serverless cold-starts reset in-memory data unless Supabase is configured as the true authoritative source.
- **Hidden / Silently Caught Database Exceptions:** Several route handlers wrap Supabase query calls in empty `catch {}` blocks, preventing operators from diagnosing connection degradation.

## 2. Authentication & Identity Limitations
- **Stateless HMAC Fallback Secret:** In local/dev environments without `SESSION_SECRET`, tokens were signed with a static string.
- **Google OAuth:** Lacks live Google Cloud Console OAuth 2.0 Client ID and Secret credentials. Calling `/api/auth/google` fails unless valid production credentials are supplied.
- **Notifications Endpoint Failure (HTTP 500):** Passing string identifier formats into PostgreSQL UUID fields (`notifications.recipient_id`) triggered cast failures.

## 3. Automation & AI Limitations
- **Simulated OCR Responses:** The OCR pipeline in baseline returned pre-computed success-shaped payloads regardless of uploaded image quality or failure states.
- **Simulated AI Guidance:** The assistant and status explanations used heuristic/templated text without live LLM or structured orchestrator reasoning.
- **Browser Extension Execution:** While the Protean PAN URL is reachable, the extension's automated form detection and non-destructive filling had not been verified on a live Chromium session with active DOM mutation observers.

## 4. Government Portal Operations
- **Officer Case Ownership:** Baseline government application intake accepted arbitrary client `userId` parameters instead of enforcing server-derived authenticated citizen identity.
- **Seeded Metric Numbers:** Dashboard numbers (e.g. 1,250 total applications, 83 active, 17 exceptions) in certain UI views were static seeded values rather than live SQL aggregate calculations (`COUNT(*)`).

## 5. Deployment & Multi-User Verification
- **Vercel Production Evidence:** No authenticated end-to-end multi-user test suite had been run against deployed Vercel and deployed Supabase infrastructure simultaneously.
