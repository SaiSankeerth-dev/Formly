# Seva Saarthi real-portal implementation report

Date: 2026-09-11

## Phase 0: repository assessment

**VERIFIED** — The prior active project was a Next.js application with local JSON-oriented workflows, an MV3 extension, local profile/document state, and extensive retired application-tracking and authority-workflow routes. It contained demo-oriented registry, result, and workflow code. The extension had broad host access and was not limited to an exact domain registry.

## 1. Removed from fake or demo runtime

**VERIFIED** — Retired provider-specific registries, agent, type, test, migration path, report, popup, and broad domain registry were removed. The middleware now returns `410` for retired API paths and routes non-portal product pages to Discover, preventing local workflow records from being presented as an authority response.

## 2. Real government-service infrastructure

**VERIFIED** — `src/lib/registry/verified-service-registry.ts` is a small verified registry. Each record has service identity, authority, exact official domain, official application and information URLs, support level, review date, and verification note. There are no invented field definitions or document constraints.

## 3. Browser-extension architecture

**VERIFIED** — The MV3 extension has a background domain guard, page analyzer, policy engine, deterministic content executor, and side panel. Its only current host permission is the exact reviewed official portal domain.

## 4. Real page understanding

**VERIFIED (code), UNVERIFIED (live portal)** — The analyzer derives a normalized page model from visible labels, associations, ARIA metadata, controls, options, file controls, visible validation messages, semantic context, and stability-triggered rescans. It does not treat page text as instructions.

## 5. Form filling

**PARTIAL** — `FILL_FIELD`, `SELECT_OPTION`, and `CHECK_BOX` are structured, validated deterministic actions. The extension will not act on password, OTP, hidden, or file inputs, and it has no model-to-JavaScript path. Real citizen profile mapping has not been connected because a secure authenticated profile store is not yet present.

## 6. Document preparation

**PARTIAL** — Existing repository document-analysis components remain available, but no portal-specific requirement or upload acceptance is claimed. The extension reads upload controls and instructs the citizen to select a file in the native official portal picker; it never reports an upload accepted without portal evidence.

## 7. Security architecture

**VERIFIED (implemented boundaries)** — Exact-domain allowlisting, HTTPS-only checks, least-privilege extension host access, structured-action allowlisting, sensitive-control denial, route retirement, and page-content-as-data handling are implemented. **PLANNED** — production authenticated storage, encryption-at-rest key management, CSRF, rate limiting, server audit persistence, and extension/backend session authentication.

## 8. Sensitive-action boundaries

**VERIFIED** — Login, OTP, CAPTCHA, payment, declaration, file selection, and final submission pause the agent and remain citizen actions. No acknowledgement number or government result is generated.

## 9. Service registry

**VERIFIED** — One deliberately narrow service record exists: Aadhaar address update through the myAadhaar entry point. Its support level is `GUIDED`, not `FULL_ASSIST`.

## 10. Official-domain verification

**VERIFIED** — The web app and extension require an exact HTTPS hostname match for `myaadhaar.uidai.gov.in`; redirects or other domains are paused as unverified.

## 11. Real service actually tested

**PARTIAL** — The public UIDAI information page and official entry URL were reviewed on 2026-09-11. The authenticated service was not tested.

## 12–16. Live fields, document requirements, upload, and next page

**UNVERIFIED** — No citizen credentials, real document, consent, or official sandbox were supplied. Therefore no authenticated page was analyzed, no live fields were mapped, no document constraint was handled, no upload result was observed, and no next-page transition was tested.

## 17. Known limitations

**VERIFIED** — Only one `GUIDED` service is in the registry. There is no production encrypted citizen vault or authenticated backend session persistence. The extension has not been loaded against a live authenticated portal in this implementation run.

## 18. Unsupported situations

**VERIFIED** — Unknown domains, redirects outside the registry, CAPTCHA, OTP, payment, declarations, final submission, unrecognized file requirements, and unknown portal structures are paused rather than simulated.

## 19–21. Tests

**VERIFIED** — `node --check` passed for all extension JavaScript; `npx tsc --noEmit --incremental false` passed; elevated `npm run build` passed. No tests failed. The initial sandboxed build reached TypeScript then encountered Windows `spawn EPERM`; the elevated repeat completed successfully.

## 22. Anything still simulated

**VERIFIED** — Nothing in the active Discover/API/extension path simulates a government result, application identifier, portal submission, payment, or upload acceptance. Retired local application routes are blocked by middleware.

## 23. Anything still unverified

**UNVERIFIED** — All authenticated portal behavior, real citizen data access, document preparation/upload acceptance, page transitions, and final portal result detection.
