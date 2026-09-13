# API Route Matrix — Baseline Inventory

**Baseline Date:** September 2026  
**Total API Route Handlers:** 44  
**Primary Database Interface:** PGlite / PostgreSQL Migration 002 (with Supabase dual client)

---

## Complete API Route Handler Inventory

| # | HTTP Method(s) | Endpoint Path | Source File | Auth Required | Role Enforced | Purpose | Baseline Status & Security Issues |
|:---:|:---|:---|:---|:---|:---|:---|:---|
| 1 | `GET`, `POST` | `/api/agent/autofill` | `src/app/api/agent/autofill/route.ts` | None (Baseline) | None | Browser extension autofill payload generator | **CRITICAL**: Baseline exposes static citizen profile unauthenticated. |
| 2 | `POST` | `/api/agent/launch-headed` | `src/app/api/agent/launch-headed/route.ts` | Citizen | Citizen | Spawns headed Playwright browser | **HIGH RISK**: Launches automated Chromium instance against external URLs. |
| 3 | `GET`, `POST` | `/api/applications` | `src/app/api/applications/route.ts` | Citizen | Citizen | Citizen application creation and listing | Reads/writes citizen application records. |
| 4 | `GET` | `/api/auth/google` | `src/app/api/auth/google/route.ts` | Public | None | Initiates Google OAuth redirection flow | Fails if Google client ID/secret are not configured. |
| 5 | `GET` | `/api/auth/google/callback` | `src/app/api/auth/google/callback/route.ts` | Public | None | Handles Google OAuth callback and session creation | Links Google user or redirects with error. |
| 6 | `POST` | `/api/auth/login` | `src/app/api/auth/login/route.ts` | Public | None | Authenticates citizen email/password | Signs HMAC session token. |
| 7 | `POST` | `/api/auth/logout` | `src/app/api/auth/logout/route.ts` | None | None | Invalidates session cookie | Clears cookie and database session record. |
| 8 | `POST` | `/api/auth/register` | `src/app/api/auth/register/route.ts` | Public | None | Registers new citizen account | PBKDF2 password hashing; stores in DB. |
| 9 | `GET` | `/api/auth/session` | `src/app/api/auth/session/route.ts` | Citizen | None | Validates citizen session token | Resolves user profile from database. |
| 10 | `POST` | `/api/citizen/applications` | `src/app/api/citizen/applications/route.ts` | Citizen | Citizen | Direct citizen application submission | Enforces authenticated `user.id`. |
| 11 | `GET` | `/api/dashboard` | `src/app/api/dashboard/route.ts` | Citizen | Citizen | Aggregates dashboard data for citizen | Returns profile, application count, documents. |
| 12 | `GET`, `POST` | `/api/documents` | `src/app/api/documents/route.ts` | Citizen | Citizen | Document listing and upload handler | Binary optimization, magic byte detection. |
| 13 | `GET`, `DELETE` | `/api/documents/[id]` | `src/app/api/documents/[id]/route.ts` | Citizen | Citizen | Fetch or delete specific citizen document | Scoped to authenticated user. |
| 14 | `POST` | `/api/documents/[id]/extracted-fields/[fieldId]/accept` | `.../accept/route.ts` | Citizen | Citizen | Confirms OCR field value to profile | Writes to `profile_fields`. |
| 15 | `POST` | `/api/documents/[id]/extracted-fields/[fieldId]/reject` | `.../reject/route.ts` | Citizen | Citizen | Rejects OCR field value | Marks field rejected. |
| 16 | `GET`, `POST` | `/api/gov/applications` | `src/app/api/gov/applications/route.ts` | Gov Employee | Officer/Admin | List applications or create government case | **CRITICAL**: POST accepted client-supplied `userId`. |
| 17 | `GET` | `/api/gov/applications/[id]` | `src/app/api/gov/applications/[id]/route.ts` | Gov Employee | Officer/Admin | Deep case file workspace retrieval | Fetches application, documents, and audit logs. |
| 18 | `POST` | `/api/gov/applications/[id]/accept` | `.../accept/route.ts` | Gov Employee | Officer/Admin | Transitions case to APPROVED | Advances physical card pipeline; generates PAN. |
| 19 | `POST` | `/api/gov/applications/[id]/advance` | `.../advance/route.ts` | Gov Employee | Officer/Admin | Advances physical card production stage | Card printing -> Dispatch -> Delivery. |
| 20 | `POST` | `/api/gov/applications/[id]/assign` | `.../assign/route.ts` | Gov Employee | Officer/Admin | Assigns application to officer desk | Updates `application_assignments`. |
| 21 | `POST` | `/api/gov/applications/[id]/reject` | `.../reject/route.ts` | Gov Employee | Officer/Admin | Rejects application with reason | Enforces database transition rule. |
| 22 | `POST` | `/api/gov/applications/[id]/retry` | `.../retry/route.ts` | Gov Employee | Officer/Admin | Retries degraded connector checks | Restores application to actionable stage. |
| 23 | `POST` | `/api/gov/applications/[id]/return` | `.../return/route.ts` | Gov Employee | Officer/Admin | Returns application to citizen for correction | Records correction request reason. |
| 24 | `GET`, `POST` | `/api/gov/audit` | `src/app/api/gov/audit/route.ts` | Gov Employee | Officer/Admin | Retrieves or logs tamper-evident audit events | SHA-256 hash chaining; trigger-enforced append-only. |
| 25 | `POST` | `/api/gov/auth/login` | `src/app/api/gov/auth/login/route.ts` | Public | Gov Employee | Government officer credential authentication | Sets `FORMLY_GOV_SESSION` cookie. |
| 26 | `POST` | `/api/gov/auth/logout` | `src/app/api/gov/auth/logout/route.ts` | None | None | Officer logout handler | Clears `FORMLY_GOV_SESSION` cookie. |
| 27 | `GET`, `POST` | `/api/gov/connectors` | `src/app/api/gov/connectors/route.ts` | Gov Employee | Officer/Admin | Connector health monitoring and test execution | Emulates UIDAI, NSDL, DigiLocker, NSP. |
| 28 | `GET`, `POST` | `/api/gov/data-mapper` | `src/app/api/gov/data-mapper/route.ts` | Gov Employee | Officer/Admin | Canonical data mapping query & test | Normalizes heterogeneous departmental schemas. |
| 29 | `GET`, `POST` | `/api/gov/exceptions` | `src/app/api/gov/exceptions/route.ts` | Gov Employee | Officer/Admin | List and resolve system exceptions | Tracks connector failures and discrepancies. |
| 30 | `GET` | `/api/gov/me` | `src/app/api/gov/me/route.ts` | Gov Employee | Officer/Admin | Fetch current officer session profile | Queries `employees` table. |
| 31 | `POST` | `/api/gov/reset` | `src/app/api/gov/reset/route.ts` | Gov Employee | Officer/Admin | Resets demo pipeline state | Re-seeds initial demonstration cases. |
| 32 | `GET` | `/api/health` | `src/app/api/health/route.ts` | Public | None | Server and database health check | Confirms PostgreSQL / PGlite connectivity. |
| 33 | `GET`, `PATCH` | `/api/notifications` | `src/app/api/notifications/route.ts` | Citizen | Citizen | In-app notification center feed | **HIGH**: Fails with 500 when string ID passed to UUID field. |
| 34 | `PATCH`, `DELETE` | `/api/notifications/[id]` | `.../notifications/[id]/route.ts` | Citizen | Citizen | Mark read or delete single notification | Scoped to recipient. |
| 35 | `GET`, `PATCH` | `/api/profile` | `src/app/api/profile/route.ts` | Citizen | Citizen | Get or update 52 canonical profile fields | Saves profile fields into PostgreSQL. |
| 36 | `POST` | `/api/requirements/[id]/resolve` | `.../resolve/route.ts` | Citizen | Citizen | Citizen marks service requirement resolved | Updates checklist state. |
| 37 | `POST` | `/api/requirements/[id]/unresolve` | `.../unresolve/route.ts` | Citizen | Citizen | Citizen unmarks service requirement | Reverts checklist state. |
| 38 | `GET` | `/api/services/discover` | `src/app/api/services/discover/route.ts` | Public | None | Full-text search and scheme filtering | Queries verified service registry. |
| 39 | `GET` | `/api/services/[id]/checklist` | `.../[id]/checklist/route.ts` | Citizen | Citizen | Calculates citizen readiness checklist | Evaluates uploaded docs vs requirements. |
| 40 | `GET`, `POST` | `/api/sessions` | `src/app/api/sessions/route.ts` | Citizen | Citizen | Browser extension active application session | Manages citizen service handoff state. |
| 41 | `GET` | `/api/track/latest` | `src/app/api/track/latest/route.ts` | Citizen | Citizen | Returns most recent application ID | For quick resume tracking. |
| 42 | `GET` | `/api/track/[id]` | `src/app/api/track/[id]/route.ts` | Citizen/Gov | None/Demo | Application tracking detail | **HIGH**: Baseline exposed demo tracking IDs publicly. |
| 43 | `GET` | `/api/track/[id]/ai-explanation` | `.../ai-explanation/route.ts` | Citizen | Citizen | AI-generated plain language status explanation | Returns guidance notes for applicant. |
| 44 | `POST` | `/api/track/[id]/resubmit` | `.../resubmit/route.ts` | Citizen | Citizen | Resubmits corrected document/application | Restores case to officer desk. |
