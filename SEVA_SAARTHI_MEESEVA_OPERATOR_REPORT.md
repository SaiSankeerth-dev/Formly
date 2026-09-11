# Seva Saarthi — Digital MeeSeva AI Assistant Architecture & Implementation Report

> **Core Value Proposition**:
> *"Tell Seva Saarthi what you need. It teaches and assists you through the official government process until you finish the application yourself."*
>
> Seva Saarthi does not seek to become another redundant MeeSeva portal or impersonate a government authority. Instead, it replaces the **assistance work a human MeeSeva operator performs**, empowering every citizen to complete legitimate official government applications themselves for free, guided step-by-step by specialized government AI.

---

## 1. Executive Summary & Architectural Distinction

In traditional government service delivery, citizens are forced to visit commercial MeeSeva centers or private cyber cafes, paying ₹150 to ₹1,500 in arbitrary operator "convenience" and "assistance" fees merely to navigate confusing portals, format documents to 200 KB, decipher legal terminology, and prevent technical rejections.

```text
TRADITIONAL CITIZEN EXPERIENCE:
Search Google ➔ Unofficial Scam Sites ➔ Complex Terminology ➔ File Size Errors (2MB > 200KB)
➔ Form Mistakes ➔ Rejection ➔ Pay Private Operator ₹300-₹1500 for Assistance

SEVA SAARTHI DIGITAL MEESEVA OPERATOR:
"I need an income certificate for college scholarship"
                     ↓
         SEVA SAARTHI AI ASSISTANT
  (Teaches, Prepares Docs, Guides Field-by-Field, Validates)
                     ↓
       CITIZEN EXECUTES DIRECTLY (100% Free Assistance)
                     ↓
          OFFICIAL GOVERNMENT PORTAL
      (MeeSeva / Protean / Parivahan / Dharani)
```

### The Architectural Guidance Layer
Seva Saarthi serves as the specialized **AI guidance layer** hovering above official government channels without attempting to own or duplicate government databases:

```text
                       SEVA SAARTHI
               (Digital MeeSeva AI Assistant)
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
 1. Discover             2. Guide                3. Validate
  & Eligibility        Field-by-Field          & Prepare Docs
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             │
            OFFICIAL GOVERNMENT SERVICE CHANNELS
           /                 |                 \
     Telangana MeeSeva   Protean / NSDL   Parivahan Sarathi
      (tg.meeseva.gov.in) (onlineservices.nsdl) (sarathi.parivahan)
```

---

## 2. Multi-Department Service Knowledge Registry

A centralized, strictly typed knowledge registry was implemented at `src/lib/knowledge/meeseva-service-registry.ts` and `src/types/meeseva.ts`, spanning all 9 statutory categories:

| Category | Service Name | Code | Issuing Authority | Official Portal Domain | Statutory Fee |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Identity** | Instant e-PAN & Form 49A Application | `PAN-49A` | Income Tax Department (Protean / UTIITSL) | `onlineservices.nsdl.com` | ₹107 (Physical) / Free (Digital) |
| **Certificates** | Annual Household Income Certificate | `REV-INC` | Revenue Department (Tahsildar / MRO, MeeSeva) | `tg.meeseva.gov.in` | ₹45 |
| **Certificates** | Integrated Caste & Community Certificate | `REV-CASTE` | Revenue Department (Tahsildar / RDO) | `tg.meeseva.gov.in` | ₹45 |
| **Welfare** | PM-Kisan Samman Nidhi Scheme Registration | `WEL-PMKISAN` | Dept of Agriculture & Farmers Welfare | `pmkisan.gov.in` | Free (₹0) |
| **Land/Revenue** | Agricultural Land Mutation & e-Pattadar Passbook | `LAND-MUT` | Registration & Revenue (Telangana Dharani) | `dharani.telangana.gov.in` | ₹2,500 + ₹300 delivery |
| **Civil Supplies** | Food Security (Ration) Card Member Addition | `CIV-FSC` | Dept of Food & Civil Supplies (EPDS / MeeSeva) | `epds.telangana.gov.in` | ₹35 |
| **Transport** | Learner's Licence (LLR) Contactless Application | `TRANS-LLR` | MoRTH / Parivahan Sarathi / Telangana RTA | `sarathi.parivahan.gov.in` | ₹350 |
| **Municipal** | Municipal New Trade Licence / Renewal | `MUN-TRADE` | Greater Hyderabad Municipal Corp (GHMC) | `cr.ghmc.gov.in` | Variable (₹1,500 base) |
| **Employment** | Telangana Employment Exchange Registration | `EMP-REG` | Dept of Employment and Training, Telangana | `employment.telangana.gov.in` | Free (₹0) |
| **Business** | Udyam MSME Business Registration | `BIZ-UDYAM` | Ministry of MSME, Govt of India | `udyamregistration.gov.in` | Free (₹0) |

Every service is modeled using the structured definition schema:
```typescript
export interface StructuredGovernmentService {
  id: string;
  service: string;
  shortCode: string;
  category: ServiceCategory;
  authority: string;
  applicationRoute: string;
  officialPortalName: string;
  portalDomain: string;
  officialLinks: { label: string; url: string; domain: string; purpose: string }[];
  description: string;
  eligibility: EligibilityCriterion[];
  requiredDocuments: ServiceDocumentRequirement[];
  fields: ServiceFieldDefinition[];
  photoRules: { required: boolean; maxSizeBytes: number; dimensions: string; background: string; allowedFormats: string[]; operatorGuidance: string };
  signatureRules: { required: boolean; maxSizeBytes: number; dimensions: string; inkColor: string; allowedFormats: string[]; operatorGuidance: string };
  fileRules: { defaultMaxSizeBytes: number; safetyTargetBytes: number; compressionAllowed: boolean; ocrVerificationEnabled: boolean };
  fees: ServiceFeeStructure;
  steps: ServiceProcessStep[];
  validationRules: ServiceValidationRule[];
  commonErrors: { error: string; prevention: string }[];
}
```

---

## 3. The 8 Specialized MeeSeva AI Operator Agents

Implemented in `src/lib/agents/meeseva-agents.ts`, each agent recreates a discrete human operator skill:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        SEVA SAARTHI AI AGENT MESH                      │
├────────────────────────┬───────────────────────┬───────────────────────┤
│ 1. Service Finder      │ 2. Eligibility Guide  │ 3. Requirement Agent  │
│ Understands natural    │ Checks criteria &     │ Audits required docs  │
│ citizen requests       │ identifies missing    │ & procurement steps   │
├────────────────────────┼───────────────────────┼───────────────────────┤
│ 4. Form Guide          │ 5. Document Agent     │ 6. Validation Agent   │
│ Field-by-field tips;   │ Auto-compresses with  │ Detects mismatches &  │
│ never invents answers  │ 90% safety margin     │ pre-submission errors │
├────────────────────────┴───────────────────────┼───────────────────────┤
│ 7. Submission Guide                            │ 8. Payment Guide      │
│ Walks official portal submission & ack slip    │ Anti-scam advisories &│
│ preservation                                   │ treasury fee breakdown│
└────────────────────────────────────────────────┴───────────────────────┘
```

### Agent 1: Service Finder (`ServiceFinderAgent`)
- Resolves colloquial requests (`"I need proof of my income"`, `"how do I get farmer pension"`, `"lost my driving licence"`) into formal statutory services.
- Uses token-overlap, whole-phrase matching, and category synonym maps with word-boundary regular expressions (`\b...\b`) to avoid substring false positives (e.g. distinguishing `registration` from `ration`).
- Features disambiguation rules to avoid cross-domain collisions (e.g. preventing `income tax pan` from overshadowing `income certificate`).

### Agent 2: Eligibility Guide (`EligibilityGuideAgent`)
- Evaluates citizen profiles against statutory preconditions.
- Flags incomplete evaluations as `NEEDS_MORE_INFO`, presenting pending questions with selectable options.
- Flags disqualifying conditions (e.g. existing PAN, outside revenue mandal, non-cultivable land) as `NOT_ELIGIBLE` with actionable explanations.

### Agent 3: Requirement Agent (`RequirementAgent`)
- Audits the citizen's Document Vault against statutory attachments.
- Classifies documents into `READY`, `OPTIMIZATION_NEEDED` (e.g., 2.5 MB file for a 200 KB limit), or `MISSING`.
- Formulates a step-by-step procurement plan with issuing authorities and typical turnaround times.

### Agent 4: Form Guide (`FormGuideAgent`)
- Provides field-by-field guidance without inventing citizen answers.
- Recreates the exact spoken dialogue of a senior MeeSeva operator (e.g. `"Enter your name strictly in the exact spelling shown on your Aadhaar card. Do not expand initials unless Aadhaar shows the expanded name"`).
- Runs client-side regex format verification.
- Inserts **Citizen Control Zone** boundary notices for sensitive credentials (Aadhaar number, OTPs, Passwords).

### Agent 5: Document Agent (`DocumentAgent`)
- Connects directly to Formly's smart document preparation pipeline (`src/lib/documents/*`).
- Detects oversized scans (e.g., 2 MB or 10 MB camera uploads) and calculates target sizes with the **90% safety margin factor** (e.g., 200 KB ceiling ➔ 180 KB target).
- Enforces dimension bounds (e.g., min 300x400 px), aspect ratios, and evaluates readability scores (0-100).

### Agent 6: Validation Agent (`ValidationAgent`)
- Pre-submission gatekeeper preventing official portal rejections.
- Performs mandatory field presence checks, regex format audits, mandatory document attachment checks, and file size boundary checks.
- Produces a comprehensive validation report with `PASS`, `WARNING`, and `ERROR` tallies, accompanied by a 4-point operator final checklist.

### Agent 7: Submission Guide (`SubmissionGuideAgent`)
- Directs the citizen to the verified official government portal URL (e.g., `https://tg.meeseva.gov.in`).
- Instructs the citizen on reviewing final preview screens, ticking statutory declaration checkboxes, and clicking the final submit button.
- Details how to capture and preserve the **Acknowledgement Slip / Application Token Number** (`INC012600XXXX`) and explains the 7-to-14 day Tahsildar / VRO inquiry workflow.

### Agent 8: Payment Guide (`PaymentGuideAgent`)
- Details official government treasury fees (e.g., ₹45 for MeeSeva income certificate, ₹107 for PAN, ₹0 for Udyam).
- Issues prominent **Anti-Intermediary Advisories**:
  > *"IMPORTANT ADVISORY: Seva Saarthi provides 100% free assistance. Official fees go directly to the Government Treasury payment gateway. Never pay private operators convenience charges."*
- Explains cyber treasury challan reconciliation and accepted payment modes (UPI, NetBanking, Debit Card).

---

## 4. Interactive Field-by-Field Browser Guidance Interface

Implemented at `src/components/assistant/MeeSevaAssistantPage.tsx` and routed via `src/app/(citizen)/assistant/page.tsx`:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ GOV PORTAL SIMULATION (Left 7 Cols)   │ SEVA SAARTHI AI (Right 5 Cols) │
├───────────────────────────────────────┼────────────────────────────────┤
│ Field 3 of 5:                         │ 🤖 Seva Saarthi Operator       │
│ Full Name (as per Aadhaar) *          │                                │
│ [ VEMULAWADA SAI SANKEERTH          ] │ "✓ Looks good! Full Name       │
│                                       │  matches expected government   │
│ Date of Birth *                       │  pattern standards."           │
│ [ 1999-04-15                        ] │                                │
│                                       │ 💡 Operator Practical Rule:    │
│ Father's Full Name *                  │ "Government PAN cards print    │
│ [ Vemulawada Ramana                 ] │  your father's name by default │
│                                       │  under Section 139A."          │
│ [← Prev Field]         [Next Field →] │                                │
│                                       │ [Run Pre-Submission Check →]   │
└───────────────────────────────────────┴────────────────────────────────┘
```

The user interface features 5 integrated operational tabs:
1. **Assisted Walkthrough**: Real-time side-by-side browser guidance with progress bars, sensitive boundary banners, and instant field advice.
2. **Pre-Submission Validator**: Comprehensive health check before opening the government portal.
3. **Smart Doc Agent**: Interactive file size simulator testing 2 MB, 10 MB scans, 90% margin auto-compression, and photo/signature dimension rules.
4. **Official Fee & Treasury Guide**: Transparent breakdown of official fees with cyber treasury instructions.
5. **All Services Catalog**: Instant filtering across all 9 statutory categories with direct launch actions.

---

## 5. Strict 3-Tier Boundary Enforcement Engine

Implemented in `src/lib/agents/boundary-enforcer.ts`, this engine cryptographically and programmatically enforces division of responsibility across three non-overlapping tiers:

```text
       ┌─────────────────────────────────────────────────────────────┐
       │             3-TIER STRICT BOUNDARY SEPARATION               │
       ├─────────────────────────────────────────────────────────────┤
       │ 1. ASSISTANT TIER (Seva Saarthi AI)                         │
       │    • Teach, explain, guide, prepare, validate, suggest      │
       │    • STRICTLY PROHIBITED: Autonomous submit, executing      │
       │      payments, claiming statutory approval authority        │
       ├─────────────────────────────────────────────────────────────┤
       │ 2. CITIZEN TIER (Citizen Control Zone)                      │
       │    • Sensitive data entry (Aadhaar OTP, passwords)          │
       │    • Legal declarations & consent signatures                │
       │    • Payment gateway authorization & final click to submit  │
       ├─────────────────────────────────────────────────────────────┤
       │ 3. GOVERNMENT AUTHORITY TIER (MeeSeva / Department)         │
       │    • Field inquiry & demographic cross-matching             │
       │    • Tahsildar / RTO / Civil Supplies statutory review      │
       │    • Official digital certificate issuance & signing        │
       └─────────────────────────────────────────────────────────────┘
```

### Programmatic Guard Tests
- `evaluateAction({ actionType: "AI_AUTONOMOUS_SUBMIT", initiatedBy: "AI_ASSISTANT" })` ➔ **BLOCKED** (`isPermitted: false`)
- `evaluateAction({ actionType: "AI_EXECUTE_PAYMENT", initiatedBy: "AI_ASSISTANT" })` ➔ **BLOCKED** (`isPermitted: false`)
- `evaluateAction({ actionType: "AI_STATUTORY_APPROVAL", initiatedBy: "AI_ASSISTANT" })` ➔ **BLOCKED** (`isPermitted: false`)
- Citizen actions (`CITIZEN_FINAL_SUBMIT`, `CITIZEN_AUTHORIZE_PAYMENT`) ➔ **PERMITTED** (`tier: "CITIZEN_TIER"`)
- Officer actions (`OFFICER_FIELD_INSPECTION`, `OFFICER_STATUTORY_DECISION`) ➔ **PERMITTED** (`tier: "GOVERNMENT_AUTHORITY_TIER"`)

---

## 6. Verification & Automated Test Results

The implementation was validated across 6 distinct automated test suites with 100% pass rates:

### 1. Dedicated Digital MeeSeva Test Suite (`scripts/test-meeseva-assistant.mjs`)
```text
========================================================
   SEVA SAARTHI — DIGITAL MEESEVA OPERATOR TEST SUITE   
========================================================
--- Suite 1: Structured Service Registry Across 9 Categories ---
✓ Category 'Identity' has 1 service(s) configured
✓ Category 'Certificates' has 2 service(s) configured
✓ Category 'Welfare' has 1 service(s) configured
✓ Category 'Land/revenue' has 1 service(s) configured
✓ Category 'Civil supplies' has 1 service(s) configured
✓ Category 'Transport' has 1 service(s) configured
✓ Category 'Municipal' has 1 service(s) configured
✓ Category 'Employment' has 1 service(s) configured
✓ Category 'Business' has 1 service(s) configured
✓ All 10 services satisfy the complete structured definition schema

--- Suite 2: Agent 1 — Service Finder ---
✓ 'I need proof of my income' -> Annual Household Income Certificate (Score: 100%)
✓ 'I want to apply for a PAN card' -> Instant e-PAN & Form 49A Application (Score: 100%)
✓ 'driving licence learner test' -> Learner's Licence (LLR) Application (Score: 100%)
✓ 'food security ration card add member' -> Food Security (Ration) Card (Score: 100%)
✓ 'farmer crop assistance pm kisan' -> PM-Kisan Samman Nidhi Scheme (Score: 65%)
✓ 'agricultural land mutation dharani' -> Agricultural Land Mutation (Score: 100%)
✓ 'shop trade licence permit' -> Municipal New Trade Licence (Score: 100%)
✓ 'udyam msme business loan' -> Udyam MSME Business Registration (Score: 100%)

--- Suite 3: Agent 2 — Eligibility Guide ---
✓ Fully satisfied PAN criteria recognized as 100% ELIGIBLE
✓ Incomplete answers correctly flagged as NEEDS_MORE_INFO with 2 pending questions
✓ Disqualifying criteria correctly identified as NOT_ELIGIBLE

--- Suite 4: Agent 3 — Requirement Agent ---
✓ Empty vault flags all 3 mandatory income certificate documents as missing
✓ Complete vault documents verified as 100% ready for application
✓ Oversized vault document correctly flagged with OPTIMIZATION_NEEDED

--- Suite 5: Agent 4 — Form Guide ---
✓ Field 1 guidance delivers accurate MeeSeva operator tip without inventing answers
✓ Invalid Aadhaar format correctly rejected by regex rule
✓ Sensitive authentication field is wrapped in Citizen Control Zone boundary notice

--- Suite 6: Agent 5 — Document Agent ---
✓ 2 MB document targeted to 180 KB with 90% safety margin factor
✓ 150 KB document audited as 100% compliant and ready

--- Suite 7: Agent 6 — Validation Agent ---
✓ Pre-submission check correctly blocked submission with 7 fatal errors
✓ Valid submission approved with 4 final operator checklist confirmations

--- Suite 8: Agents 7 & 8 — Submission & Payment Guides ---
✓ Submission Guide provides official URL: https://tg.meeseva.gov.in
✓ Acknowledgement Slip guidance formatted for Application Number / Token ID
✓ Payment Guide provides transparent ₹45 MeeSeva statutory fee with anti-scam warning
✓ Free government service (PM-Kisan) enforces 100% free statutory advisory

--- Suite 9: Strict 3-Tier Boundary Enforcement Engine ---
✓ Guard strictly BLOCKS AI Assistant from autonomous submission
✓ Guard strictly BLOCKS AI Assistant from executing payments
✓ Guard strictly BLOCKS AI Assistant from claiming statutory approval authority
✓ Citizen action 'CITIZEN_FINAL_SUBMIT' confirmed within Citizen Control Zone
✓ Officer action 'OFFICER_FIELD_INSPECTION' confirmed within Government Authority Zone

========================================================
   ALL DIGITAL MEESEVA OPERATOR TESTS PASSED (100%)     
========================================================
```

### 2. Platform Separation & Port Isolation (`npm run test:separation`)
- Citizen Platform on Port 3000 strictly segregated from Government Platform on Port 3001.
- `/assistant` added to `citizenOnlyPages` in `src/middleware.ts` to ensure strict 403 blocking on Port 3001.
- Verified absence of cross-platform route leaks (`/gov`, `/my-queue`) in Citizen Sidebar.
- Result: **100% Passed**.

### 3. Smart Document Optimization (`npm run test:optimization`)
- Verified Section 28 canonical 200 KB rules, 90% safety margin factor (180 KB target), EXIF orientation handling, and stream compression.
- Result: **100% Passed**.

### 4. Government Orchestration Pipeline (`npm test`)
- Verified data mapper, monotonic IDs (`PAN-2026-0005`), physical pipeline dispatch, connector retries, and tamper-evident SHA-256 audit logs.
- Result: **100% Passed**.

### 5. Repair Verification (`npm run test:verification`)
- Verified RBAC, DPDP consent, anti-IDOR checks, append-only triggers, and operator desk actions.
- Result: **100% Passed**.

### 6. TypeScript Typecheck & Production Next.js Build
- `npm run typecheck`: **0 errors**.
- `npm run build`: Compiled 64 static and dynamic routes in Next.js App Router (Turbopack) with `/assistant` properly generated as a prerendered static page.

---

<!-- GOAL_COMPLETE -->
