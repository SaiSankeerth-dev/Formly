import { User, Phone, MapPin, GraduationCap, Banknote, Landmark, Sparkles } from "lucide-react";
import { ProfileField } from "@/types";

export interface ProfileFieldDefinition {
  fieldName: string;
  label: string;
  placeholder: string;
  type?: string;
  category: "PERSONAL" | "CONTACT" | "ADDRESS" | "EDUCATION" | "OTHER" | "IDENTITY" | "INCOME" | "BANKING";
  isKeyField?: boolean;
  options?: string[];
}

export const CANONICAL_PROFILE_FIELDS: ProfileFieldDefinition[] = [
  // 1. Personal Information (Section 17)
  { fieldName: "full_name", label: "Full Name (as per Aadhaar/10th)", placeholder: "Enter your full legal name", category: "PERSONAL", isKeyField: true },
  { fieldName: "father_name", label: "Father's / Guardian's Full Name", placeholder: "Enter father's or guardian's full name", category: "PERSONAL" },
  { fieldName: "mother_name", label: "Mother's Full Name", placeholder: "Enter mother's full name", category: "PERSONAL" },
  { fieldName: "date_of_birth", label: "Date of Birth", placeholder: "YYYY-MM-DD", type: "date", category: "PERSONAL", isKeyField: true },
  { fieldName: "gender", label: "Gender", placeholder: "Male / Female / Other", category: "PERSONAL", isKeyField: true, options: ["Male", "Female", "Other"] },
  { fieldName: "aadhaar_number", label: "Aadhaar Number (12-digit UID)", placeholder: "12-digit Aadhaar UID", category: "PERSONAL", isKeyField: true },

  // 2. Contact (Section 17)
  { fieldName: "phone_number", label: "Primary Mobile Number (Aadhaar Linked)", placeholder: "10-digit mobile number", category: "CONTACT" },
  { fieldName: "email", label: "Primary Email Address", placeholder: "name@example.com", category: "CONTACT" },

  // 3. Address (Section 17)
  { fieldName: "location", label: "Current City & State", placeholder: "City, State", category: "ADDRESS", isKeyField: true },
  { fieldName: "district", label: "District", placeholder: "e.g. Hyderabad / Ranga Reddy", category: "ADDRESS", isKeyField: true },
  { fieldName: "mandal", label: "Mandal / Tahsil", placeholder: "e.g. Serilingampally / Gandipet", category: "ADDRESS", isKeyField: true },
  { fieldName: "village", label: "Village / Ward / Locality", placeholder: "e.g. Gachibowli / Madhapur", category: "ADDRESS" },
  { fieldName: "permanent_address", label: "Permanent Address & Pincode", placeholder: "House No, Street, Landmark, Pincode", category: "ADDRESS" },

  // 4. Education (Section 17)
  { fieldName: "college_name", label: "College / University Name", placeholder: "College / University name", category: "EDUCATION", isKeyField: true },
  { fieldName: "education_degree", label: "Course / Degree & Branch", placeholder: "Course / Degree name", category: "EDUCATION", isKeyField: true },
  { fieldName: "current_year", label: "Current Year / Semester of Study", placeholder: "e.g. 3rd Year / 5th Sem", category: "EDUCATION" },
  { fieldName: "roll_number", label: "Roll / Hall Ticket / Registration Number", placeholder: "e.g. 22071A0589", category: "EDUCATION" },
  { fieldName: "tenth_percentage", label: "Class 10 (SSC) Percentage / GPA", placeholder: "e.g. 92.4% or 9.5 GPA", category: "EDUCATION" },
  { fieldName: "twelfth_percentage", label: "Class 12 / Intermediate Percentage / Marks", placeholder: "e.g. 88.6% or 886/1000", category: "EDUCATION" },

  // 5. Other reusable application information (Section 17)
  { fieldName: "annual_income", label: "Annual Family Household Income (₹)", placeholder: "e.g. 180000", type: "number", category: "OTHER", isKeyField: true },
  { fieldName: "income_cert_no", label: "Income Certificate Application / Certificate No", placeholder: "e.g. IC01240982312", category: "OTHER" },
  { fieldName: "caste_category", label: "Caste / Social Category", placeholder: "General / OBC / SC / ST / EWS", category: "OTHER", options: ["General", "OBC", "SC", "ST", "EWS"] },
  { fieldName: "sub_caste", label: "Sub-Caste / Community Name", placeholder: "e.g. Yadava, Kapu, Reddy, Brahmin, Mala, Madiga", category: "OTHER" },
  { fieldName: "minority_status", label: "Religious Minority Status", placeholder: "No / Muslim / Christian / Sikh / Jain / Buddhist", category: "OTHER", options: ["No", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Parsi"] },
  { fieldName: "disability_status", label: "Differently Abled / PwD Status", placeholder: "No / Yes (40%+ disability)", category: "OTHER", options: ["No", "Yes (40%+ disability)", "Yes (Less than 40%)"] },
  { fieldName: "bank_name", label: "Bank Name & Branch", placeholder: "e.g. State Bank of India", category: "OTHER" },
  { fieldName: "bank_account_no", label: "Bank Savings Account Number", placeholder: "11 to 16 digit bank account number", category: "OTHER", isKeyField: true },
  { fieldName: "bank_ifsc", label: "Bank IFSC Code", placeholder: "11-character IFSC (e.g. SBIN0001234)", category: "OTHER", isKeyField: true },
  { fieldName: "account_holder_name", label: "Account Holder Name (Must match Aadhaar)", placeholder: "Name as per bank passbook", category: "OTHER" },
  { fieldName: "dbt_seeding_status", label: "Aadhaar-NPCI DBT Seeding Status", placeholder: "Seeded (Active) / Linked", category: "OTHER", options: ["Seeded (Active)", "Linked", "Not Seeded"] },
];

export const PROFILE_CATEGORIES = [
  { key: "PERSONAL" as const, title: "Personal Information", icon: User, iconBg: "bg-indigo-50 text-indigo-600" },
  { key: "CONTACT" as const, title: "Contact", icon: Phone, iconBg: "bg-blue-50 text-blue-600" },
  { key: "ADDRESS" as const, title: "Address", icon: MapPin, iconBg: "bg-emerald-50 text-emerald-600" },
  { key: "EDUCATION" as const, title: "Education", icon: GraduationCap, iconBg: "bg-purple-50 text-purple-600" },
  { key: "OTHER" as const, title: "Other reusable application information", icon: Sparkles, iconBg: "bg-amber-50 text-amber-600" },
];

export function computeProfileStrength(profileFields: ProfileField[]): number {
  const keyFields = CANONICAL_PROFILE_FIELDS.filter((f) => f.isKeyField);
  if (keyFields.length === 0) return 0;

  const filledCount = keyFields.filter((kf) => {
    const field = profileFields.find((pf) => pf.field_name === kf.fieldName);
    return field && field.value && field.value.trim().length > 0;
  }).length;

  return Math.round((filledCount / keyFields.length) * 100);
}

export function getProfileCompleteness(profileFields: ProfileField[]) {
  const total = CANONICAL_PROFILE_FIELDS.length;
  const filledCount = CANONICAL_PROFILE_FIELDS.filter((cf) => {
    const field = profileFields.find((pf) => pf.field_name === cf.fieldName);
    return field && field.value && field.value.trim().length > 0;
  }).length;

  const emptyCount = Math.max(0, total - filledCount);
  const strength = computeProfileStrength(profileFields);

  return {
    total,
    filledCount,
    emptyCount,
    strength,
    isComplete: emptyCount === 0,
  };
}

export function checkOnboardingStatus(
  fields: ProfileField[],
  user?: { email?: string; phone?: string; phoneVerified?: boolean; phone_verified?: boolean }
) {
  const map: Record<string, string> = {};
  if (Array.isArray(fields)) {
    for (const f of fields) {
      if (f.field_name && f.value && f.value.trim()) {
        map[f.field_name] = f.value.trim();
      }
    }
  }

  const effectivePhone = map.phone_number || map.mobile || user?.phone;
  const effectiveEmail = map.email || user?.email;
  const isPhoneVerified = Boolean(
    map.phone_verified === "true" ||
    map.phone_verified === "1" ||
    user?.phoneVerified ||
    user?.phone_verified
  );

  const isStep1 = Boolean(map.full_name && map.date_of_birth && map.gender);
  const isStep2 = Boolean(effectivePhone && effectiveEmail);
  const isStep3 = Boolean(
    (map.state || map.location) &&
      map.district &&
      (map.permanent_address || map.address || map.pincode)
  );
  const isStep4 = Boolean(map.occupation || map.education_degree || map.caste_category);

  let currentStep = 1;
  if (!isStep1) currentStep = 1;
  else if (!isStep2) currentStep = 2;
  else if (!isStep3) currentStep = 3;
  else if (!isStep4) currentStep = 4;
  else currentStep = 4;

  const isComplete = Boolean(
    (isStep1 && isStep2 && isStep3 && isStep4) ||
    map.profile_completed === "true" ||
    (user as any)?.profile_completed === true ||
    (user as any)?.profileCompleted === true
  );
  return {
    isStep1,
    isStep2,
    isStep3,
    isStep4,
    currentStep: isComplete ? 4 : currentStep,
    isComplete,
    isPhoneVerified,
    profileMap: map,
  };
}

