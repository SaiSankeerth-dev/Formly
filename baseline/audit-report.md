# System Audit Baseline Report — Seva Saarthi & Sarkaar Seva

**Date of Audit Baseline:** September 2026  
**System Evaluated:** Seva Saarthi (Citizen Assistance Platform) & Sarkaar Seva (Government Workflow Platform)  
**Repository:** `SaiSankeerth-dev/Formly` (`d:\Ideathon`)  
**Evaluation Scores:**
- **Technical Reliability Score:** `42 / 100` (CRITICAL / HIGH RISK)
- **Real-World Readiness Score:** `18 / 100` (PROTOTYPE ONLY)

---

## 1. Executive Summary

A comprehensive architectural, security, and runtime audit was conducted across the Seva Saarthi and Sarkaar Seva codebase. While the platform demonstrates high visual polish and a sophisticated relational schema design (`supabase/migrations/002_formly_v2_unified_schema.sql` defining 42 tables, check constraints, state machine transitions, and append-only audit triggers), the underlying runtime architecture relies heavily on local in-memory/embedded fallbacks, unverified remote infrastructure, and several critical security vulnerabilities.

### Key Audit Facts Recorded
1. **Citizen Page Inventory:** Exactly 26 citizen page files discovered under `src/app/(citizen)/`.
2. **Government Page Inventory:** Exactly 14 canonical government page files discovered under `src/app/gov/` (with 16 duplicate/mirror pages in `src/app/government/`).
3. **API Route Handlers:** Exactly 44 API route handlers discovered under `src/app/api/`.
4. **Authoritative Runtime Database:** `@electric-sql/pglite` (in-memory/embedded PostgreSQL) is currently the verified runtime database.
5. **Supabase Database & Auth:** Supabase libraries (`@supabase/supabase-js`, `@supabase/ssr`) and migrations exist, but live production runtime connection is unverified and often bypassed in favor of PGlite.
6. **Google OAuth Integration:** Currently failed / unconfigured; missing production credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), falling back to mock or errors.
7. **Notifications Endpoint:** `GET /api/notifications` currently returns HTTP 500 due to passing text string IDs (e.g. `u_citizen_...`) to PostgreSQL UUID columns (`recipient_id uuid`).
8. **Browser Extension:** Chrome Manifest V3 extension in `extension/` has had script syntax errors and unverified execution against live government forms.
9. **PAN Portal Connectivity:** The official Protean PAN registration portal (`https://onlineservices.proteantech.in/paam/endUserRegisterContact.html`) is reachable via HTTP, but live browser extension injection and automated field mapping on the live portal remain unproven.

---

## 2. Priority Risk Ranking

| Priority | Vulnerability / Issue | Impact Area | Risk Level |
|---|---|---|---|
| **P0** | Unauthenticated `/api/agent/autofill` exposing static citizen profile | Data Privacy & Security | **CRITICAL** |
| **P0** | Government application creation accepting arbitrary client `userId` | Authorization & Data Integrity | **CRITICAL** |
| **P0** | Hardcoded fallback session signing secret in server code | Authentication Security | **CRITICAL** |
| **P0** | Broken extension scripts failing validation | Browser Automation Core | **CRITICAL** |
| **P1** | Local PGlite fallback masking lack of real Supabase runtime | Data Persistence & Multi-tenant | **HIGH** |
| **P1** | Public seeded tracking bypass in `/api/track/[id]` | Data Exposure | **HIGH** |
| **P1** | Notifications API failing with HTTP 500 on UUID cast | Core Citizen Functionality | **HIGH** |
| **P1** | Google OAuth not functional | Citizen Onboarding | **HIGH** |
| **P2** | Simulated / Mock OCR and AI pipelines returning static text | Automation Reliability | **MEDIUM** |
| **P2** | Duplicate `/gov` and `/government` routing trees | Maintainability & Attack Surface | **MEDIUM** |

---

## 3. Dependency-Ordered Execution Plan

To advance Seva Saarthi and Sarkaar Seva from prototype to verified production grade, work must proceed strictly in dependency order:

1. **Phase 0:** Freeze the Baseline (Audit, Route, API, Auth, Security, Service matrices).
2. **Phase 1:** Critical Security & Authentication (Autofill auth guard, server-derived ownership, fail-closed secrets, eliminate demo tracking bypass).
3. **Phase 2:** Authoritative Supabase Storage & RLS (Supabase single source of truth, RLS policy enforcement, eliminating competing local databases in production).
4. **Phase 3:** Citizen Core Functionality (Login, OAuth, profile onboarding wizard, dashboard, UUID-consistent notifications, lifecycle state model).
5. **Phase 4:** Citizen Service Discovery & Official URL Registry.
6. **Phase 5:** Browser Extension Repair (`node --check`, Manifest V3 compliance, scoped permissions).
7. **Phase 6:** Live Protean PAN Portal Extension Validation.
8. **Phase 7:** Multi-layer Safe Autofill Engine.
9. **Phase 8:** Document Automation Pipeline (Remove fake OCR success, hash-chained derived files).
10. **Phase 9:** Government Operations Portal Stabilization.
11. **Phase 10:** Government Authorization & Officer Assignment Enforcement.
12. **Phase 11:** Production AI Integration & Policy Guardrails.
13. **Phase 12:** Real-Time Push & Resilient Notifications.
14. **Phase 13:** Total Removal of Mock/Demo Fallbacks in Production.
15. **Phase 14:** Accessibility (WCAG 2.1 AA) & Multi-Breakpoint Responsive Audits.
16. **Phase 15:** Production Vercel & Supabase Deployment Validation.
17. **Phase 16:** End-to-End Multi-Role Verification.
18. **Phase 17:** Final Reality Audit.
