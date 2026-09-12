(() => {
  const allowed = new Set([
    "READ_PAGE",
    "HIGHLIGHT_ELEMENT",
    "FILL_FIELD",
    "SELECT_OPTION",
    "CHECK_BOX",
    "UPLOAD_FILE",
    "SCROLL",
    "OPEN_SECTION",
    "WAIT",
    "VALIDATE",
    "REQUEST_USER_INPUT",
    "REQUEST_CONFIRMATION",
    "AUTOFILL_ALL",
    "EXECUTE_AUTOFILL",
  ]);

  const sensitiveTypes = new Set(["password", "hidden", "file"]);

  function elementFor(id) {
    if (!id) return null;
    return document.getElementById(id) || document.querySelector(`[data-seva-id="${CSS.escape(id)}"]`);
  }

  function isSensitiveElement(element) {
    if (!element) return true;
    const type = (element.type || element.getAttribute("type") || "").toLowerCase();
    if (sensitiveTypes.has(type)) return true;

    const auto = (element.autocomplete || "").toLowerCase();
    if (auto === "one-time-code" || auto.includes("password")) return true;

    const identifiers = `${element.name || ""} ${element.id || ""} ${element.getAttribute("placeholder") || ""} ${element.getAttribute("aria-label") || ""}`.toLowerCase();

    // Postal PIN code is SAFE to autofill
    const isPostalPin = /\b(pin_?code|pincode|postal|zip|area_?pin)\b/i.test(identifiers);
    if (!isPostalPin) {
      // Never auto-fill passwords, OTPs, CAPTCHAs, ATM PINs, UPI PINs, or payment tokens
      if (
        /\b(password|passwd|otp|captcha|security_code|cvv|cvc|card_number|cardnumber|mpin|atm_pin|upi_pin)\b/i.test(identifiers) ||
        /(atm|upi|secret|security|card|login)[-_ ]?pin\b/i.test(identifiers)
      ) {
        return true;
      }
    }

    return false;
  }

  function validate(action, page) {
    if (!action || !allowed.has(action.type)) {
      return { allowed: false, reason: "Action is not allowlisted." };
    }

    if (["FILL_FIELD", "SELECT_OPTION", "CHECK_BOX"].includes(action.type)) {
      if (!action.elementId) {
        return { allowed: false, reason: "Action has no identified live element." };
      }
      const element = elementFor(action.elementId);
      if (isSensitiveElement(element)) {
        return { allowed: false, reason: "Sensitive control (password, OTP, CAPTCHA, or payment) requires citizen entry." };
      }
    }

    if (action.type === "FILL_FIELD" && (typeof action.value !== "string" || action.value.length > 500)) {
      return { allowed: false, reason: "Field value is invalid or exceeds 500 characters." };
    }

    return { allowed: true };
  }

  window.SevaPolicy = {
    validate,
    elementFor,
    isSensitiveElement,
    allowedActions: allowed,
  };
})();
