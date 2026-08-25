// Seva Saarthi Universal Government & Protean PAN Card Auto-Fill Engine

(function () {
  console.log("🇮🇳 [Seva Saarthi Extension] Initialized on:", window.location.href);

  // Profile data from verified vault
  const defaultProfile = {
    firstName: "Rahul",
    middleName: "",
    lastName: "Kumar",
    fullName: "Rahul Kumar",
    dob: "15/08/2001",
    email: "rahul@example.com",
    mobile: "9876543210",
    aadhaar: "5492 8173 9012",
    gender: "Male",
    income: "180000",
    college: "National Institute of Technology",
    course: "B.Tech Computer Science",
    rollNo: "22071A0589",
    bankAccount: "38491029481",
    bankIfsc: "SBIN0012948",
  };

  // Helper to trigger realistic input events
  function setValueAndDispatch(element, val) {
    if (!element) return;
    element.focus();
    element.value = val;

    // React / Native value setter bypass
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, val);
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));

    // Trigger jQuery event if present
    if (window.$ && typeof window.$(element).val === "function") {
      try {
        window.$(element).val(val).trigger("change");
      } catch (e) {}
    }

    element.style.border = "3px solid #10b981";
    element.style.boxShadow = "0 0 14px rgba(16, 185, 129, 0.6)";
  }

  // Helper to select dropdown options (including Select2)
  function selectDropdown(selectEl, matchTextOrVal) {
    if (!selectEl) return false;
    let matched = false;
    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      if (
        opt.value.toLowerCase().includes(matchTextOrVal.toLowerCase()) ||
        opt.text.toLowerCase().includes(matchTextOrVal.toLowerCase())
      ) {
        selectEl.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched && selectEl.options.length > 1) {
      selectEl.selectedIndex = 1;
      matched = true;
    }

    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    if (window.$ && typeof window.$(selectEl).trigger === "function") {
      try {
        window.$(selectEl).trigger("change");
      } catch (e) {}
    }
    return matched;
  }

  // Core Autofill Execution Function
  async function executeAutofill() {
    let profile = { ...defaultProfile };

    // Fetch live profile from local Seva Saarthi store if available
    try {
      const res = await fetch("http://localhost:3000/api/profile");
      const json = await res.json();
      if (json && json.data) {
        json.data.forEach((f) => {
          if (f.field_name === "full_name") {
            profile.fullName = f.value;
            const parts = f.value.trim().split(" ");
            profile.firstName = parts[0] || "Rahul";
            profile.lastName = parts.slice(1).join(" ") || "Kumar";
          }
          if (f.field_name === "date_of_birth") {
            profile.dob = f.value;
            if (f.value.includes("-")) {
              const [y, m, d] = f.value.split("-");
              profile.dob = `${d}/${m}/${y}`;
            }
          }
          if (f.field_name === "phone_number") profile.mobile = f.value;
          if (f.field_name === "email") profile.email = f.value;
          if (f.field_name === "aadhaar_number") profile.aadhaar = f.value;
          if (f.field_name === "annual_income") profile.income = f.value;
          if (f.field_name === "college_name") profile.college = f.value;
          if (f.field_name === "bank_account_no") profile.bankAccount = f.value;
          if (f.field_name === "bank_ifsc") profile.bankIfsc = f.value;
        });
      }
    } catch (e) {}

    let filledCount = 0;

    // A. PROTEAN / NSDL PAN CARD EXACT FIELD MATCHERS
    const proteanFirstName = document.getElementById("f_name_end");
    if (proteanFirstName) {
      setValueAndDispatch(proteanFirstName, profile.firstName);
      filledCount++;
    }

    const proteanLastName = document.getElementById("l_name_end");
    if (proteanLastName) {
      setValueAndDispatch(proteanLastName, profile.lastName);
      filledCount++;
    }

    const proteanDob = document.getElementById("date_of_birth_reg");
    if (proteanDob) {
      setValueAndDispatch(proteanDob, profile.dob);
      filledCount++;
    }

    const proteanEmail = document.getElementById("email_id2");
    if (proteanEmail) {
      setValueAndDispatch(proteanEmail, profile.email);
      filledCount++;
    }

    const proteanMobile = document.getElementById("rvContactNo");
    if (proteanMobile) {
      setValueAndDispatch(proteanMobile, profile.mobile);
      filledCount++;
    }

    const proteanConsent = document.getElementById("consent");
    if (proteanConsent) {
      proteanConsent.checked = true;
      proteanConsent.dispatchEvent(new Event("change", { bubbles: true }));
      filledCount++;
    }

    const proteanAppType = document.getElementById("type");
    if (proteanAppType) {
      if (selectDropdown(proteanAppType, "49A")) filledCount++;
    }

    const proteanCategory = document.getElementById("cat_applicant1");
    if (proteanCategory) {
      if (selectDropdown(proteanCategory, "INDIVIDUAL") || selectDropdown(proteanCategory, "P")) filledCount++;
    }

    // B. UNIVERSAL GENERIC MATCHERS (For NSP, PMAY, MeeSeva, and other Govt portals)
    const matchers = [
      { val: profile.lastName, keys: ["lastname", "last_name", "surname", "txtlastname", "l_name"] },
      { val: profile.firstName, keys: ["firstname", "first_name", "txtfirstname", "f_name"] },
      { val: profile.fullName, keys: ["fullname", "full_name", "applicantname", "applicant_name", "student_name", "name"] },
      { val: profile.dob, keys: ["dateofbirth", "date_of_birth", "dob", "birth", "txtdob"] },
      { val: profile.mobile, keys: ["mobile", "phonenumber", "phone_number", "contactno", "contact_no", "phone"] },
      { val: profile.email, keys: ["emailid", "email_id", "emailaddress", "email_address", "email"] },
      { val: profile.aadhaar, keys: ["aadhaar", "uid", "aadhar", "aadhaarno", "aadhaar_no"] },
      { val: profile.income, keys: ["annualincome", "annual_income", "familyincome", "family_income", "income"] },
      { val: profile.college, keys: ["institutename", "institute_name", "collegename", "college_name", "university", "college"] },
      { val: profile.rollNo, keys: ["rollno", "roll_no", "regno", "reg_no", "enrollment"] },
      { val: profile.bankAccount, keys: ["accountno", "account_no", "bankaccount", "bank_account", "account"] },
      { val: profile.bankIfsc, keys: ["ifsc", "ifsccode", "ifsc_code"] },
    ];

    document.querySelectorAll("input, textarea").forEach((input) => {
      if (input.type === "hidden" || input.type === "submit" || input.type === "button") return;
      if (input.value && input.value.trim().length > 0) return; // already filled

      if (input.type === "checkbox") {
        const checkName = (input.name || input.id || "").toLowerCase();
        if (checkName.includes("consent") || checkName.includes("term") || checkName.includes("agree") || checkName.includes("chk")) {
          input.checked = true;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          filledCount++;
        }
        return;
      }

      const nameAttr = (input.getAttribute("name") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const idAttr = (input.getAttribute("id") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const placeholderAttr = (input.getAttribute("placeholder") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const labelText = (input.labels && input.labels[0] ? input.labels[0].innerText : "").toLowerCase().replace(/[^a-z0-9]/g, "");

      for (const m of matchers) {
        const matches = m.keys.some((k) => {
          const cleanK = k.replace(/[^a-z0-9]/g, "");
          return nameAttr.includes(cleanK) || idAttr.includes(cleanK) || placeholderAttr.includes(cleanK) || labelText.includes(cleanK);
        });

        if (matches) {
          setValueAndDispatch(input, m.val);
          filledCount++;
          break;
        }
      }
    });

    // Show floating confirmation banner
    showApprovalBanner(profile, filledCount);
  }

  // Floating Banner
  function showApprovalBanner(profile, count) {
    let banner = document.getElementById("seva-saarthiroval-overlay");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "seva-saarthiroval-overlay";
      document.documentElement.appendChild(banner);
    }

    banner.innerHTML = `
      <div style="position: fixed; bottom: 90px; right: 24px; z-index: 2147483647; background: #0f172a; color: white; padding: 20px; border-radius: 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.6); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 380px; border: 2px solid #10b981; animation: slideUp 0.3s ease;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; background: #10b981; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: black; font-weight: bold;">✓</div>
            <div>
              <strong style="font-size: 13px; display: block; color: #fff;">Seva Saarthi Autofill Done</strong>
              <span style="font-size: 10px; color: #94a3b8;">${count} fields populated</span>
            </div>
          </div>
          <span style="font-size: 10px; background: #10b981/20; color: #34d399; border: 1px solid #10b981/40; font-weight: bold; padding: 2px 8px; border-radius: 9999px;">READY</span>
        </div>
        
        <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 12px; line-height: 1.5; background: #1e293b; padding: 10px; border-radius: 12px;">
          Applicant: <strong style="color: #fff;">${profile.fullName}</strong><br/>
          DOB: <strong style="color: #fff;">${profile.dob}</strong> • Mobile: <strong style="color: #fff;">${profile.mobile}</strong><br/>
          <span style="color: #f59e0b; font-weight: bold; display: block; margin-top: 6px;">⚠️ If this form has a Captcha, please type the Captcha code shown on the screen and click Submit!</span>
        </div>

        <button id="formly-banner-close" style="width: 100%; background: #334155; hover:background: #475569; color: white; border: none; padding: 10px; border-radius: 12px; font-size: 12px; font-weight: bold; cursor: pointer;">Got It / Close Overlay</button>
      </div>
    `;

    document.getElementById("formly-banner-close").onclick = () => banner.remove();
  }

  // Inject Floating Button onto Website
  function injectFloatingTrigger() {
    if (document.getElementById("formly-floating-widget")) return;

    const widget = document.createElement("div");
    widget.id = "formly-floating-widget";
    widget.innerHTML = `
      <button id="formly-btn-trigger" style="position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%); color: white; padding: 12px 20px; font-size: 13px; font-weight: bold; border-radius: 9999px; border: 2px solid white; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.5); cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: transform 0.2s ease;">
        <span style="font-size: 16px;">🤖</span>
        <span>Autofill with Seva Saarthi</span>
      </button>
    `;

    document.documentElement.appendChild(widget);

    document.getElementById("formly-btn-trigger").onclick = () => {
      const btn = document.getElementById("formly-btn-trigger");
      btn.innerHTML = `<span style="font-size: 16px;">⏳</span> <span>Autofilling...</span>`;
      btn.style.background = "#10b981";
      executeAutofill();
      setTimeout(() => {
        btn.innerHTML = `<span style="font-size: 16px;">✓</span> <span>Autofill Complete!</span>`;
      }, 800);
    };
  }

  // Run on load and observe DOM changes
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectFloatingTrigger);
  } else {
    injectFloatingTrigger();
  }

  // Re-check after 1.5s for dynamic SPA/AJAX pages (like Protean)
  setTimeout(injectFloatingTrigger, 1500);

  // Listen for messages from popup or commands
  chrome.runtime.onMessage?.addListener((request, sender, sendResponse) => {
    if (request.action === "AUTOFILL_NOW") {
      executeAutofill();
      sendResponse({ status: "success" });
    }
  });
})();
