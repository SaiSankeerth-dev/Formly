(() => {
  const analyze = () => window.SevaPageAnalyzer?.analyze() || { fields: [] };

  // Protean & Indian Government portal direct identifier mappings
  const DIRECT_ID_MAPPINGS = {
    apptype: "app_type",
    cattype: "cat_type",
    title: "title",
    lastname: "last_name",
    firstname: "first_name",
    middlename: "middle_name",
    dob: "date_of_birth",
    email: "email",
    mobile: "mobile",
    chkconsent: "consent",
    txtapptype: "app_type",
    txtcattype: "cat_type",
    txttitle: "title",
    txtlastname: "last_name",
    txtfirstname: "first_name",
    txtmiddlename: "middle_name",
    txtdob: "date_of_birth",
    txtemail: "email",
    txtmobile: "mobile",
    applicant_name: "full_name",
    txtfullname: "full_name",
    fathername: "father_name",
    mothername: "mother_name",
    f_name_end: "first_name",
    m_name_end: "middle_name",
    l_name_end: "last_name",
    date_of_birth_reg: "date_of_birth",
    email_id2: "email",
    rvContactNo: "mobile",
    cat_applicant1: "cat_type",
    type: "app_type",
    requesttype: "app_type",
    rvpannum: "pan_number",
    consent: "consent",
    aadhaarno: "aadhaar_number",
    aadharno: "aadhaar_number",
  };

  // Canonical definitions with scored specificity matching
  const CANONICAL_DEFINITIONS = [
    { key: "account_holder_name", synonyms: ["account holder name", "beneficiary bank name", "name as per bank", "name in bank passbook", "bank account holder"] },
    { key: "bank_account_no", synonyms: ["bank account number", "bank account no", "savings account number", "account number", "account no", "bank a/c no", "bank acc no", "a/c no", "acc no", "txtaccount"] },
    { key: "bank_ifsc", synonyms: ["bank ifsc code", "bank ifsc", "ifsc code", "ifsc", "rtgs neft ifsc", "rtgs/neft ifsc", "txtifsc"] },
    { key: "bank_name", synonyms: ["bank name", "name of bank"] },
    { key: "father_first_name", synonyms: ["father first name", "father fname", "guardian first name"] },
    { key: "father_last_name", synonyms: ["father last name", "father surname", "father lname", "guardian last name"] },
    { key: "father_name", synonyms: ["father full name", "father name", "father's name", "guardian full name", "guardian name", "guardian's name", "parent name", "father", "fathername"] },
    { key: "mother_first_name", synonyms: ["mother first name", "mother fname"] },
    { key: "mother_last_name", synonyms: ["mother last name", "mother surname", "mother lname"] },
    { key: "mother_name", synonyms: ["mother full name", "mother name", "mother's name", "mother", "mothername"] },
    { key: "first_name", synonyms: ["first name", "firstname", "first_name", "applicant first name", "given name", "fname", "txtfname", "txtfirstname"] },
    { key: "last_name", synonyms: ["last name", "lastname", "last_name", "surname", "sur_name", "applicant last name", "family name", "lname", "txtlname", "txtlastname"] },
    { key: "middle_name", synonyms: ["middle name", "middlename", "middle_name", "mname", "txtmname", "txtmiddlename"] },
    { key: "full_name", synonyms: ["full name", "applicant full name", "applicant name", "candidate full name", "candidate name", "student full name", "student name", "beneficiary name", "name of applicant", "name of student", "your name", "txtfullname", "name"] },
    { key: "dob_day", synonyms: ["birth day", "dob day", "day of birth", "bday day", "date of birth day"] },
    { key: "dob_month", synonyms: ["birth month", "dob month", "month of birth", "bday month", "date of birth month"] },
    { key: "dob_year", synonyms: ["birth year", "dob year", "year of birth", "bday year", "date of birth year"] },
    { key: "date_of_birth", synonyms: ["date of birth", "birth date", "applicant dob", "dob", "birthdate", "txtdob"] },
    { key: "gender", synonyms: ["gender", "sex"] },
    { key: "mobile", synonyms: ["mobile number", "mobile no", "mobile", "phone number", "phone no", "contact number", "contact no", "phone", "cell phone", "txtmobile", "mobno"] },
    { key: "email", synonyms: ["email address", "email id", "email", "e-mail", "e mail", "mail id", "txtemail"] },
    { key: "aadhaar_number", synonyms: ["aadhaar number", "aadhaar no", "aadhaar card", "aadhaar", "aadhar number", "aadhar no", "aadhar card", "aadhar", "uid number", "uid no", "12 digit aadhaar", "aadhaarno", "aadharno", "txtaadhaar", "uid"] },
    { key: "pincode", synonyms: ["pin code", "pincode", "postal code", "zip code", "postal pin", "area pin", "txtpin", "pin"] },
    { key: "district", synonyms: ["district name", "district", "dist name", "dist"] },
    { key: "mandal", synonyms: ["mandal name", "mandal", "tahsil", "tehsil", "taluk"] },
    { key: "location", synonyms: ["city name", "town name", "location", "city", "town", "place of residence"] },
    { key: "permanent_address", synonyms: ["permanent address", "residential address", "communication address", "street address", "address line 1", "address line", "house address", "permanent res address", "address", "house no"] },
    { key: "college_name", synonyms: ["college name", "university name", "institution name", "institute name", "name of institution", "college", "university", "institution", "institute", "school name"] },
    { key: "education_degree", synonyms: ["course name", "degree name", "branch name", "course degree", "degree course", "qualification", "course", "degree", "branch", "program"] },
    { key: "roll_number", synonyms: ["roll number", "roll no", "hall ticket number", "hall ticket no", "hall ticket", "registration number", "reg no", "enrollment number", "enrollment no", "roll"] },
    { key: "current_year", synonyms: ["current year", "year of study", "academic year", "semester", "current sem"] },
    { key: "tenth_percentage", synonyms: ["10th percentage", "10th marks", "class 10 marks", "class 10", "ssc marks", "ssc percentage", "matric percentage"] },
    { key: "twelfth_percentage", synonyms: ["12th percentage", "12th marks", "class 12 marks", "class 12", "intermediate marks", "inter marks", "hsc marks"] },
    { key: "annual_income", synonyms: ["annual family income", "annual income", "family income", "household income", "total income", "income"] },
    { key: "caste_category", synonyms: ["social category", "caste category", "community category", "category", "caste", "community", "social class"] },
    { key: "dbt_seeding_status", synonyms: ["dbt seeding", "aadhaar seeding", "npci status", "npci mapping"] },
    { key: "title", synonyms: ["title", "salutation", "applicant title", "txttitle"] },
    { key: "app_type", synonyms: ["apptype", "application type", "form 49a", "application_type", "select application", "app type", "txtapptype"] },
    { key: "cat_type", synonyms: ["cattype", "category type", "applicant category", "status of applicant", "cat type", "txtcattype"] },
    { key: "consent", synonyms: ["consent", "declaration", "terms and conditions", "i agree", "chkconsent", "fullformconsent"] },
  ];

  // React-compatible DOM input value setter
  function setNativeInputValue(element, value) {
    element.focus();
    const strVal = String(value);

    // Call prototype property setter if available (required for React 16+ synthetic events)
    const isTextarea = element.tagName === "TEXTAREA";
    const proto = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const protoSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

    if (protoSetter) {
      protoSetter.call(element, strVal);
    } else {
      element.value = strVal;
    }

    // Reset React's internal value tracker
    const tracker = element._valueTracker;
    if (tracker) {
      tracker.setValue(strVal === "" ? "_reset_tracker_" : "");
    }

    element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
  }

  // Native select setter with exact, canonical, and partial matching
  function setNativeSelectValue(element, value) {
    element.focus();
    const target = String(value).trim().toLowerCase();
    let matchedIndex = -1;

    // 1. Exact value or exact text match
    for (let i = 0; i < element.options.length; i++) {
      const opt = element.options[i];
      const optVal = opt.value.trim().toLowerCase();
      const optTxt = opt.text.trim().toLowerCase();
      if (optVal === target || optTxt === target) {
        matchedIndex = i;
        break;
      }
    }

    // 2. Gender specific abbreviations (Male / Female / Transgender)
    if (matchedIndex === -1 && (target === "male" || target === "m")) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        const isFemale = optVal === "f" || optVal === "female" || optVal === "2" || /\bfemale\b/i.test(optTxt);
        if (!isFemale && (optVal === "m" || optVal === "male" || optVal === "1" || /\bmale\b/i.test(optTxt) || optTxt === "m")) {
          matchedIndex = i;
          break;
        }
      }
    } else if (matchedIndex === -1 && (target === "female" || target === "f")) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        if (optVal === "f" || optVal === "female" || optVal === "2" || /\bfemale\b/i.test(optTxt) || optTxt === "f") {
          matchedIndex = i;
          break;
        }
      }
    }

    // 3. Salutation / Title matching
    if (matchedIndex === -1 && (target === "shri" || target === "mr")) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        if (/\b(shri|mr|shri\.|mr\.)\b/i.test(optTxt) || optVal === "shri" || optVal === "mr" || optVal === "1") {
          matchedIndex = i;
          break;
        }
      }
    } else if (matchedIndex === -1 && (target === "smt" || target === "mrs" || target === "ms")) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        if (/\b(smt|mrs|ms|smt\.|mrs\.|ms\.)\b/i.test(optTxt) || optVal === "smt" || optVal === "mrs" || optVal === "2") {
          matchedIndex = i;
          break;
        }
      }
    }

    // 4. Caste / Category matching
    if (matchedIndex === -1 && (target === "obc" || target.includes("backward"))) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        if (/\b(obc|other backward|bc)\b/i.test(optTxt) || optVal === "obc" || optVal === "bc") {
          matchedIndex = i;
          break;
        }
      }
    } else if (matchedIndex === -1 && (target === "sc" || target.includes("scheduled caste"))) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        if (/\b(sc|scheduled caste)\b/i.test(optTxt) || optVal === "sc") {
          matchedIndex = i;
          break;
        }
      }
    } else if (matchedIndex === -1 && (target === "st" || target.includes("scheduled tribe"))) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        if (/\b(st|scheduled tribe)\b/i.test(optTxt) || optVal === "st") {
          matchedIndex = i;
          break;
        }
      }
    }

    // 5. State abbreviations (e.g. Telangana <-> TG / TS)
    if (matchedIndex === -1 && (target === "telangana" || target === "ts" || target === "tg")) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        if (optTxt.includes("telangana") || optVal === "tg" || optVal === "ts" || optTxt === "tg" || optTxt === "ts") {
          matchedIndex = i;
          break;
        }
      }
    }

    // 6. Partial inclusion match
    if (matchedIndex === -1) {
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.trim().toLowerCase();
        const optTxt = opt.text.trim().toLowerCase();
        if (optTxt.includes(target) || (target.length > 2 && target.includes(optTxt)) || optVal.includes(target)) {
          matchedIndex = i;
          break;
        }
      }
    }

    if (matchedIndex !== -1) {
      const selectedOption = element.options[matchedIndex];
      const protoSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
      if (protoSetter) {
        protoSetter.call(element, selectedOption.value);
      } else {
        element.value = selectedOption.value;
      }
      element.selectedIndex = matchedIndex;

      const tracker = element._valueTracker;
      if (tracker) {
        tracker.setValue("_reset_tracker_");
      }

      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
      return true;
    }
    return false;
  }

  // Checkbox setter
  function setNativeCheckboxValue(element, checked) {
    element.focus();
    const boolVal = Boolean(checked);
    const protoSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set;
    if (protoSetter) {
      protoSetter.call(element, boolVal);
    } else {
      element.checked = boolVal;
    }

    const tracker = element._valueTracker;
    if (tracker) {
      tracker.setValue(!boolVal);
    }

    element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
  }

  // Visual outline highlight
  function highlightFilledElement(element) {
    const originalOutline = element.style.outline;
    const originalBg = element.style.backgroundColor;
    element.style.outline = "2px solid #10b981";
    element.style.backgroundColor = "#ecfdf5";
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.backgroundColor = originalBg;
    }, 3500);
  }

  // Match an element to a canonical key using scored, word-boundary matching
  function matchElementToCanonical(element, labelText) {
    if (!element) return null;

    const rawName = (element.name || element.getAttribute("name") || "").toLowerCase().replace(/[-_\s]/g, "");
    const rawId = (element.id || element.getAttribute("id") || "").toLowerCase().replace(/[-_\s]/g, "");
    if (DIRECT_ID_MAPPINGS[rawId]) return DIRECT_ID_MAPPINGS[rawId];
    if (DIRECT_ID_MAPPINGS[rawName]) return DIRECT_ID_MAPPINGS[rawName];

    const autocomplete = (element.autocomplete || element.getAttribute("autocomplete") || "").toLowerCase();
    if (autocomplete === "name") return "full_name";
    if (autocomplete === "given-name") return "first_name";
    if (autocomplete === "family-name") return "last_name";
    if (autocomplete === "email") return "email";
    if (autocomplete === "tel") return "mobile";
    if (autocomplete === "bday") return "date_of_birth";
    if (autocomplete === "postal-code") return "pincode";
    if (autocomplete === "street-address") return "permanent_address";

    const name = (element.name || element.getAttribute("name") || "").toLowerCase().replace(/[-_]/g, " ");
    const id = (element.id || element.getAttribute("id") || "").toLowerCase().replace(/[-_]/g, " ");
    const placeholder = (element.placeholder || element.getAttribute("placeholder") || "").toLowerCase();
    const label = (labelText || "").toLowerCase();

    const rawCombined = [name, id, placeholder, label].filter(Boolean).join(" ");
    const normalized = rawCombined.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();

    let bestMatch = null;
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

  // Execute single safe action
  function execute(action) {
    const page = analyze();
    const decision = window.SevaPolicy.validate(action, page);
    if (!decision.allowed) return { ok: false, reason: decision.reason, page };

    if (action.type === "READ_PAGE" || action.type === "VALIDATE") return { ok: true, page };
    if (action.type === "WAIT") return { ok: true, page, message: "Waiting for the portal to stabilize." };

    if (["REQUEST_USER_INPUT", "REQUEST_CONFIRMATION", "UPLOAD_FILE"].includes(action.type)) {
      return {
        ok: true,
        page,
        requiresCitizen: true,
        message: action.type === "UPLOAD_FILE" ? "Choose the file yourself in the official portal file picker." : action.question || action.message,
      };
    }

    if (action.type === "SCROLL") {
      window.scrollBy({ top: action.direction === "DOWN" ? 500 : -500, behavior: "smooth" });
      return { ok: true, page: analyze() };
    }

    const element = window.SevaPolicy.elementFor(action.elementId);
    if (!element) return { ok: false, reason: "Element not found on live page.", page };
    if (window.SevaPolicy.isSensitiveElement(element)) {
      return { ok: false, reason: "The assistant will not interact with this sensitive control.", page };
    }

    if (action.type === "HIGHLIGHT_ELEMENT") {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.style.outline = "3px solid #f97316";
      setTimeout(() => { element.style.outline = ""; }, 2500);
      return { ok: true, page };
    }

    if (action.type === "FILL_FIELD") {
      if (element.tagName === "SELECT") {
        setNativeSelectValue(element, action.value);
      } else {
        setNativeInputValue(element, action.value);
      }
      highlightFilledElement(element);
      return { ok: true, page: analyze() };
    }

    if (action.type === "SELECT_OPTION") {
      setNativeSelectValue(element, action.value);
      highlightFilledElement(element);
      return { ok: true, page: analyze() };
    }

    if (action.type === "CHECK_BOX") {
      setNativeCheckboxValue(element, action.checked);
      return { ok: true, page: analyze() };
    }

    if (action.type === "OPEN_SECTION") {
      element.click();
      return { ok: true, page: analyze() };
    }

    return { ok: false, reason: "No deterministic execution path exists.", page };
  }

  // Build comprehensive unified lookup dictionary
  function buildUnifiedValues(profileData) {
    const rawFields = profileData?.profileFields || [];
    const profileMap = profileData?.profileMap || {};
    const user = profileData?.user || {};

    const values = { ...profileMap };
    for (const f of rawFields) {
      if (f.field_name && f.value) values[f.field_name] = f.value;
    }

    if (!values.full_name && user.name) values.full_name = user.name;
    if (!values.mobile && user.phone) values.mobile = user.phone;
    if (!values.phone_number && user.phone) values.phone_number = user.phone;
    if (!values.email && user.email) values.email = user.email;

    // Harmonize keys
    if (values.phone_number && !values.mobile) values.mobile = values.phone_number;
    if (values.mobile && !values.phone_number) values.phone_number = values.mobile;
    if (values.phone_number && !values.phone) values.phone = values.phone_number;
    if (values.permanent_address && !values.address) values.address = values.permanent_address;
    if (values.address && !values.permanent_address) values.permanent_address = values.address;

    // Intelligent name decomposition
    const fullName = (values.full_name || user.name || "").trim();
    if (fullName) {
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      if (!values.first_name) {
        values.first_name = nameParts[0] || "";
      }
      if (!values.last_name && !values.surname) {
        if (nameParts.length > 1) {
          values.last_name = nameParts[nameParts.length - 1];
          values.surname = nameParts[nameParts.length - 1];
          if (nameParts.length > 2 && !values.middle_name) {
            values.middle_name = nameParts.slice(1, -1).join(" ");
          }
        } else {
          values.last_name = nameParts[0];
          values.surname = nameParts[0];
        }
      }
    }

    // Father name decomposition
    const fatherName = (values.father_name || "").trim();
    if (fatherName) {
      const fParts = fatherName.split(/\s+/).filter(Boolean);
      if (!values.father_first_name) values.father_first_name = fParts[0] || fatherName;
      if (!values.father_last_name) values.father_last_name = fParts.length > 1 ? fParts[fParts.length - 1] : "";
    }

    // Mother name decomposition
    const motherName = (values.mother_name || "").trim();
    if (motherName) {
      const mParts = motherName.split(/\s+/).filter(Boolean);
      if (!values.mother_first_name) values.mother_first_name = mParts[0] || motherName;
      if (!values.mother_last_name) values.mother_last_name = mParts.length > 1 ? mParts[mParts.length - 1] : "";
    }

    // Title / Salutation
    const gender = (values.gender || "").trim();
    if (gender && !values.title) {
      values.title = gender.toLowerCase().startsWith("f") ? "SMT" : "SHRI";
    }

    if (!values.app_type) values.app_type = "49A";
    if (!values.cat_type) values.cat_type = "INDIVIDUAL";

    // Format DOB to DD/MM/YYYY
    const rawDob = values.date_of_birth || values.dob || "";
    if (rawDob) {
      let formattedDob = "";
      let isoDob = "";
      let dobDay = "";
      let dobMonth = "";
      let dobYear = "";

      const matchIso = String(rawDob).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (matchIso) {
        const [, y, m, d] = matchIso;
        dobYear = y;
        dobMonth = m.padStart(2, "0");
        dobDay = d.padStart(2, "0");
        formattedDob = `${dobDay}/${dobMonth}/${dobYear}`;
        isoDob = `${dobYear}-${dobMonth}-${dobDay}`;
      } else {
        const matchSlash = String(rawDob).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (matchSlash) {
          const [, d, m, y] = matchSlash;
          dobYear = y;
          dobMonth = m.padStart(2, "0");
          dobDay = d.padStart(2, "0");
          formattedDob = `${dobDay}/${dobMonth}/${dobYear}`;
          isoDob = `${dobYear}-${dobMonth}-${dobDay}`;
        }
      }

      if (formattedDob) {
        values.date_of_birth = formattedDob;
        values.date_of_birth_iso = isoDob;
        values.dob = formattedDob;
        values.dob_formatted = formattedDob;
        values.dob_day = dobDay;
        values.dob_month = dobMonth;
        values.dob_year = dobYear;
      }
    }

    // Aadhaar variations
    const rawAadhaar = values.aadhaar_number || values.aadhaar || "";
    if (rawAadhaar) {
      const cleanAadhaar = rawAadhaar.replace(/\s+/g, "");
      values.aadhaar_clean = cleanAadhaar;
      values.aadhaar = rawAadhaar;
      values.aadhaar_number = rawAadhaar;
      if (cleanAadhaar.length >= 12) {
        values.uid1 = cleanAadhaar.slice(0, 4);
        values.uid2 = cleanAadhaar.slice(4, 8);
        values.uid3 = cleanAadhaar.slice(8, 12);
      }
    }

    values.consent = "yes";
    return values;
  }

  // Execute full page autofill using citizen profile
  function executeAutofill(profileData) {
    const values = buildUnifiedValues(profileData);
    const page = analyze();
    const filledFields = [];
    const skippedFields = [];
    const sensitiveControls = [];

    const controls = document.querySelectorAll("input, select, textarea");

    controls.forEach((element, index) => {
      const type = (element.type || element.getAttribute("type") || element.tagName).toLowerCase();
      if (type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "image") return;
      if (element.disabled) return;

      const elementId = element.id || `seva-field-${index}`;
      if (!element.id) element.dataset.sevaId = elementId;

      const label = window.SevaPageAnalyzer?.labelFor(element) || "";

      // Check if sensitive
      if (window.SevaPolicy?.isSensitiveElement(element)) {
        sensitiveControls.push({
          id: elementId,
          type,
          label: label || "Security Verification Control",
          reason: "Requires citizen entry (OTP, Password, CAPTCHA, or Payment)",
        });
        return;
      }

      // Check for file inputs
      if (type === "file") {
        skippedFields.push({
          id: elementId,
          label: label || "File upload",
          reason: "Portal file selection requires citizen interaction.",
        });
        return;
      }

      // Match element to canonical key
      const canonicalKey = matchElementToCanonical(element, label);
      if (!canonicalKey) {
        skippedFields.push({
          id: elementId,
          label: label || element.name || "Unknown input",
          reason: "No matching citizen profile field found.",
        });
        return;
      }

      const val = values[canonicalKey];
      if (!val) {
        skippedFields.push({
          id: elementId,
          canonicalKey,
          label,
          reason: "Profile field has no saved value.",
        });
        return;
      }

      // Fill element
      try {
        if (element.tagName === "SELECT") {
          const filled = setNativeSelectValue(element, val);
          if (filled) {
            highlightFilledElement(element);
            filledFields.push({
              elementId,
              canonicalKey,
              label: label || canonicalKey,
              value: element.value,
            });
          }
        } else if (type === "radio") {
          // Only check if this radio button's value or label matches the target!
          const radioVal = (element.value || "").trim().toLowerCase();
          const targetVal = String(val).trim().toLowerCase();
          const radioLabel = (label || "").trim().toLowerCase();

          let matches = false;
          if (canonicalKey === "gender") {
            const isFemaleRadio =
              radioVal === "female" ||
              radioVal === "f" ||
              radioVal === "2" ||
              /\bfemale\b/i.test(radioLabel) ||
              /\bwoman\b/i.test(radioLabel) ||
              /\bgirl\b/i.test(radioLabel);
            const isMaleRadio =
              (radioVal === "male" ||
                radioVal === "m" ||
                radioVal === "1" ||
                /\bmale\b/i.test(radioLabel) ||
                /\bman\b/i.test(radioLabel) ||
                /\bboy\b/i.test(radioLabel)) &&
              !isFemaleRadio;
            const isTransRadio =
              radioVal === "transgender" ||
              radioVal === "other" ||
              radioVal === "3" ||
              /\btransgender\b/i.test(radioLabel) ||
              /\bother\b/i.test(radioLabel);

            if (targetVal === "male" || targetVal === "m") {
              matches = isMaleRadio;
            } else if (targetVal === "female" || targetVal === "f") {
              matches = isFemaleRadio;
            } else if (targetVal === "transgender" || targetVal === "other") {
              matches = isTransRadio;
            }
          } else if (radioVal === targetVal || radioLabel === targetVal) {
            matches = true;
          } else if (radioLabel.includes(targetVal) || (targetVal.length > 2 && radioVal.includes(targetVal))) {
            matches = true;
          }

          if (matches) {
            setNativeCheckboxValue(element, true);
            highlightFilledElement(element);
            filledFields.push({
              elementId,
              canonicalKey,
              label: label || canonicalKey,
              value: element.value,
            });
          }
        } else if (type === "checkbox") {
          const isConsentOrAffirmative = /yes|true|1|agree|consent|active|seeded/i.test(String(val));
          if (isConsentOrAffirmative) {
            setNativeCheckboxValue(element, true);
            highlightFilledElement(element);
            filledFields.push({
              elementId,
              canonicalKey,
              label: label || canonicalKey,
              value: "checked",
            });
          }
        } else {
          // Text / Tel / Email / Date / Number / Textarea
          let finalVal = String(val);

          // Handle Date inputs vs Text date inputs
          if (type === "date") {
            // HTML5 date inputs strictly require YYYY-MM-DD
            if (values.date_of_birth_iso) {
              finalVal = values.date_of_birth_iso;
            }
          } else if (canonicalKey === "date_of_birth") {
            const placeholder = (element.getAttribute("placeholder") || "").toLowerCase();
            if (placeholder.includes("dd") || placeholder.includes("d/m/y")) {
              finalVal = values.dob_formatted || values.date_of_birth;
            }
          }

          // Handle Aadhaar with or without spaces based on maxLength
          if (canonicalKey === "aadhaar_number") {
            if (element.maxLength === 12 || type === "number") {
              finalVal = values.aadhaar_clean;
            }
          }

          setNativeInputValue(element, finalVal);
          highlightFilledElement(element);
          filledFields.push({
            elementId,
            canonicalKey,
            label: label || canonicalKey,
            value: finalVal,
          });
        }
      } catch (err) {
        console.warn("Error autofilling element", elementId, err);
      }
    });

    return {
      ok: true,
      filledCount: filledFields.length,
      filledFields,
      skippedFields,
      sensitiveControls,
      updatedPage: analyze(),
    };
  }

  // Listen for messages from extension sidepanel / background
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ pong: true });
      return true;
    }

    if (message.type === "ANALYZE_PAGE") {
      sendResponse({ page: analyze() });
      return true;
    }

    if (message.type === "EXECUTE_SAFE_ACTION") {
      sendResponse(execute(message.action));
      return true;
    }

    if (message.type === "EXECUTE_AUTOFILL") {
      // If profile was passed, use it; otherwise ask background for saved profile
      if (message.profile) {
        const result = executeAutofill(message.profile);
        sendResponse(result);
      } else {
        chrome.runtime.sendMessage({ type: "GET_CITIZEN_PROFILE" }, (res) => {
          const profile = res?.profile || {};
          if (res?.profileMap) profile.profileMap = res.profileMap;
          const result = executeAutofill(profile);
          sendResponse(result);
        });
      }
      return true;
    }

    if (message.type === "PREVIEW_AUTOFILL_MAPPINGS") {
      const values = buildUnifiedValues(message.profile || {});

      const controls = document.querySelectorAll("input:not([type='hidden']), select, textarea");
      const preview = [];

      controls.forEach((element, index) => {
        const elementId = element.id || `seva-field-${index}`;
        const label = window.SevaPageAnalyzer?.labelFor(element) || element.name || "";
        const isSensitive = window.SevaPolicy?.isSensitiveElement(element);

        if (isSensitive) {
          preview.push({
            id: elementId,
            label,
            status: "SENSITIVE_MANUAL",
            reason: "OTP / Password / CAPTCHA (Citizen only)",
          });
          return;
        }

        const canonicalKey = matchElementToCanonical(element, label);
        if (canonicalKey && values[canonicalKey]) {
          const isFilled = element.value && String(element.value).trim().toLowerCase() === String(values[canonicalKey]).trim().toLowerCase();
          preview.push({
            id: elementId,
            label: label || canonicalKey,
            canonicalKey,
            value: values[canonicalKey],
            status: isFilled ? "FILLED" : "READY_TO_AUTOFILL",
          });
        } else {
          preview.push({
            id: elementId,
            label: label || element.name || "Form input",
            status: "UNMAPPED",
          });
        }
      });

      sendResponse({ ok: true, preview });
      return true;
    }

    return true;
  });

  // Debounced mutation observer to announce DOM updates to sidepanel
  let timer;
  const announce = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        chrome.runtime.sendMessage({ type: "PAGE_MODEL", page: analyze() });
      } catch (err) {}
    }, 500);
  };

  new MutationObserver(announce).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  // Floating In-Portal Assistant for 1-Click Execution
  function injectFloatingAssistant() {
    if (window.self !== window.top) return;
    if (document.getElementById("seva-saarthi-portal-widget")) return;

    const host = window.location.hostname.toLowerCase();
    const isOfficial =
      host.endsWith(".gov.in") ||
      host.endsWith(".nic.in") ||
      host.endsWith(".cgg.gov.in") ||
      host.includes("proteantech.in") ||
      host.includes("utiitsl.com") ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (!isOfficial) return;

    const widget = document.createElement("div");
    widget.id = "seva-saarthi-portal-widget";
    widget.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;";

    widget.innerHTML = `
      <div id="seva-float-card" style="display:none;margin-bottom:10px;background:#0f172a;color:#fff;padding:14px 16px;border-radius:14px;box-shadow:0 12px 28px rgba(0,0,0,0.35);border:1px solid #334155;max-width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:800;font-size:12px;color:#38bdf8;display:flex;align-items:center;gap:5px;">
            <span>🛡️</span> Seva Saarthi Assistant
          </div>
          <button id="seva-float-close" style="background:none;border:none;color:#94a3b8;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
        </div>
        <p style="font-size:11px;color:#cbd5e1;margin:0 0 10px;line-height:1.4;">Verified Government Portal detected. 1-click safe profile autofill is ready.</p>
        <div id="seva-float-status" style="font-size:11px;color:#4ade80;margin-bottom:8px;font-weight:600;display:none;"></div>
        <div style="display:flex;gap:6px;">
          <button id="seva-float-autofill-btn" style="flex:1;background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">⚡ Autofill Fields</button>
          <button id="seva-float-copy-btn" style="background:#334155;color:#fff;border:none;padding:8px 10px;border-radius:8px;font-size:11px;cursor:pointer;">📋 Copy</button>
        </div>
        <div style="margin-top:8px;font-size:9px;color:#94a3b8;">🔒 DPDP Act Compliant: Passwords & CAPTCHAs are never touched.</div>
      </div>
      <button id="seva-float-pill" style="background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;border:1px solid #60a5fa;padding:10px 18px;border-radius:999px;font-weight:800;font-size:12px;box-shadow:0 8px 20px rgba(37,99,235,0.4);cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s ease;">
        <span>🛡️</span>
        <span id="seva-float-pill-text">⚡ Autofill with Seva Saarthi</span>
      </button>
    `;

    document.body.appendChild(widget);

    const card = document.getElementById("seva-float-card");
    const pill = document.getElementById("seva-float-pill");
    const closeBtn = document.getElementById("seva-float-close");
    const autofillBtn = document.getElementById("seva-float-autofill-btn");
    const copyBtn = document.getElementById("seva-float-copy-btn");
    const statusDiv = document.getElementById("seva-float-status");
    const pillText = document.getElementById("seva-float-pill-text");

    function doAutofill() {
      if (pillText) pillText.textContent = "⏳ Filling safe fields...";
      chrome.runtime.sendMessage({ type: "GET_CITIZEN_PROFILE" }, (res) => {
        let profile = res?.profile || {};
        if (res?.profileMap) profile.profileMap = res.profileMap;
        const result = executeAutofill(profile);
        const count = result.filledCount || 0;
        if (pillText) pillText.textContent = `✅ Filled ${count} fields!`;
        if (statusDiv) {
          statusDiv.style.display = "block";
          statusDiv.textContent = `✅ Filled ${count} fields safely! Please solve CAPTCHA and review.`;
        }
        setTimeout(() => {
          if (pillText) pillText.textContent = "⚡ Autofill with Seva Saarthi";
        }, 3500);
      });
    }

    pill?.addEventListener("click", () => {
      doAutofill();
    });

    closeBtn?.addEventListener("click", () => { if (card) card.style.display = "none"; });
    autofillBtn?.addEventListener("click", doAutofill);
    copyBtn?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "GET_CITIZEN_PROFILE" }, (res) => {
        const map = res?.profileMap || {};
        const txt = Object.entries(map).map(([k, v]) => `${k}: ${v}`).join("\n");
        navigator.clipboard.writeText(txt);
        if (copyBtn) {
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "📋 Copy"; }, 2000);
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectFloatingAssistant);
  } else {
    injectFloatingAssistant();
  }

  announce();
})();
