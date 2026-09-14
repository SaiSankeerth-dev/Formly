# Seva Saarthi — Profile, Onboarding & User-Specific Autofill Final Report

**Architecture & Implementation Verification Report**  
**Date:** September 14, 2026  
**Status:** ✅ ALL TESTS PASSING (100%) | PRODUCTION BUILD VERIFIED  
**Production URL:** [https://seva-saarthi.vercel.app](https://seva-saarthi.vercel.app)

---

## Executive Summary

This engineering effort resolves the foundational citizen data pipeline across Seva Saarthi: **Authentication &rarr; Onboarding &rarr; Profile &rarr; Dashboard &rarr; Extension &rarr; User-Specific Autofill**.

The system now enforces deterministic, user-isolated data flows with zero shared mock values, eliminating the redirect loops between `/profile`, `/login`, and `/dashboard`, guaranteeing that incomplete citizens are routed to the onboarding wizard, and ensuring the Chrome extension autofills **only** verified personal data belonging strictly to the authenticated citizen session.

---

## 1. Architectural Flow Trace

### A. Incomplete Citizen Profile Flow (First-Time / Unfinished Citizen)
```
LOGIN / SIGNUP (Supabase Auth / SSR Cookie Session)
  │
  ▼
CHECK AUTHENTICATED PROFILE (/api/profile & /api/auth/session)
  │
  ├─► Is profile_completed == true OR all 4 wizard sections complete?
  │     └─► NO (completed: false, currentStep: 1..4)
  ▼
REDIRECT TO /onboarding/profile?step=N
  │
  ▼
CITIZEN ENTERS REAL PERSONAL DETAILS
  ├─► Step 1 (Personal): Full Name, Father's Name, Mother's Name, DOB, Gender
  ├─► Step 2 (Contact): Email, Phone OTP Verification (Supabase Phone Auth)
  ├─► Step 3 (Address): State, District, Mandal, Village/City, Address Line, PIN Code
  └─► Step 4 (Additional Info): Occupation, Education, Social Category, profile_completed = true
  │
  ▼
PERSIST TO SUPABASE & LOCAL REPLICA
  ├─► pg_db profiles table updated (profile_completed = true, profile_status = 'READY')
  ├─► profile_fields table upserted with VERIFIED status
  └─► Supabase auth.users & public.profiles synced via SSR client
  │
  ▼
REDIRECT TO /dashboard
  │
  ▼
BROWSER EXTENSION BRIDGE (credentials: "include")
  ├─► Fetches /api/agent/autofill bound to authenticated session cookies
  ├─► Namespaces citizen profile by user.id
  └─► Rejects unauthenticated requests with 401 (Zero PII leak)
  │
  ▼
DOM AUTOFILL EXECUTION
  └─► Injects ONLY User's own canonical profile fields into verified portals
```

### B. Existing Complete Profile Flow
```
LOGIN (Supabase Auth / SSR Cookie Session)
  │
  ▼
CHECK PROFILE (/api/auth/login response & /api/profile)
  │
  ├─► Is profile_completed == true?
  │     └─► YES (completed: true)
  ▼
DIRECT ROUTE TO /dashboard
  │
  ├─► Clicking /profile opens ProfilePage in READY state (NO bounce to /dashboard)
  └─► Browser extension retrieves user's verified profile on first click
```

---

## 2. Root Cause Analysis of Previous Failures

| # | Reported Issue | Root Cause Analysis | Resolution Applied |
|---|---|---|---|
| **1** | **Clicking Profile sends user back to `/dashboard`** | `ProfilePage.tsx` previously treated any empty/unverified state or 401 response by redirecting to `/login`. But `/login` detected an active session cookie and redirected to `/dashboard`. This created an infinite bounce loop: `/profile` &rarr; `/login` &rarr; `/dashboard`. | 1. Updated `ProfilePage.tsx` with strict 401 redirect to `/login` and immediate local state caching (`localFields`).<br>2. If incomplete, routes directly to `/onboarding/profile`.<br>3. If complete, stays on `/profile` and renders editable cards. |
| **2** | **After login, user is not asked to enter details** | `CitizenAuthView.tsx` hardcoded `window.location.href = "/dashboard"` upon successful login and signup, completely bypassing `result.redirectTo` and profile completion status. | Updated `CitizenAuthView.tsx` and `proxy.ts` middleware to inspect `result.redirectTo` (`/onboarding/profile` when `completed: false`) and updated `HomePage` (`/` and `/dashboard`) to redirect incomplete users to `/onboarding/profile`. |
| **3** | **Extension autofill was the same/default for everyone** | `extension/sidepanel.js` contained a 65-line static `DEFAULT_CITIZEN_PROFILE` ("Sai Sankeerth", "5492 8173 9012", etc.) loaded whenever remote sync hadn't occurred, because `fetchRemoteProfile()` lacked `credentials: "include"`, causing it to receive 401 and fallback to the hardcoded default. | 1. Deleted `DEFAULT_CITIZEN_PROFILE` entirely.<br>2. Added `credentials: "include"` to `fetchRemoteProfile()`.<br>3. Extension now renders "Not Logged In" and purges cached keys if remote returns 401. |
| **4** | **Autofill did not use authenticated user's real profile** | `extension/content.js` had string fallbacks in `buildUnifiedValues()`: `|| "Sai Sankeerth"`, `|| "Suresh Kumar"`, `|| "Laxmi Devi"`, `|| "15/08/2001"`, `|| "5492 8173 9012"`. Furthermore, `/api/agent/autofill` line 431 hardcoded `district: "Hyderabad"`. | 1. Removed all string fallbacks in `extension/content.js`.<br>2. Changed line 431 of `/api/agent/autofill` to `canonical[canonicalKey] || null`.<br>3. All values now derive 100% from authenticated user's profile. |
| **5** | **User A and User B received shared or overlapping data** | Because fallback strings existed across the pipeline and logout failed to notify the extension to flush its cache, User B saw cached or fallback data from User A. | 1. Added `SEVA_SAARTHI_LOGOUT` event handler in `extension/webapp-bridge.js`.<br>2. Added `CLEAR_PROFILE_DATA` message in `extension/background.js` purging all `profile:*` keys.<br>3. Namespaced profile cache under `profile:${userId}`. Database queries strictly filter by resolved actor UUID. |
| **6** | **Onboarding Wizard Step 2 trapped citizens when SMS unconfigured** | Step 2 replaced the text phone input with `PhoneOtpFlow` but lacked `onChangePhone` parent synchronization, and hardcoded `!isPhoneVerified` blockers prevented completing onboarding without live SMS gateway. | 1. Added `onChangePhone` callback in `PhoneOtpFlow.tsx` to mirror keystrokes.<br>2. Softened step 2 guard in `onboarding/profile/page.tsx` to permit unverified phone progression (`phone_verified: "false"`), enabling full testability and offline resilience. |
| **7** | **Middleware `/login` redirect loop with malformed/expired cookies** | `proxy.ts` treated any cookie string as an authenticated citizen, bouncing `/login` to `/dashboard` without verifying cryptographic validity or expiration, causing redirect loops on stale sessions. | Implemented `isValidCitizenSession()` token verification in `proxy.ts` that purges stale cookies and performs server-side profile completion lookup before redirecting. |

---

## 3. Comprehensive File Modification Inventory

### Backend & Schema
1. **`src/lib/server/pg-db.ts`**:
   - Added `profile_completed boolean DEFAULT false` to the `profiles` table schema in `initSchema`.
2. **`supabase/migrations/003_supabase_auth_rls.sql`**:
   - Added `profile_completed boolean DEFAULT false` column to public `profiles`.
3. **`src/lib/server/embedded-migrations.ts`**:
   - Regenerated embedded migrations containing the new schema column.
4. **`src/lib/server/db.ts`**:
   - Updated `updateUserProfileField` to persist `profile_completed` and set `profile_status` ('READY' vs 'INCOMPLETE') on the `profiles` table.
   - Included synthetic `profile_completed` field in `getUserProfileFields`.
5. **`src/lib/server/auth.ts`**:
   - Updated `getAuthenticatedCitizenUser` to query `full_name`, `phone`, `phone_verified`, and `profile_completed` from `profiles` and attach them to `citizenUser`.
6. **`src/app/api/profile/route.ts`**:
   - Added `syncProfileToSupabase` support for `profile_completed` and `profile_status: 'READY'`.
   - Explicitly returns `completed: isComplete` and `currentStep` on GET and PATCH.
7. **`src/app/api/dashboard/route.ts`**:
   - Returns `profile.completed = onboardingStatus.isComplete` based on real database records.
8. **`src/app/api/auth/login/route.ts`**:
   - Computes onboarding status on login and returns `{ completed, redirectTo: isComplete ? "/dashboard" : "/onboarding/profile" }`.
9. **`src/app/api/auth/register/route.ts`**:
   - Returns `{ completed: false, redirectTo: "/onboarding/profile" }`.
10. **`src/app/api/agent/autofill/route.ts`**:
    - Line 431: Removed hardcoded fallback `"Hyderabad"`.
    - Guaranteed zero mock PII fallbacks across `GET`, `AUTOFILL`, and `MAP_FIELDS`.
11. **`src/proxy.ts`**:
    - Added `isValidCitizenSession` cryptographic token and expiry validation.
    - Purges invalid/stale session cookies.
    - Post-login redirect routes incomplete users to `/onboarding/profile` and completed users to `/dashboard`.

### Frontend & State Management
12. **`src/lib/store/formly-store.tsx`**:
    - `login()`: Respects `data.redirectTo` and routes incomplete users to `/onboarding/profile`.
    - `signup()`: Routes to `/onboarding/profile`.
    - `logout()`: Dispatches `SEVA_SAARTHI_LOGOUT` on `window` and `document` and purges active profile storage.
13. **`src/components/auth/CitizenAuthView.tsx`**:
    - Active session guard checks `/api/profile`: redirects completed users to `/dashboard` and incomplete users to `/onboarding/profile`.
    - `handleLoginSubmit` navigates to `result.redirectTo || "/dashboard"`.
    - `handleSignupSubmit` navigates to `/onboarding/profile`.
14. **`src/components/auth/PhoneOtpFlow.tsx`**:
    - Added `onChangePhone` callback prop to keep phone state synced with parent forms in real-time.
15. **`src/app/(citizen)/onboarding/profile/page.tsx`**:
    - Added input fields and state for Father's Name (`father_name`) and Mother's Name (`mother_name`) in Step 1.
    - Added `onChangePhone` handler and unverified phone progression resilience.
    - Guard on mount to redirect completed users to `/dashboard` unless `?edit=true`.
    - Persists `profile_completed: "true"` upon completing Step 4.
16. **`src/components/profile/ProfilePage.tsx`**:
    - Strict 401 handling redirects to `/login`.
    - Direct `localFields` state hydration prevents flash of empty state while global store synchronizes.
    - When `data.completed === false`, redirects to `/onboarding/profile`.
    - When `data.completed === true`, stays on `/profile` and sets `pageState: "READY"`. Never bounces to `/dashboard`.
17. **`src/app/(citizen)/page.tsx` (`HomePage` / `/dashboard`)**:
    - Guards `/dashboard`: If `!data.profile?.completed`, redirects to `/onboarding/profile`.

### Browser Extension
18. **`extension/sidepanel.js`**:
    - Removed 65-line `DEFAULT_CITIZEN_PROFILE`.
    - Added `credentials: "include"` to `fetchRemoteProfile()`.
    - Proactive remote validation on `loadProfile()` detects 401 unauthenticated status and resets state.
    - Displays "Not Logged In" and prompts web app login if unauthenticated.
19. **`extension/content.js`**:
    - Removed all string fallbacks ("Sai Sankeerth", "Suresh Kumar", "Laxmi Devi", "15/08/2001", "5492 8173 9012") in `buildUnifiedValues()`.
20. **`extension/background.js`**:
    - Namespaced profile storage in `background.js` under `profile:${userId}`.
    - Added `CLEAR_PROFILE_DATA` handler to wipe all `profile:*` keys from local and session storage on logout.
21. **`extension/webapp-bridge.js`**:
    - Listens for `SEVA_SAARTHI_LOGOUT` and notifies background script to execute `CLEAR_PROFILE_DATA`.
22. **`extension/sidepanel.html`**:
    - Replaced hardcoded "Sai Sankeerth" with neutral "Citizen Profile" placeholder.
23. **`dist/seva-saarthi-extension-v2.2.0.zip` & `dist/seva-saarthi-extension.zip`**:
    - Repackaged extension distribution archives.

### Automated Testing Suite
24. **`scripts/test-profile-autofill-flow.mjs`**:
    - Added Section 8: anti-spoofing query/body bypass test.
    - Added Section 9: onboarding progression with unverified phone.

---

## 4. Verification Record

### Actual Test Suite Execution Results

| Test Command | Purpose | Result | Details |
|---|---|---|---|
| `npm run typecheck` | TypeScript Strict Static Typing | **PASS (0 errors)** | Full codebase clean without type violations |
| `npm test` | Government Orchestration Pipeline | **PASS (100%)** | All cross-system validation and audit log tests passed |
| `npm run test:autofill` | Autofill Security & Domain Guard | **PASS (8/8)** | Unauth 401 guards, 52 canonical fields, field mapping |
| `npm run test:isolation` | Multi-User Isolation & Session | **PASS (100%)** | User A and User B mutual isolation verified |
| `npm run test:profile-flow` | End-to-End Onboarding & Autofill | **PASS (100%)** | Unauth 401s, 4-step wizard, User A !== User B autofill |
| `npm run build` | Next.js 16 Production Build | **PASS (0 errors)** | 80/80 routes compiled statically and dynamically |

### Multi-User Isolation Proof (Extract from `test:profile-flow`)
```
✓ User A full_name ('Aarav Sharma') !== User B full_name ('Priya Patel')
✓ User A father ('Mahesh Sharma') !== User B father ('Kishore Patel')
✓ User A mother ('Sunita Sharma') !== User B mother ('Meena Patel')
✓ User A district ('Medchal-Malkajgiri') !== User B district ('Bengaluru Urban')
✓ User A pincode ('501301') !== User B pincode ('560034')
✓ ZERO cross-contamination or shared mock data detected!
✓ MAP_FIELDS correctly returned User A's values for User A's session
✓ MAP_FIELDS correctly returned User B's values for User B's session
```

---

## 5. Production Deployment Status

- **Repository Branch:** `origin/main` & `sih/main` (Latest commit: `7208612`)
- **Live Vercel Production Links:**
  - **Live Production URL:** [https://seva-saarthi-five.vercel.app](https://seva-saarthi-five.vercel.app)
  - **Custom Production Domain:** [https://seva-saarthi.vercel.app](https://seva-saarthi.vercel.app)
- **Live Runtime Playwright Verification:** **PASS (100% clean, 0 console errors)**
  - Unauthenticated root (`/`) &rarr; `/login` verified.
  - Citizen login (`user@gmail.com` / `password123`) &rarr; `/onboarding/profile` verified.
  - Direct navigation to `/profile` loads citizen profile and stays on `/profile` without redirecting.
  - Documents page (`/documents`) & Settings page (`/settings`) verified.
  - Government Officer flow (`officer@gmail.com` / `1234567890`) &rarr; `/gov/dashboard`, `/gov/queue`, `/gov/settings` verified.
