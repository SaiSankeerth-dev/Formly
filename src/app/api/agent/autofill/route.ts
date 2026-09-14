import { NextResponse } from "next/server";
import { verifiedServiceById } from "@/lib/registry/verified-service-registry";
import { verifyOfficialUrl } from "@/lib/registry/official-domain-guard";
import { getAuthenticatedCitizenUser } from "@/lib/server/auth";
import { getUserProfileFields } from "@/lib/server/db";

interface CanonicalDef {
  key: string;
  synonyms: string[];
}

const CANONICAL_DEFINITIONS: CanonicalDef[] = [
  { key: 'account_holder_name', synonyms: ['account holder name', 'beneficiary bank name', 'name as per bank', 'name in bank passbook', 'bank account holder'] },
  { key: 'bank_account_no', synonyms: ['bank account number', 'bank account no', 'savings account number', 'account number', 'account no', 'bank a/c no', 'bank acc no', 'a/c no', 'acc no'] },
  { key: 'bank_ifsc', synonyms: ['bank ifsc code', 'bank ifsc', 'ifsc code', 'ifsc', 'rtgs neft ifsc'] },
  { key: 'bank_name', synonyms: ['bank name', 'name of bank'] },
  { key: 'father_first_name', synonyms: ['father first name', 'father fname', 'guardian first name'] },
  { key: 'father_last_name', synonyms: ['father last name', 'father surname', 'father lname', 'guardian last name'] },
  { key: 'father_name', synonyms: ['father full name', 'father name', 'father\'s name', 'guardian full name', 'guardian name', 'guardian\'s name', 'parent name', 'father'] },
  { key: 'mother_first_name', synonyms: ['mother first name', 'mother fname'] },
  { key: 'mother_last_name', synonyms: ['mother last name', 'mother surname', 'mother lname'] },
  { key: 'mother_name', synonyms: ['mother full name', 'mother name', 'mother\'s name', 'mother'] },
  { key: 'first_name', synonyms: ['first name', 'applicant first name', 'given name', 'fname'] },
  { key: 'last_name', synonyms: ['last name', 'surname', 'applicant last name', 'family name', 'lname'] },
  { key: 'middle_name', synonyms: ['middle name', 'mname', 'applicant middle name'] },
  { key: 'full_name', synonyms: ['full name', 'applicant full name', 'applicant name', 'candidate full name', 'candidate name', 'student full name', 'student name', 'beneficiary name', 'name of applicant', 'name of student', 'your name', 'name'] },
  { key: 'dob_day', synonyms: ['birth day', 'dob day', 'day of birth', 'bday day', 'date of birth day'] },
  { key: 'dob_month', synonyms: ['birth month', 'dob month', 'month of birth', 'bday month', 'date of birth month'] },
  { key: 'dob_year', synonyms: ['birth year', 'dob year', 'year of birth', 'bday year', 'date of birth year'] },
  { key: 'date_of_birth', synonyms: ['date of birth', 'birth date', 'applicant dob', 'dob', 'birthdate'] },
  { key: 'gender', synonyms: ['gender', 'sex'] },
  { key: 'mobile', synonyms: ['mobile number', 'mobile no', 'mobile', 'phone number', 'phone no', 'contact number', 'contact no', 'phone', 'cell phone'] },
  { key: 'email', synonyms: ['email address', 'email id', 'email', 'e mail', 'mail id'] },
  { key: 'aadhaar_number', synonyms: ['aadhaar number', 'aadhaar no', 'aadhaar card', 'aadhaar', 'aadhar number', 'aadhar no', 'aadhar card', 'aadhar', 'uid number', 'uid no', '12 digit aadhaar', 'uid'] },
  { key: 'pincode', synonyms: ['pin code', 'pincode', 'postal code', 'zip code', 'postal pin', 'area pin', 'pin'] },
  { key: 'district', synonyms: ['district name', 'district', 'dist name', 'dist'] },
  { key: 'mandal', synonyms: ['mandal name', 'mandal', 'tahsil', 'tehsil', 'taluk'] },
  { key: 'location', synonyms: ['city name', 'town name', 'location', 'city', 'town', 'place of residence'] },
  { key: 'permanent_address', synonyms: ['permanent address', 'residential address', 'communication address', 'street address', 'address line 1', 'address line', 'house address', 'permanent res address', 'address'] },
  { key: 'college_name', synonyms: ['college name', 'university name', 'institution name', 'institute name', 'name of institution', 'college', 'university', 'institution', 'institute', 'school name'] },
  { key: 'education_degree', synonyms: ['course name', 'degree name', 'branch name', 'course degree', 'degree course', 'qualification', 'course', 'degree', 'branch', 'program'] },
  { key: 'roll_number', synonyms: ['roll number', 'roll no', 'hall ticket number', 'hall ticket no', 'hall ticket', 'registration number', 'reg no', 'enrollment number', 'enrollment no', 'roll'] },
  { key: 'current_year', synonyms: ['current year', 'year of study', 'academic year', 'semester', 'current sem'] },
  { key: 'tenth_percentage', synonyms: ['10th percentage', '10th marks', 'class 10 marks', 'class 10', 'ssc marks', 'ssc percentage', 'matric percentage'] },
  { key: 'twelfth_percentage', synonyms: ['12th percentage', '12th marks', 'class 12 marks', 'class 12', 'intermediate marks', 'inter marks', 'hsc marks'] },
  { key: 'annual_income', synonyms: ['annual family income', 'annual income', 'family income', 'household income', 'total income', 'income'] },
  { key: 'caste_category', synonyms: ['social category', 'caste category', 'community category', 'category', 'caste', 'community', 'social class'] },
  { key: 'dbt_seeding_status', synonyms: ['dbt seeding', 'aadhaar seeding', 'npci status', 'npci mapping'] }
];

function buildCanonicalMapping(rawFields: { field_name: string; value: string }[], user?: any) {
  const map: Record<string, string> = {};
  for (const f of rawFields) {
    if (f.field_name && f.value) {
      map[f.field_name] = f.value;
    }
  }

  const fullName = map.full_name || user?.name || "";
  const mobile = map.phone_number || map.mobile || user?.phone || "";
  const email = map.email || user?.email || "";
  const dob = map.date_of_birth || "";
  const gender = map.gender || "";
  const aadhaar = map.aadhaar_number || "";
  const address = map.permanent_address || map.location || "";
  const pincode = map.pincode || "";

  // Disaggregate full name
  const nameParts = fullName ? fullName.trim().split(/\s+/) : [];
  const firstName = nameParts[0] || fullName || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

  // Disaggregate father name — no seeded fallback, empty if not provided
  const fatherName = map.father_name || map.guardian_name || "";
  const fParts = fatherName ? fatherName.trim().split(/\s+/) : [];
  const fatherFirstName = fParts[0] || fatherName || "";
  const fatherLastName = fParts.length > 1 ? fParts[fParts.length - 1] : "";

  // Disaggregate mother name
  const motherName = map.mother_name || "";
  const mParts = motherName ? motherName.trim().split(/\s+/) : [];
  const motherFirstName = mParts[0] || motherName;
  const motherLastName = mParts.length > 1 ? mParts[mParts.length - 1] : "";

  // DOB variations
  let dobFormatted = "";
  let dobDay = "";
  let dobMonth = "";
  let dobYear = "";
  if (dob.includes("-")) {
    const parts = dob.split("-");
    if (parts.length === 3) {
      dobYear = parts[0];
      dobMonth = parts[1];
      dobDay = parts[2];
      dobFormatted = `${dobDay}/${dobMonth}/${dobYear}`;
    }
  } else if (dob.includes("/")) {
    dobFormatted = dob;
    const parts = dob.split("/");
    if (parts.length === 3) {
      dobDay = parts[0];
      dobMonth = parts[1];
      dobYear = parts[2];
    }
  }

  // Aadhaar variations
  const aadhaarClean = aadhaar.replace(/\s+/g, "");
  const uidParts = aadhaar.split(/\s+/);
  const uid1 = uidParts[0] || aadhaarClean.slice(0, 4);
  const uid2 = uidParts[1] || aadhaarClean.slice(4, 8);
  const uid3 = uidParts[2] || aadhaarClean.slice(8, 12);

  const canonical: Record<string, string> = {
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    surname: lastName,
    middle_name: middleName,
    name: fullName,
    date_of_birth: dob,
    dob,
    dob_formatted: dobFormatted,
    dob_day: dobDay,
    dob_month: dobMonth,
    dob_year: dobYear,
    gender,
    mobile,
    phone_number: mobile,
    phone: mobile,
    email,
    aadhaar_number: aadhaar,
    aadhaar: aadhaar,
    aadhaar_clean: aadhaarClean,
    uid1,
    uid2,
    uid3,
    permanent_address: address,
    address,
    pincode,
    pin_code: pincode,
    father_name: fatherName,
    father_first_name: fatherFirstName,
    father_last_name: fatherLastName,
    mother_name: motherName,
    mother_first_name: motherFirstName,
    mother_last_name: motherLastName,
    annual_income: map.annual_income || "",
    income: map.annual_income || "",
    caste_category: map.caste_category || "",
    category: map.caste_category || "",
    college_name: map.college_name || "",
    education_degree: map.education_degree || "",
    roll_number: map.roll_number || "",
    current_year: map.current_year || "",
    tenth_percentage: map.tenth_percentage || "",
    twelfth_percentage: map.twelfth_percentage || "",
    bank_name: map.bank_name || "",
    bank_account_no: map.bank_account_no || "",
    bank_ifsc: map.bank_ifsc || "",
    account_holder_name: map.account_holder_name || fullName || "",
    district: map.district || "",
    mandal: map.mandal || "",
    location: map.location || "",
    city: map.location || "",
    dbt_seeding_status: map.dbt_seeding_status || "",
  };

  const applicant = {
    fullName: canonical.full_name,
    firstName: canonical.first_name,
    lastName: canonical.last_name,
    dob: canonical.date_of_birth,
    dobFormatted: canonical.dob_formatted,
    gender: canonical.gender,
    aadhaarNo: canonical.aadhaar_number,
    phone: canonical.mobile,
    email: canonical.email,
    address: canonical.permanent_address,
    pincode: canonical.pincode,
    annualIncome: canonical.annual_income,
    casteCategory: canonical.caste_category,
    collegeName: canonical.college_name,
    degree: canonical.education_degree,
    rollNo: canonical.roll_number,
    bankAccountNo: canonical.bank_account_no,
    bankIfsc: canonical.bank_ifsc,
    fatherName: canonical.father_name,
  };

  const safeFields = Object.keys(canonical);
  const blockedFields = ["password", "otp", "captcha", "cvv", "payment", "card_number", "mpin"];

  return { canonical, applicant, safeFields, blockedFields };
}

function matchInputToCanonical(inputName: string, inputLabel: string, inputPlaceholder: string): string | null {
  const rawCombined = [inputName, inputLabel, inputPlaceholder].filter(Boolean).join(" ");
  const normalized = rawCombined.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();

  let bestMatch: string | null = null;
  let bestScore = -1;

  for (const def of CANONICAL_DEFINITIONS) {
    for (const syn of def.synonyms) {
      const regex = new RegExp("(^|[^a-z0-9])" + syn + "([^a-z0-9]|$)", "i");
      if (regex.test(normalized)) {
        let score = syn.length * 10;
        if (normalized === syn) score += 500;

        // Disambiguate generic "name"
        if (syn === "name" && def.key === "full_name") {
          if (/(father|mother|college|university|institute|institution|bank|account|district|mandal|city|town|course|degree|branch|school)/i.test(normalized)) {
            continue;
          }
        }
        // Disambiguate "pin"
        if (syn === "pin" && def.key === "pincode") {
          if (/(atm|mpin|upi|secret|security|password)/i.test(normalized)) {
            continue;
          }
        }
        // Disambiguate "uid"
        if (syn === "uid" && def.key === "aadhaar_number") {
          if (/(guidance|liquid|fluid|guide)/i.test(normalized)) {
            continue;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = def.key;
        }
      }
    }
  }

  return bestMatch;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const serviceId = url.searchParams.get("serviceId") || "s001";
    const service = verifiedServiceById(serviceId);
    if (!service) {
      return NextResponse.json(
        { success: false, error: `Invalid service context: ${serviceId}` },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedCitizenUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to access citizen autofill profile." },
        { status: 401 }
      );
    }

    let profileFields: any[] = [];
    try {
      const dbFields = await getUserProfileFields(user.id);
      if (dbFields && dbFields.length > 0) {
        profileFields = dbFields as any;
      }
    } catch (dbErr) {
      console.warn("[Autofill GET] Error loading user profile fields:", dbErr);
    }

    const { canonical, applicant, safeFields, blockedFields } = buildCanonicalMapping(profileFields, user);

    return NextResponse.json({
      success: true,
      serviceId,
      serviceName: service.serviceName,
      officialDomain: service.officialDomain,
      applicationUrl: service.officialApplicationUrl,
      citizenProfile: {
        userId: user.id,
        fullName: canonical.full_name,
        dateOfBirth: canonical.date_of_birth,
        phone: canonical.mobile,
        email: canonical.email,
        gender: canonical.gender,
        fatherName: canonical.father_name,
        motherName: canonical.mother_name,
        aadhaarNumber: canonical.aadhaar_number,
        annualIncome: canonical.annual_income,
        collegeName: canonical.college_name,
        educationDegree: canonical.education_degree,
        bankName: canonical.bank_name,
        bankAccountNo: canonical.bank_account_no,
        bankIfsc: canonical.bank_ifsc,
      },
      data: {
        applicant,
        canonicalFields: canonical,
        safeFields,
        blockedFields,
      },
      canonicalFields: canonical,
      fields: profileFields.map((f: any) => ({
        fieldName: f.field_name,
        value: f.value,
        verified: f.verified,
        confidence: f.confidence,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load autofill data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedCitizenUser(request);
    const body = await request.json();
    const action = body.action || "GET_AUTOFILL_DATA";

    // 1. GET_AUTOFILL_DATA / AUTOFILL / GET_AUTOFILL_PAYLOAD
    if (
      action === "GET_AUTOFILL_DATA" ||
      action === "AUTOFILL" ||
      action === "GET_AUTOFILL_PAYLOAD"
    ) {
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Authentication required to access citizen autofill payload." },
          { status: 401 }
        );
      }

      // Authoritative: server DB is source of truth, client payload is never trusted as primary
      let fields: any[] = [];
      try {
        const dbFields = await getUserProfileFields(user.id);
        if (dbFields && Array.isArray(dbFields) && dbFields.length > 0) {
          fields = dbFields as any;
        }
      } catch {}
      // Only allow client fields if server has no data (explicitly empty) — still validated length-bounded
      if (fields.length === 0) {
        const clientFields = body.payload?.profileFields || body.profileFields;
        if (Array.isArray(clientFields) && clientFields.length > 0 && clientFields.length <= 100) {
          const sanitized = clientFields.filter((f: any) => f && typeof f.field_name === 'string' && typeof f.value === 'string' && f.value.length <= 500);
          if (sanitized.length > 0) fields = sanitized;
        }
      }

      const { canonical, applicant, safeFields, blockedFields } = buildCanonicalMapping(fields, user);

      return NextResponse.json({
        success: true,
        payload: {
          applicant,
          canonicalFields: canonical,
          safeFields,
          blockedFields,
        },
        canonicalFields: canonical,
        safeData: canonical,
      });
    }

    // 2. MAP_FIELDS - Live form field mapping
    if (action === "MAP_FIELDS") {
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Authentication required to perform form field mapping." },
          { status: 401 }
        );
      }

      let fields: any[] = [];
      try {
        const dbFields = await getUserProfileFields(user.id);
        if (dbFields && Array.isArray(dbFields) && dbFields.length > 0) {
          fields = dbFields as any;
        }
      } catch {}
      if (fields.length === 0) {
        const clientFields = body.payload?.profileFields || body.profileFields;
        if (Array.isArray(clientFields) && clientFields.length > 0 && clientFields.length <= 100) {
          const sanitized = clientFields.filter((f: any) => f && typeof f.field_name === 'string' && typeof f.value === 'string' && f.value.length <= 500);
          if (sanitized.length > 0) fields = sanitized;
        }
      }

      const { canonical } = buildCanonicalMapping(fields, user);
      const inputElements: any[] = body.payload?.fields || body.fields || body.formFields || body.payload?.formFields || [];

      const mappings = inputElements.map((elem) => {
        const id = elem.id || elem.elementId;
        const name = elem.name || elem.attributes?.name || "";
        const label = elem.label || "";
        const placeholder = elem.placeholder || elem.attributes?.placeholder || "";
        const type = (elem.type || "text").toLowerCase();

        // Check if sensitive
        const combinedText = `${name} ${label} ${placeholder}`;
        const isPostal = /\b(pin_?code|pincode|postal|zip|area_?pin)\b/i.test(combinedText);
        const isSensitive =
          ["password", "file", "hidden"].includes(type) ||
          (!isPostal && (/\b(password|passwd|otp|captcha|cvv|cvc|card_number|mpin|atm_pin|upi_pin)\b/i.test(combinedText) || /(atm|upi|secret|security|card|login)[-_ ]?pin\b/i.test(combinedText)));

        if (isSensitive) {
          return {
            elementId: id,
            canonicalField: null,
            label,
            value: null,
            confidence: 0,
            safeToFill: false,
            reason: "Sensitive element requires citizen entry.",
          };
        }

        const canonicalKey = matchInputToCanonical(name, label, placeholder);
        if (canonicalKey) {
          return {
            elementId: id,
            canonicalField: canonicalKey,
            label,
            value: canonical[canonicalKey] || null,
            confidence: 0.95,
            safeToFill: true,
          };
        }

        return {
          elementId: id,
          canonicalField: null,
          label,
          value: null,
          confidence: 0,
          safeToFill: false,
          reason: "No matching citizen profile field found.",
        };
      });

      const sensitiveCount = mappings.filter((m) => m.reason === "Sensitive element requires citizen entry.").length;
      return NextResponse.json({
        success: true,
        mappings,
        matchedCount: mappings.filter((m) => m.safeToFill).length,
        blockedCount: sensitiveCount,
        totalCount: mappings.length,
      });
    }

    // 3. START_AGENT - Extension handoff initialization
    if (action === "START_AGENT") {
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Authentication required to initiate browser agent handoff." },
          { status: 401 }
        );
      }

      const serviceId = body.payload?.serviceId || body.serviceId || "s001";
      const portalUrl = body.payload?.portalUrl || body.portalUrl || "https://scholarships.gov.in";
      const service = verifiedServiceById(serviceId);
      const domainCheck = verifyOfficialUrl(portalUrl);

      if (!domainCheck.allowed) {
        return NextResponse.json(
          { success: false, error: domainCheck.reason || "An official HTTPS government domain is required." },
          { status: 400 }
        );
      }

      let fields: any[] = [];
      try {
        const dbFields = await getUserProfileFields(user.id);
        if (dbFields && Array.isArray(dbFields) && dbFields.length > 0) {
          fields = dbFields as any;
        }
      } catch {}
      if (fields.length === 0) {
        const clientFields = body.payload?.profileFields;
        if (Array.isArray(clientFields) && clientFields.length > 0 && clientFields.length <= 100) {
          const sanitized = clientFields.filter((f: any) => f && typeof f.field_name === 'string' && typeof f.value === 'string' && f.value.length <= 500);
          if (sanitized.length > 0) fields = sanitized;
        }
      }

      const { canonical, applicant, safeFields, blockedFields } = buildCanonicalMapping(fields, user);

      return NextResponse.json({
        success: true,
        mode: "BROWSER_EXTENSION_HANDOFF",
        sessionId: crypto.randomUUID(),
        state: "READY_FOR_AUTOFILL",
        serviceId: service?.serviceId || serviceId,
        serviceName: service?.serviceName || "Post Matric Scholarship",
        officialDomain: domainCheck.normalizedDomain || service?.officialDomain || "scholarships.gov.in",
        portalUrl: portalUrl || service?.officialApplicationUrl,
        message: "Open the official portal and use the Seva Saarthi extension after signing in there yourself.",
        controls: ["LOGIN", "OTP", "CAPTCHA", "PAYMENT", "DECLARATION", "FINAL_SUBMIT"],
        autofillPayload: {
          applicant,
          canonicalFields: canonical,
          safeFields,
          blockedFields,
        },
        safeData: canonical,
      });
    }

    // 4. CONFIRM_SUBMIT - Safety boundary disclaimer (auth required)
    if (action === "CONFIRM_SUBMIT") {
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Authentication required to confirm submission." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          state: "WAITING_FOR_CITIZEN",
          error: "The backend never submits an application or creates an acknowledgement number. Use the real Submit button on the official portal.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, error: "Unknown agent action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Invalid agent request" },
      { status: 400 }
    );
  }
}
