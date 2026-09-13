# Route Matrix — Baseline Inventory

**Baseline Date:** September 2026  
**Total Citizen Pages:** 26  
**Total Canonical Government Pages:** 14  
**Total Duplicate/Mirror Government Pages:** 16  
**Total Pages Across System:** 56

---

## 1. Citizen Platform Routes (`src/app/(citizen)/`)

| # | Route Path | File System Path | Role Intended | Shell / Layout | Auth Guard | Baseline Audit Status & Notes |
|:---:|:---|:---|:---|:---|:---|:---|
| 1 | `/` | `src/app/(citizen)/page.tsx` | Public | Citizen Layout | Public | Landing page / citizen welcome. Redirects if authenticated. |
| 2 | `/dashboard` | `src/app/(citizen)/dashboard/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Main citizen hub. Shows active applications, documents, quick services. |
| 3 | `/applications` | `src/app/(citizen)/applications/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | List of citizen submitted/in-progress applications. |
| 4 | `/applications/[id]` | `src/app/(citizen)/applications/[id]/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Redirector to `/applications/[id]/status`. |
| 5 | `/applications/[id]/status` | `src/app/(citizen)/applications/[id]/status/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Live 5-stage application tracker with timeline and AI explanation. |
| 6 | `/assistant` | `src/app/(citizen)/assistant/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Conversational guidance assistant for citizen schemes. |
| 7 | `/checklist` | `src/app/(citizen)/checklist/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Scheme eligibility & document readiness checklist. |
| 8 | `/discover` | `src/app/(citizen)/discover/page.tsx` | Public/Citizen | Citizen Layout | Public | Service discovery & scheme exploration catalog. |
| 9 | `/documents` | `src/app/(citizen)/documents/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Document vault & upload manager with smart optimization. |
| 10 | `/help` | `src/app/(citizen)/help/page.tsx` | Public/Citizen | Citizen Layout | Public | Knowledge base, FAQs, and support articles. |
| 11 | `/login` | `src/app/(citizen)/login/page.tsx` | Public | Citizen Layout | Public (Redirects if authed) | Citizen credentials & Google OAuth login form. |
| 12 | `/notifications` | `src/app/(citizen)/notifications/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | In-app notification center. Connected to `/api/notifications`. |
| 13 | `/onboarding/profile` | `src/app/(citizen)/onboarding/profile/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | 4-step first-time profile completion wizard. |
| 14 | `/portal/scholarships` | `src/app/(citizen)/portal/scholarships/page.tsx` | Citizen | Citizen Layout | Public/Citizen | Embedded portal simulator for NSP scholarship workflows. |
| 15 | `/privacy` | `src/app/(citizen)/privacy/page.tsx` | Public | Citizen Layout | Public | Statutory privacy policy and DPDP compliance notices. |
| 16 | `/profile` | `src/app/(citizen)/profile/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Comprehensive 52-field canonical profile editor. |
| 17 | `/services` | `src/app/(citizen)/services/page.tsx` | Public/Citizen | Citizen Layout | Public | Complete directory of verified central & state services. |
| 18 | `/services/[id]` | `src/app/(citizen)/services/[id]/page.tsx` | Public/Citizen | Citizen Layout | Public | Service detail, requirements, eligibility, and Apply Now launcher. |
| 19 | `/settings` | `src/app/(citizen)/settings/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Citizen account settings, preferences, and security options. |
| 20 | `/signup` | `src/app/(citizen)/signup/page.tsx` | Public | Citizen Layout | Public (Redirects if authed) | Citizen registration form. |
| 21 | `/support` | `src/app/(citizen)/support/page.tsx` | Public/Citizen | Citizen Layout | Public | Help desk contact and grievance ticketing. |
| 22 | `/tasks` | `src/app/(citizen)/tasks/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Pending citizen action items (document re-uploads, corrections). |
| 23 | `/terms` | `src/app/(citizen)/terms/page.tsx` | Public | Citizen Layout | Public | Terms of service and citizen charter. |
| 24 | `/track` | `src/app/(citizen)/track/page.tsx` | Public/Citizen | Citizen Layout | Public | Quick lookup tracker redirector. |
| 25 | `/track/[id]` | `src/app/(citizen)/track/[id]/page.tsx` | Citizen | Citizen Layout | IDOR Check / Demo bypass | Application status tracking screen. |
| 26 | `/vault` | `src/app/(citizen)/vault/page.tsx` | Citizen | Citizen Layout | Supabase Session / Cookie | Legacy alias redirecting to `/documents`. |

---

## 2. Canonical Government Routes (`src/app/gov/`)

| # | Route Path | File System Path | Role Intended | Shell / Layout | Auth Guard | Baseline Audit Status & Notes |
|:---:|:---|:---|:---|:---|:---|:---|
| 1 | `/gov` | `src/app/gov/page.tsx` | Gov Officer | Government Shell | `FORMLY_GOV_SESSION` | Redirects to `/gov/dashboard`. |
| 2 | `/gov/dashboard` | `src/app/gov/dashboard/page.tsx` | Gov Officer/Admin | Government Shell | `FORMLY_GOV_SESSION` | Government operations overview, case throughput, metrics. |
| 3 | `/gov/applications` | `src/app/gov/applications/page.tsx` | Gov Officer | Government Shell | `FORMLY_GOV_SESSION` | Officer application queue with filterable stages and search. |
| 4 | `/gov/queue` | `src/app/gov/queue/page.tsx` | Gov Officer | Government Shell | `FORMLY_GOV_SESSION` | Dedicated intake and processing queue with tabbed views. |
| 5 | `/gov/workspace/[id]` | `src/app/gov/workspace/[id]/page.tsx` | Gov Officer | Government Shell | `FORMLY_GOV_SESSION` | Deep case review desk: OCR verification, AI notes, accept/return/reject. |
| 6 | `/gov/exceptions` | `src/app/gov/exceptions/page.tsx` | Gov Officer/Admin | Government Shell | `FORMLY_GOV_SESSION` | Exception review center (connector timeouts, data mismatches). |
| 7 | `/gov/interoperability` | `src/app/gov/interoperability/page.tsx` | Gov Admin | Government Shell | `FORMLY_GOV_SESSION` | Connector status hub (UIDAI, NSDL, DigiLocker, NSP). |
| 8 | `/gov/data-mapper` | `src/app/gov/data-mapper/page.tsx` | Gov Admin | Government Shell | `FORMLY_GOV_SESSION` | Field transformation and canonical mapping simulator. |
| 9 | `/gov/workflows` | `src/app/gov/workflows/page.tsx` | Gov Admin | Government Shell | `FORMLY_GOV_SESSION` | State machine workflow definitions and visualizer. |
| 10 | `/gov/audit` | `src/app/gov/audit/page.tsx` | Gov Admin/Auditor | Government Shell | `FORMLY_GOV_SESSION` | Tamper-evident append-only audit trail with SHA-256 signatures. |
| 11 | `/gov/monitoring` | `src/app/gov/monitoring/page.tsx` | Sys Admin | Government Shell | `FORMLY_GOV_SESSION` | Real-time SLA monitoring and serverless health indicators. |
| 12 | `/gov/resources` | `src/app/gov/resources/page.tsx` | Gov Officer | Government Shell | `FORMLY_GOV_SESSION` | Standard operating procedures and service circulars. |
| 13 | `/gov/settings` | `src/app/gov/settings/page.tsx` | Gov Officer | Government Shell | `FORMLY_GOV_SESSION` | Department and officer profile configuration. |
| 14 | `/gov/login` | `src/app/gov/login/page.tsx` | Public/Officer | Minimal Shell | Public | Officer login with employee badge credentials. |

---

## 3. Mirror/Duplicate Government Routes (`src/app/government/`)

The 16 files under `src/app/government/` mirror the canonical `/gov/` routes:
- `/government` -> redirects to `/gov/dashboard`
- `/government/dashboard` -> mirrors `/gov/dashboard`
- `/government/applications` -> mirrors `/gov/applications`
- `/government/applications/[id]` -> mirrors `/gov/workspace/[id]`
- `/government/workspace/[id]` -> mirrors `/gov/workspace/[id]`
- `/government/queue` -> mirrors `/gov/queue`
- `/government/my-queue` -> rewrites to `/gov/queue?tab=my_assignments`
- `/government/exceptions` -> mirrors `/gov/exceptions`
- `/government/interoperability` -> mirrors `/gov/interoperability`
- `/government/data-mapper` -> mirrors `/gov/data-mapper`
- `/government/workflows` -> mirrors `/gov/workflows`
- `/government/audit` -> mirrors `/gov/audit`
- `/government/monitoring` -> mirrors `/gov/monitoring`
- `/government/resources` -> mirrors `/gov/resources`
- `/government/settings` -> mirrors `/gov/settings`
- `/government/login` -> mirrors `/gov/login`
