(() => {
  const CONTROL_SELECTOR = "input, select, textarea, button";
  const text = (node) => (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
  const limited = (value, max = 240) => (value || "").slice(0, max);

  function humanizeKey(str) {
    if (!str) return "";
    return str
      .replace(/[-_]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .trim();
  }

  function labelFor(element) {
    if (!element) return "";

    // 1. aria-labelledby
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const lbl = labelledBy
        .split(/\s+/)
        .map((id) => text(document.getElementById(id)))
        .filter(Boolean)
        .join(" ");
      if (lbl) return limited(lbl);
    }

    // 2. Associated HTML labels collection
    if (element.labels && element.labels.length) {
      const lbl = [...element.labels].map(text).filter(Boolean).join(" ");
      if (lbl) return limited(lbl);
    }

    // 3. aria-label
    const aria = element.getAttribute("aria-label");
    if (aria) return limited(aria);

    // 4. QuerySelector label[for="..."]
    if (element.id) {
      const explicitLabel = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (explicitLabel) {
        const lbl = text(explicitLabel);
        if (lbl) return limited(lbl);
      }
    }

    // 5. Closest wrapping label or field group
    const closestLabel = element.closest("label");
    if (closestLabel) {
      const clone = closestLabel.cloneNode(true);
      const inputs = clone.querySelectorAll("input, select, textarea, button");
      inputs.forEach((i) => i.remove());
      const lbl = text(clone);
      if (lbl) return limited(lbl);
    }

    // 6. Preceding or succeeding element sibling (common in flex/grid forms, radio buttons, checkboxes)
    const prev = element.previousElementSibling;
    if (prev && (prev.tagName === "LABEL" || prev.tagName === "SPAN" || prev.tagName === "DIV" || prev.tagName === "P")) {
      const lbl = text(prev);
      if (lbl && lbl.length < 80) return limited(lbl);
    }
    const next = element.nextElementSibling;
    if (next && (next.tagName === "LABEL" || next.tagName === "SPAN" || next.tagName === "DIV" || next.tagName === "P")) {
      const lbl = text(next);
      if (lbl && lbl.length < 80) return limited(lbl);
    }

    // 7. Preceding table cell in same row (common in government portals)
    const td = element.closest("td");
    if (td && td.previousElementSibling) {
      const prevTd = td.previousElementSibling;
      const lbl = text(prevTd);
      if (lbl && lbl.length < 80) return limited(lbl);
    }

    // 8. Placeholder
    const placeholder = element.getAttribute("placeholder");
    if (placeholder) return limited(placeholder);

    // 9. Name or ID attribute (humanized)
    const name = element.getAttribute("name");
    if (name) return humanizeKey(name);

    const id = element.getAttribute("id");
    if (id && !id.startsWith("seva-field-")) return humanizeKey(id);

    // 10. Title attribute
    const title = element.getAttribute("title");
    if (title) return limited(title);

    return "";
  }

  function classifyPage() {
    const titleLower = (document.title || "").toLowerCase();
    const urlLower = location.href.toLowerCase();

    // Check for login
    const hasPassword = Boolean(document.querySelector("input[type='password']"));
    const textSample = text(document.body).slice(0, 4000).toLowerCase();

    if (hasPassword && (/login|sign in|portal login|applicant login/.test(titleLower) || /login|sign in/.test(textSample))) {
      return "LOGIN";
    }

    // Check for success / confirmation
    if (/acknowledgement|application submitted|success|registered successfully/.test(titleLower) || /application submitted successfully|acknowledgement receipt/.test(textSample)) {
      return "SUCCESS";
    }

    // Check for dedicated payment gateway
    if (urlLower.includes("payment") || urlLower.includes("checkout") || urlLower.includes("billdesk") || urlLower.includes("razorpay") || /fee payment|payment gateway/.test(titleLower)) {
      return "PAYMENT";
    }

    // Check for forms with inputs
    const controls = document.querySelectorAll("input:not([type='hidden']), select, textarea");
    if (controls.length > 0) {
      return "APPLICATION_FORM";
    }

    return "UNKNOWN";
  }

  function detectSensitiveSignals() {
    const signals = [];
    const textSample = text(document.body).slice(0, 8000).toLowerCase();

    // Check if CAPTCHA is present
    if (document.querySelector("input[name*='captcha' i], input[id*='captcha' i], img[src*='captcha' i], .g-recaptcha, .h-captcha")) {
      signals.push("CAPTCHA");
    }

    // Check if OTP input is present
    if (document.querySelector("input[autocomplete='one-time-code'], input[name*='otp' i], input[id*='otp' i]")) {
      signals.push("OTP");
    }

    // Check if payment section is present
    if (document.querySelector("input[name*='card' i], input[id*='cvv' i], .payment-options")) {
      signals.push("PAYMENT");
    }

    // Check if dedicated declaration checkbox is present
    if (document.querySelector("input[type='checkbox'][name*='declare' i], input[type='checkbox'][id*='declare' i], input[type='checkbox'][name*='terms' i]")) {
      signals.push("DECLARATION");
    }

    return signals;
  }

  function analyze() {
    const allControls = [...document.querySelectorAll(CONTROL_SELECTOR)];
    const fields = allControls.slice(0, 150).map((element, index) => {
      const id = element.id || `seva-field-${index}`;
      if (!element.id) element.dataset.sevaId = id;

      const attributes = {};
      ["name", "placeholder", "aria-label", "autocomplete", "inputmode", "type"].forEach((name) => {
        const val = element.getAttribute(name);
        if (val) attributes[name] = limited(val, 120);
      });

      return {
        id,
        tag: element.tagName.toLowerCase(),
        type: (element.type || element.getAttribute("type") || element.tagName.toLowerCase()).toLowerCase(),
        label: labelFor(element),
        name: element.name || element.getAttribute("name") || "",
        placeholder: element.placeholder || element.getAttribute("placeholder") || "",
        value: element.value || "",
        required: element.required || element.getAttribute("aria-required") === "true",
        options: element.tagName === "SELECT" ? [...element.options].map((opt) => limited(opt.text, 100)) : undefined,
        attributes,
      };
    });

    const documents = fields
      .filter((f) => f.type === "file")
      .map((f) => ({
        id: f.id,
        label: f.label || "Document upload",
        instruction: "Choose your prepared document from your local storage directly in the official portal file picker.",
      }));

    const validationMessages = [...document.querySelectorAll("[role='alert'], .error, .errors, .validation-message, .invalid-feedback, .text-danger, .has-error")]
      .map(text)
      .filter(Boolean)
      .slice(0, 15)
      .map((m) => limited(m));

    const pageType = classifyPage();
    const sensitiveSignals = detectSensitiveSignals();

    return {
      pageType,
      url: location.href,
      title: limited(document.title),
      fields,
      documents,
      validationMessages,
      sensitiveSignals,
      observedAt: new Date().toISOString(),
    };
  }

  window.SevaPageAnalyzer = {
    analyze,
    labelFor,
    classifyPage,
  };
})();
