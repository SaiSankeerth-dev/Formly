# Service Registry — Baseline Inventory

**Baseline Date:** September 2026  
**Catalog Authority:** Seva Saarthi Service Registry (`src/lib/registry/verified-service-registry.ts`)

---

## 1. Registry Architecture

The service registry differentiates between:
- **`DIRECT_APPLICATION`**: Direct form/submission URL on the official government portal where citizen field entry and document upload take place.
- **`OFFICIAL_ENTRY`**: Portal home or landing page requiring citizen navigation or manual authentication before reaching application workflows.

Every service must specify approved official domains to protect citizens against phishing and unauthorized redirects.

---

## 2. Configured Services

| Service ID | Service Name | Authority | Official Domain | URL Type | Official Application URL | Support Level | Live Connectivity Verified |
|---|---|---|---|---|---|:---:|:---:|
| `pan-application-protean` | New PAN Card Application (Form 49A) | Income Tax Department / Protean (NSDL) | `onlineservices.proteantech.in` | `DIRECT_APPLICATION` | `https://onlineservices.proteantech.in/paam/endUserRegisterContact.html` | PRODUCTION | **YES (HTTP 200)** |
| `s001` | Post Matric Scholarship | Ministry of Electronics & IT / NSP | `scholarships.gov.in` | `DIRECT_APPLICATION` | `https://scholarships.gov.in` | PRODUCTION | PARTIAL (Entry Portal Reachable) |
| `telangana-epass` | Telangana ePASS Post-Matric Scholarship | Department of Social Welfare, Telangana | `telanganaepass.cgg.gov.in` | `DIRECT_APPLICATION` | `https://telanganaepass.cgg.gov.in/` | SANDBOX | PARTIAL |
| `meeseva-income` | MeeSeva Income Certificate | Revenue Department, Telangana / AP | `ts.meeseva.telangana.gov.in` | `OFFICIAL_ENTRY` | `https://ts.meeseva.telangana.gov.in/` | SANDBOX | UNVERIFIED |
| `meeseva-caste` | MeeSeva Integrated Caste Certificate | Revenue Department, Telangana / AP | `ts.meeseva.telangana.gov.in` | `OFFICIAL_ENTRY` | `https://ts.meeseva.telangana.gov.in/` | SANDBOX | UNVERIFIED |
| `meeseva-residence` | MeeSeva Residence Certificate | Revenue Department, Telangana / AP | `ts.meeseva.telangana.gov.in` | `OFFICIAL_ENTRY` | `https://ts.meeseva.telangana.gov.in/` | SANDBOX | UNVERIFIED |

---

## 3. Official Domain Guard

The official domain guard (`src/lib/registry/official-domain-guard.ts`) verifies URLs against strict security criteria:
1. Protocol must be strictly `https:`.
2. Host must match approved sovereign `.gov.in`, `.nic.in`, or designated technical operator domains (e.g. `onlineservices.proteantech.in`).
3. Private IP addresses (`127.0.0.1`, `10.*`, `192.168.*`, `172.16-31.*`) and arbitrary public domains are strictly rejected.
