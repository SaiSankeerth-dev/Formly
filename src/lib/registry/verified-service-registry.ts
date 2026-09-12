import { SupportLevel } from "@/lib/portal/contracts";

export interface VerifiedService {
  serviceId: string;
  serviceName: string;
  aliases: string[];
  category: string;
  authority: string;
  officialDomain: string;
  officialDomains: string[];
  officialApplicationUrl: string;
  officialInformationUrl: string;
  urlType: "DIRECT_APPLICATION" | "OFFICIAL_ENTRY";
  eligibility: string;
  requiredDocuments: string[];
  applicationSteps: string[];
  fieldDefinitions: string[];
  documentRules: string[];
  paymentInformation: string;
  sensitiveSteps: string[];
  supportLevel: SupportLevel;
  lastVerifiedAt: string;
  verificationNotes: string;
}

export const VERIFIED_SERVICES: readonly VerifiedService[] = [
  {
    serviceId: "s001",
    serviceName: "Post Matric Scholarship",
    aliases: [
      "post matric scholarship",
      "scholarship",
      "nsp",
      "scholarships.gov.in",
      "national scholarship portal",
      "s001"
    ],
    category: "Higher Education & Scholarships",
    authority: "Ministry of Electronics and Information Technology / GoI",
    officialDomain: "scholarships.gov.in",
    officialDomains: [
      "scholarships.gov.in",
      "services.india.gov.in"
    ],
    officialApplicationUrl: "https://scholarships.gov.in",
    officialInformationUrl: "https://scholarships.gov.in",
    urlType: "DIRECT_APPLICATION",
    eligibility: "Post-secondary students in recognized institutions.",
    requiredDocuments: [
      "Aadhaar Card",
      "Income Certificate",
      "College ID",
      "Bonafide Certificate",
      "Marksheet",
      "Bank Passbook"
    ],
    applicationSteps: [
      "One-Time Registration (OTR)",
      "Application Submission",
      "Institute Verification (INO)",
      "State Verification (SNO)",
      "DBT Disbursement via PFMS"
    ],
    fieldDefinitions: [
      "full_name",
      "date_of_birth",
      "gender",
      "phone_number",
      "email",
      "aadhaar_number",
      "annual_income",
      "caste_category",
      "college_name",
      "education_degree",
      "roll_number",
      "bank_account_no",
      "bank_ifsc"
    ],
    documentRules: [
      "Income certificate valid for current FY",
      "Bonafide certificate on institution letterhead",
      "Bank account must be seeded with NPCI Aadhaar mapper"
    ],
    paymentInformation: "Free",
    sensitiveSteps: [
      "OTP",
      "CAPTCHA",
      "Declaration",
      "Final submission"
    ],
    supportLevel: "FULL_ASSIST",
    lastVerifiedAt: "2026-09-11",
    verificationNotes: "National Scholarship Portal official gateway."
  },
  {
    "serviceId": "pan-application-protean",
    "serviceName": "New PAN application (Protean)",
    "aliases": [
      "pan",
      "pan card",
      "apply for pan",
      "new pan"
    ],
    "category": "Identity",
    "authority": "Income Tax Department / Protean",
    "officialDomain": "onlineservices.proteantech.in",
    "officialDomains": [
      "onlineservices.proteantech.in"
    ],
    "officialApplicationUrl": "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
    "officialInformationUrl": "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
    "urlType": "DIRECT_APPLICATION",
    "eligibility": "The official portal determines eligibility.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Official portal shows fee.",
    "sensitiveSteps": [
      "OTP",
      "Payment",
      "Declaration",
      "Final submission"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": "Official PAN provider."
  },
  {
    "serviceId": "pan-application-utiitsl",
    "serviceName": "PAN Application (UTIITSL)",
    "aliases": [
      "pan",
      "utiitsl pan"
    ],
    "category": "Identity",
    "authority": "Income Tax Department / UTIITSL",
    "officialDomain": "www.pan.utiitsl.com",
    "officialDomains": [
      "www.pan.utiitsl.com",
      "pan.utiitsl.com"
    ],
    "officialApplicationUrl": "https://www.pan.utiitsl.com/",
    "officialInformationUrl": "https://www.pan.utiitsl.com/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Official portal handles rules.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Official portal shows fee.",
    "sensitiveSteps": [
      "OTP",
      "Payment",
      "Final submission"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": "Official PAN provider."
  },
  {
    "serviceId": "instant-epan",
    "serviceName": "Instant e-PAN",
    "aliases": [
      "e-pan",
      "income tax epan"
    ],
    "category": "Identity",
    "authority": "Income Tax Department",
    "officialDomain": "www.incometax.gov.in",
    "officialDomains": [
      "www.incometax.gov.in",
      "incometax.gov.in"
    ],
    "officialApplicationUrl": "https://www.incometax.gov.in/iec/foportal/",
    "officialInformationUrl": "https://www.incometax.gov.in/iec/foportal/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Must have Aadhaar",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Free",
    "sensitiveSteps": [
      "OTP"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "aadhaar-services",
    "serviceName": "Aadhaar Services",
    "aliases": [
      "aadhaar",
      "uidai",
      "my aadhaar",
      "update aadhaar"
    ],
    "category": "Identity",
    "authority": "UIDAI",
    "officialDomain": "myaadhaar.uidai.gov.in",
    "officialDomains": [
      "myaadhaar.uidai.gov.in",
      "uidai.gov.in",
      "www.uidai.gov.in"
    ],
    "officialApplicationUrl": "https://myaadhaar.uidai.gov.in/",
    "officialInformationUrl": "https://www.uidai.gov.in/en/my-aadhaar",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Indian residents.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "See portal for fees.",
    "sensitiveSteps": [
      "OTP",
      "Payment"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "voter-services",
    "serviceName": "Voter Registration",
    "aliases": [
      "voter",
      "epic",
      "election",
      "voter id"
    ],
    "category": "Identity",
    "authority": "Election Commission of India",
    "officialDomain": "voters.eci.gov.in",
    "officialDomains": [
      "voters.eci.gov.in",
      "eci.gov.in"
    ],
    "officialApplicationUrl": "https://voters.eci.gov.in/",
    "officialInformationUrl": "https://voters.eci.gov.in/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Indian citizens 18+.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Free",
    "sensitiveSteps": [
      "OTP"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "passport-seva",
    "serviceName": "Passport Services",
    "aliases": [
      "passport",
      "passport seva"
    ],
    "category": "Identity",
    "authority": "Ministry of External Affairs",
    "officialDomain": "www.passportindia.gov.in",
    "officialDomains": [
      "www.passportindia.gov.in",
      "services1.passportindia.gov.in",
      "passportindia.gov.in"
    ],
    "officialApplicationUrl": "https://services1.passportindia.gov.in/",
    "officialInformationUrl": "https://www.passportindia.gov.in/",
    "urlType": "DIRECT_APPLICATION",
    "eligibility": "Indian citizens.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Portal shows fees.",
    "sensitiveSteps": [
      "OTP",
      "Payment",
      "Appointment"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "driving-licence",
    "serviceName": "Driving Licence",
    "aliases": [
      "dl",
      "driving licence",
      "sarathi",
      "parivahan"
    ],
    "category": "Transport",
    "authority": "Ministry of Road Transport and Highways",
    "officialDomain": "sarathi.parivahan.gov.in",
    "officialDomains": [
      "sarathi.parivahan.gov.in",
      "parivahan.gov.in"
    ],
    "officialApplicationUrl": "https://sarathi.parivahan.gov.in/",
    "officialInformationUrl": "https://sarathi.parivahan.gov.in/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Varies by state.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Portal shows fees.",
    "sensitiveSteps": [
      "OTP",
      "Payment",
      "Slot booking"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "service-plus",
    "serviceName": "ServicePlus (State Services)",
    "aliases": [
      "serviceplus"
    ],
    "category": "Other Government Services",
    "authority": "NIC",
    "officialDomain": "serviceonline.gov.in",
    "officialDomains": [
      "serviceonline.gov.in"
    ],
    "officialApplicationUrl": "https://serviceonline.gov.in/",
    "officialInformationUrl": "https://serviceonline.gov.in/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Varies.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Varies.",
    "sensitiveSteps": [
      "OTP",
      "Payment"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "digilocker",
    "serviceName": "DigiLocker",
    "aliases": [
      "digilocker",
      "digital locker"
    ],
    "category": "Identity",
    "authority": "MeitY",
    "officialDomain": "www.digilocker.gov.in",
    "officialDomains": [
      "www.digilocker.gov.in",
      "digilocker.gov.in"
    ],
    "officialApplicationUrl": "https://www.digilocker.gov.in/",
    "officialInformationUrl": "https://www.digilocker.gov.in/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Indian residents.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Free",
    "sensitiveSteps": [
      "OTP"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "telangana-income-certificate",
    "serviceName": "Income Certificate",
    "aliases": [
      "income",
      "income certificate",
      "telangana income"
    ],
    "category": "Certificates",
    "authority": "Government of Telangana",
    "officialDomain": "www.telangana.gov.in",
    "officialDomains": [
      "telangana.gov.in",
      "www.telangana.gov.in",
      "ts.meeseva.telangana.gov.in"
    ],
    "officialApplicationUrl": "https://www.telangana.gov.in/services/state-services/",
    "officialInformationUrl": "https://www.telangana.gov.in/services/state-services/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Telangana residents.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Portal shows fees.",
    "sensitiveSteps": [
      "OTP",
      "Payment"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "telangana-caste-certificate",
    "serviceName": "Caste Certificate",
    "aliases": [
      "caste",
      "caste certificate",
      "telangana caste"
    ],
    "category": "Certificates",
    "authority": "Government of Telangana",
    "officialDomain": "www.telangana.gov.in",
    "officialDomains": [
      "telangana.gov.in",
      "www.telangana.gov.in",
      "ts.meeseva.telangana.gov.in"
    ],
    "officialApplicationUrl": "https://www.telangana.gov.in/services/state-services/",
    "officialInformationUrl": "https://www.telangana.gov.in/services/state-services/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Telangana residents.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Portal shows fees.",
    "sensitiveSteps": [
      "OTP",
      "Payment"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  },
  {
    "serviceId": "telangana-scholarships",
    "serviceName": "Scholarships (ePASS)",
    "aliases": [
      "scholarship",
      "epass",
      "telangana scholarship"
    ],
    "category": "Education",
    "authority": "Government of Telangana",
    "officialDomain": "telanganaepass.cgg.gov.in",
    "officialDomains": [
      "telanganaepass.cgg.gov.in",
      "cgg.gov.in"
    ],
    "officialApplicationUrl": "https://telanganaepass.cgg.gov.in/",
    "officialInformationUrl": "https://telanganaepass.cgg.gov.in/",
    "urlType": "OFFICIAL_ENTRY",
    "eligibility": "Eligible students.",
    "requiredDocuments": [],
    "applicationSteps": [],
    "fieldDefinitions": [],
    "documentRules": [],
    "paymentInformation": "Free",
    "sensitiveSteps": [
      "OTP",
      "Biometric"
    ],
    "supportLevel": "GUIDED",
    "lastVerifiedAt": "2026-09-11",
    "verificationNotes": ""
  }
];

export function findVerifiedServices(query: string): VerifiedService[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...VERIFIED_SERVICES];
  return VERIFIED_SERVICES.filter((service) => 
    terms.some((term) => [service.serviceName, service.category, service.authority, ...service.aliases].join(" ").toLowerCase().includes(term))
  );
}
export function verifiedServiceById(serviceId: string): VerifiedService | undefined {
  if (!serviceId) return undefined;
  const idLower = serviceId.trim().toLowerCase();
  return VERIFIED_SERVICES.find(
    (service) =>
      service.serviceId.toLowerCase() === idLower ||
      service.aliases.some((a) => a.toLowerCase() === idLower) ||
      (idLower === "s001" && (service.serviceId === "s001" || service.officialDomain === "scholarships.gov.in"))
  );
}
