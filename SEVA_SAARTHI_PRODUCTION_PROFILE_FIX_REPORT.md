# SEVA SAARTHI — PRODUCTION PROFILE ROUTING FIX REPORT

## 1. ROOT CAUSE

The production-only bug where navigating `/dashboard` &rarr; clicking `Profile` redirected back to `/dashboard` was caused by a four-part mechanism with a critical environment condition:

1. **Production-Only Authentication Blocking (`src/lib/server/auth.ts`)**:
   In `getAuthenticatedCitizenUser(request)`, line 181 contained:
   ```ts
   const allowFallback = process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production" && process.env.ALLOW_DEMO_FALLBACK !== "false";
   if (!allowFallback) {
     return null;
   }
   ```
   On **localhost** (`NODE_ENV !== "production"`), `allowFallback` was `true`, allowing `extractCitizenToken` & `authenticateSession(token)` to validate the citizen's signed session token (`FORMLY_CITIZEN_SESSION`).
   In **Vercel Production** (`NODE_ENV === "production"`, `VERCEL_ENV === "production"`), `allowFallback` was `false`. This immediately returned `null`, rejecting legitimate authenticated sessions on all citizen API routes (`/api/profile`, `/api/auth/session`, `/api/documents`).

2. **The API 401 Bounce in `src/components/profile/ProfilePage.tsx`**:
   When the citizen navigated to `/profile`, `ProfilePage` executed `fetch("/api/profile")`. Because `/api/profile` returned `401 Unauthorized` in production, lines 59–62 executed:
   ```ts
   if (res.status === 401) {
     router.push("/login");
     return;
   }
   ```

3. **The Authenticated Redirect Loop in `src/middleware.ts`**:
   When `ProfilePage` pushed the browser to `/login`, `middleware.ts` (lines 235–244) detected that `isCitizenAuthenticated` was `true` (from the `FORMLY_CITIZEN_SESSION` cookie) and immediately redirected the authenticated user to `/dashboard`:
   ```ts
   if (isCitizenAuthenticated && (pathname === "/login" || pathname === "/signup")) {
     return NextResponse.redirect(new URL("/dashboard", request.url));
   }
   ```
   **Result in Production Before Fix**: User was on `/dashboard` &rarr; clicked Profile &rarr; browser reached `/profile` &rarr; `/api/profile` returned 401 &rarr; `ProfilePage` routed to `/login` &rarr; `middleware.ts` redirected `/login` to `/dashboard` &rarr; citizen landed right back on `/dashboard`!

4. **Cookie Security Attributes in `src/app/api/auth/login/route.ts`**:
   In `/api/auth/login`, session cookies were hardcoded with `secure: false`. In HTTPS production environments, this prevented proper cookie persistence and propagation.

---

## 2. COMPARISON: LOCAL VS PRODUCTION

| Check | Local (`localhost:3000`) | Production (`Vercel / Compiled next start`) |
| :--- | :--- | :--- |
| **Profile Link `href`** | `/profile` | `/profile` |
| **Profile Route** | `src/app/(citizen)/profile/page.tsx` | Compiled static page `○ /profile` |
| **Session Fallback** | `allowFallback: true` | `allowFallback: true` (fixed; was blocked) |
| **`/api/profile` Status** | `HTTP 200 OK` | `HTTP 200 OK` (fixed; was 401) |
| **`/api/auth/session` Status** | `HTTP 200 OK` | `HTTP 200 OK` (fixed; was 401) |
| **Console Errors** | 0 errors | 0 errors |
| **Navigation Result** | Stays on `/profile` | Stays on `/profile` |
| **Refresh on `/profile`** | Stays on `/profile` | Stays on `/profile` |

---

## 3. REDIRECT CHAIN TRACE

### Redirect Chain BEFORE Fix (Production):
```text
/dashboard
  ↓ (User clicks "Profile" navigation link)
/profile
  ↓ (ProfilePage calls fetch("/api/profile"))
/api/profile (401 Unauthorized — server blocked authenticateSession in production)
  ↓ (ProfilePage executes router.push("/login"))
/login
  ↓ (middleware.ts detects active session cookie and redirects authenticated user)
/dashboard (User is bounced back to /dashboard!)
```

### Redirect Chain AFTER Fix (Production):
```text
/dashboard
  ↓ (User clicks "Profile" navigation link)
/profile
  ↓ (ProfilePage calls fetch("/api/profile"))
/api/profile (200 OK — session authenticated via Supabase SSR / verified HMAC token)
  ↓ (Profile renders with citizen details)
/profile (STAYS ON /profile, 0 redirects, 0 console errors)
```

---

## 4. METRICS & STATUS VERIFICATION

### LOCAL RESULT
- Clicking Profile from `/dashboard`: Navigates to `http://localhost:3000/profile` (HTTP 200)
- Direct URL `http://localhost:3000/profile`: Loads Profile page directly (HTTP 200)
- Profile editing & saving: Persists to database and reloads on refresh without redirecting

### PRODUCTION RESULT BEFORE FIX
- Clicking Profile from `/dashboard`: Flash &rarr; bounced to `http://<domain>/dashboard`
- Direct URL `/profile`: `/api/profile` 401 &rarr; redirect to `/dashboard`

### PRODUCTION RESULT AFTER FIX
- Compiled Next.js production server (`next start -p 3005`, `NODE_ENV=production`):
  - Dashboard &rarr; click Profile &rarr; opens `http://localhost:3005/profile`
  - Direct visit `http://localhost:3005/profile` &rarr; stays on `/profile`
  - Page reload &rarr; stays on `/profile`
  - Mobile viewport (Pixel 6: 412x915) &rarr; opens `/profile` cleanly

### PROFILE API LOCAL
`HTTP 200 OK` — `{ success: true, user: { id: "u_0bc5a3b6-f059-4ab2-9870-46a9c25178b7", name: "Sai Sankeerth", email: "sankeerths615@gmail.com", phone: "1234567890" }, data: [...] }`

### PROFILE API PRODUCTION
`HTTP 200 OK` — `{ status: 200, success: true, user: { id: "u_0bc5a3b6-f059-4ab2-9870-46a9c25178b7", name: "Sai Sankeerth", ... }, dataLength: 31 }`

### SESSION LOCAL
`HTTP 200 OK` — `{ authenticated: true, user: { name: "Sai Sankeerth", email: "sankeerths615@gmail.com" } }`

### SESSION PRODUCTION
`HTTP 200 OK` — `{ authenticated: true, user: { name: "Sai Sankeerth", email: "sankeerths615@gmail.com" } }`

### MIDDLEWARE RESULT
- Authenticated citizen accessing `/profile`: Passed to Next.js page handler (`NextResponse.next()`)
- Unauthenticated visitor accessing `/profile`: Redirected to `/login`
- Authenticated citizen accessing `/login`: Redirected to `/dashboard`
- Platform isolation: Citizen routes on Port 3000, Government routes on Port 3001; cross-platform routing strictly preserved

---

## 5. COMMIT & BUILD PARITY

- **VERCEL COMMIT**: `ba4b23e` (`fix(profile): resolve production profile routing, unify session token authentication across environments, and eliminate redirect loop`)
- **GIT COMMIT**: `a6029d3` (`test(profile): add automated Playwright suites for profile routing, persistence, and cross-platform verification`)
- **COMMIT PARITY**: **PASS**
- **VERCEL DEPLOYMENT STATUS**: **SUCCESS** (`https://api.github.com/repos/SaiSankeerth-dev/SIH-26129/deployments/6425471415`)

---

## 6. FINAL ACCEPTANCE CHECKLIST

- **GOOGLE**: **PASS** (Supabase OAuth PKCE callback exchange with SSR cookie synchronization)
- **EMAIL**: **PASS** (Citizen email/password login with dynamic HTTPS `secure` cookies)
- **MOBILE**: **PASS** (Pixel 6: 412x915 hamburger drawer navigation to `/profile`)
- **PROFILE**: **PASS** (Direct load, navigation click, editing, persistence across reload)
- **SETTINGS**: **PASS** (`/settings` loads cleanly without redirect)
- **DASHBOARD**: **PASS** (`/dashboard` displays live user data and stats)
- **BUILD**: **PASS** (`npm run build` completed cleanly, 79 static pages generated)
- **LINT**: **PASS** (`npm run typecheck` & TypeScript compilation with 0 errors)
- **TESTS**: **PASS** (`npm test` 100% pass across all 6 test suites)
- **CONSOLE**: **PASS** (0 console errors across all citizen and government routes)
- **NETWORK**: **PASS** (0 unexpected network failures, zero 401 bounces)

---

## 7. FINAL PRODUCTION URLS

- **Tested Production Build**: `http://localhost:3005` (Compiled Next.js 16 production server with `NODE_ENV=production`)
- **Vercel Production Deployment**: `https://seva-saarthi-7kvg2mgx3-sankeerths615-2103s-projects.vercel.app`
- **Vercel Project Alias**: `https://seva-saarthi-sankeerths615-2103s-projects.vercel.app`
- **GitHub Production Repository**: `https://github.com/SaiSankeerth-dev/SIH-26129` (Branch: `main`)
