// Seva Saarthi live-page assistant. It only operates on verified domains and
// only executes explicit, allowlisted field-fill actions.
(function () {
  if (window !== window.top) return;

  const VERIFIED_DOMAINS = new Set([
    "onlineservices.nsdl.com",
    "incometax.gov.in",
    "tg.meeseva.gov.in",
    "sarathi.parivahan.gov.in",
    "pmkisan.gov.in",
    "scholarships.gov.in",
    "myaadhaar.uidai.gov.in",
    "digilocker.gov.in",
    "beneficiary.nha.gov.in",
    "epds.telangana.gov.in",
    "dharani.telangana.gov.in",
    "ghmc.gov.in",
    "udyamregistration.gov.in",
    "employment.telangana.gov.in",
  ]);
  const host = window.location.hostname.toLowerCase();
  const isOfficial = [...VERIFIED_DOMAINS].some((domain) => host === domain || host.endsWith(`.${domain}`));
  if (!isOfficial) return;

  const sensitiveTokens = ["password", "otp", "captcha", "cvv", "pin", "declaration", "payment"];
  const profileMatchers = [
    ["fullName", ["applicant name", "full name", "name of applicant", "candidate name"]],
    ["dob", ["date of birth", "dob", "birth date"]],
    ["gender", ["gender", "sex"]],
    ["mobile", ["mobile", "phone", "contact number", "mobile number"]],
    ["email", ["email", "email address"]],
    ["income", ["annual income", "family income", "income"]],
    ["fatherName", ["father name", "father's name", "parent name"]],
    ["category", ["category", "caste", "community"]],
    ["college", ["college", "institution", "university"]],
    ["course", ["course", "degree", "program"]],
    ["rollNo", ["roll number", "registration number", "enrollment number"]],
  ];

  let profile = null;
  let panel = null;

  function normalized(value) {
    return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function labelFor(element) {
    if (element.labels && element.labels[0]) return element.labels[0].innerText;
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) return labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" ");
    return element.getAttribute("aria-label") || element.getAttribute("placeholder") || element.name || element.id || "";
  }

  function pageType() {
    const text = normalized(document.body?.innerText).slice(0, 12000);
    if (sensitiveTokens.some((token) => text.includes(token))) {
      if (text.includes("captcha")) return "CAPTCHA";
      if (text.includes("otp")) return "OTP";
      if (text.includes("payment") || text.includes("fee")) return "PAYMENT";
    }
    if (text.includes("login") || text.includes("sign in")) return "LOGIN";
    if (text.includes("success") || text.includes("submitted") || text.includes("acknowledgement")) return "RESULT";
    if (document.querySelector('input[type="file"]')) return "DOCUMENT_UPLOAD";
    return document.querySelector("input, select, textarea") ? "FORM" : "UNKNOWN";
  }

  function inspectPage() {
    return {
      url: window.location.href,
      domain: host,
      pageType: pageType(),
      fields: [...document.querySelectorAll("input, select, textarea")]
        .filter((element) => !["hidden", "submit", "button"].includes(element.type))
        .map((element) => ({
          label: labelFor(element),
          type: element.type || element.tagName.toLowerCase(),
          required: element.required || element.getAttribute("aria-required") === "true",
          sensitive: sensitiveTokens.some((token) => normalized(labelFor(element)).includes(token)),
          filled: Boolean(element.value),
        })),
      uploads: [...document.querySelectorAll('input[type="file"]')].map((element) => ({
        label: labelFor(element),
        state: element.files?.length ? "FILE_SELECTED" : "FILE_SELECTION_REQUIRED",
      })),
    };
  }

  function setNativeValue(element, value) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function findValue(label) {
    const clean = normalized(label);
    const match = profileMatchers.find(([, labels]) => labels.some((candidate) => clean.includes(candidate)));
    return match ? profile?.[match[0]] : undefined;
  }

  function fillSafeFields() {
    if (!profile) return { filled: 0, skipped: 0 };
    let filled = 0;
    let skipped = 0;
    document.querySelectorAll("input, select, textarea").forEach((element) => {
      if (["hidden", "submit", "button", "file", "password"].includes(element.type)) return;
      const label = labelFor(element);
      if (sensitiveTokens.some((token) => normalized(label).includes(token))) {
        skipped++;
        return;
      }
      const value = findValue(label);
      if (!value || element.value) return;
      if (element.tagName === "SELECT") {
        const option = [...element.options].find((item) => normalized(item.text).includes(normalized(value)) || normalized(item.value) === normalized(value));
        if (option) {
          element.value = option.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          filled++;
        }
        return;
      }
      setNativeValue(element, value);
      element.style.outline = "2px solid #10b981";
      filled++;
    });
    return { filled, skipped };
  }

  function renderPanel(message) {
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "seva-saarthi-live-panel";
      panel.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483647;width:320px;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:18px;padding:16px;box-shadow:0 20px 50px #0008;font:13px system-ui";
      document.documentElement.appendChild(panel);
    }
    const page = inspectPage();
    const uploadStatus = page.uploads.length
      ? page.uploads.map((upload) => `${upload.label || "Document"}: ${upload.state}`).join("<br>")
      : "No upload control detected";
    panel.innerHTML = `<strong style="display:block;font-size:15px">Seva Saarthi</strong>
      <span style="display:block;color:#93c5fd;margin-top:4px">${page.pageType} · ${page.fields.length} fields detected</span>
      <p style="color:#cbd5e1;line-height:1.5">${message}</p>
      <div style="color:#cbd5e1;background:#1e293b;border-radius:10px;padding:8px;margin-bottom:10px;font-size:11px">${uploadStatus}</div>
      <button id="seva-saarthi-fill" style="width:100%;border:0;border-radius:10px;padding:9px;background:#2563eb;color:white;font-weight:700;cursor:pointer">Fill permitted fields</button>
      <small style="display:block;color:#94a3b8;margin-top:9px">Login, OTP, CAPTCHA, payment, declarations and final Submit remain yours.</small>`;
    panel.querySelector("#seva-saarthi-fill").onclick = () => {
      const result = fillSafeFields();
      renderPanel(`${result.filled} permitted field(s) filled. ${result.skipped} sensitive field(s) left for you.`);
    };
  }

  chrome.storage.local.get(["userProfile"], (result) => {
    profile = result.userProfile || null;
    renderPanel(profile ? "Live official page detected. Review the fields before filling." : "Live page detected. Open Seva Saarthi to connect your permitted profile data.");
  });

  document.addEventListener("change", (event) => {
    if (event.target?.type === "file") {
      renderPanel("A file was selected locally. Waiting for the official portal to report acceptance or rejection.");
    }
  }, true);

  chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
    if (request.action !== "AUTOFILL_NOW") return;
    profile = request.profile || profile;
    const result = fillSafeFields();
    renderPanel(`${result.filled} permitted field(s) filled. Sensitive fields were not touched.`);
    sendResponse({ status: "fields_filled", ...result, page: inspectPage() });
  });
})();
