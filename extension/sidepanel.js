(() => {
  const ui = (id) => document.getElementById(id);
  let activeTabId = null;
  let activeTabUrl = "";
  let currentProfile = null;

  async function currentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        activeTabId = tab.id;
        activeTabUrl = tab.url || "";
      }
      return tab;
    } catch {
      return null;
    }
  }

  async function ensureContentScriptInjected(tabId) {
    if (!tabId) return;
    try {
      await chrome.tabs.sendMessage(tabId, { type: "PING" });
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId, allFrames: true },
          files: ["page-analyzer.js", "policy-engine.js", "content.js"],
        });
      } catch (e) {
        // Script injection fallback
      }
    }
  }

  // Fallback default profile if not yet synced from web app
  const DEFAULT_CITIZEN_PROFILE = {
    user: {
      id: "u0000000-0000-0000-0000-000000000001",
      name: "Sai Sankeerth",
      email: "sankeerths615@gmail.com",
      phone: "9876543210",
    },
    profileMap: {
      full_name: "Sai Sankeerth",
      first_name: "Sai",
      last_name: "Sankeerth",
      surname: "Sankeerth",
      middle_name: "",
      name: "Sai Sankeerth",
      date_of_birth: "2001-08-15",
      dob: "15/08/2001",
      dob_formatted: "15/08/2001",
      dob_day: "15",
      dob_month: "08",
      dob_year: "2001",
      gender: "Male",
      mobile: "9876543210",
      phone_number: "9876543210",
      phone: "9876543210",
      email: "sankeerths615@gmail.com",
      aadhaar_number: "5492 8173 9012",
      aadhaar: "5492 8173 9012",
      aadhaar_clean: "549281739012",
      uid1: "5492",
      uid2: "8173",
      uid3: "9012",
      father_name: "Suresh Kumar",
      father_first_name: "Suresh",
      father_last_name: "Kumar",
      mother_name: "Laxmi Devi",
      mother_first_name: "Laxmi",
      mother_last_name: "Devi",
      permanent_address: "H.No 4-52/1, Green Hills Colony, Gachibowli, Hyderabad, Telangana - 500032",
      address: "H.No 4-52/1, Green Hills Colony, Gachibowli, Hyderabad, Telangana - 500032",
      pincode: "500032",
      pin_code: "500032",
      district: "Ranga Reddy",
      mandal: "Serilingampally",
      location: "Hyderabad, Telangana",
      city: "Hyderabad, Telangana",
      annual_income: "180000",
      income: "180000",
      caste_category: "OBC",
      category: "OBC",
      college_name: "National Institute of Technology",
      education_degree: "B.Tech Computer Science and Engineering",
      roll_number: "22071A0589",
      current_year: "3rd Year / 5th Sem",
      tenth_percentage: "94.2%",
      twelfth_percentage: "88.4%",
      bank_name: "State Bank of India",
      bank_account_no: "38920194821",
      bank_ifsc: "SBIN0020184",
      account_holder_name: "Sai Sankeerth",
      dbt_seeding_status: "Seeded (Active)",
      app_type: "49A",
      cat_type: "INDIVIDUAL",
      title: "SHRI",
      consent: "yes",
    },
  };
  const CONFIG = {
    apiEndpoints: [
      "https://seva-saarthi.vercel.app/api/agent/autofill",
      "https://sevasaarthi.vercel.app/api/agent/autofill",
      "http://localhost:3000/api/agent/autofill",
      "http://127.0.0.1:3000/api/agent/autofill",
    ],
  };

  async function fetchRemoteProfile() {
    const customUrl = await new Promise((res) => {
      try {
        chrome.storage.local.get(["customApiUrl"], (data) => res(data?.customApiUrl || null));
      } catch {
        res(null);
      }
    });

    const urls = customUrl ? [customUrl, ...CONFIG.apiEndpoints] : CONFIG.apiEndpoints;

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const json = await res.json();
          const canonical = json?.data?.canonicalFields || json?.canonicalFields || json?.safeData;
          if (canonical && Object.keys(canonical).length > 0) {
            return {
              user: { name: json.data?.applicant?.fullName || json.citizenProfile?.fullName || canonical.full_name || "Sai Sankeerth" },
              profileMap: canonical,
              source: url,
            };
          }
        }
      } catch {
        // Continue to next endpoint
      }
    }
    return null;
  }

  async function loadProfile() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_CITIZEN_PROFILE" }, async (response) => {
        let profile = response?.profile;
        if (response?.profileMap) {
          if (!profile) profile = {};
          profile.profileMap = response.profileMap;
        }

        if (!profile || !profile.profileMap || Object.keys(profile.profileMap).length === 0) {
          const fetched = await fetchRemoteProfile();
          if (fetched) {
            profile = fetched;
            chrome.runtime.sendMessage({ type: "SYNC_PROFILE_DATA", payload: profile });
          }
        }

        if (!profile || !profile.profileMap || Object.keys(profile.profileMap).length === 0) {
          profile = DEFAULT_CITIZEN_PROFILE;
        }

        currentProfile = profile;

        const count = Object.keys(profile.profileMap || {}).length;
        const name = profile.user?.name || profile.profileMap?.full_name || "Sai Sankeerth";
        if (ui("profile-name")) ui("profile-name").textContent = name;
        if (ui("profile-status")) ui("profile-status").textContent = `${count} verified records ready`;

        resolve(profile);
      });
    });
  }

  async function isDomainAllowed(url) {
    if (!url) return false;
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "VERIFY_PORTAL", url }, (res) => {
        if (res && typeof res.allowed === "boolean") {
          resolve(res.allowed);
        } else {
          // Direct fallback check
          try {
            const u = new URL(url);
            const host = u.hostname.toLowerCase();
            const ok =
              host.endsWith(".gov.in") ||
              host.endsWith(".nic.in") ||
              host.endsWith(".cgg.gov.in") ||
              host.includes("proteantech.in") ||
              host.includes("utiitsl.com") ||
              host === "localhost" ||
              host === "127.0.0.1";
            resolve(ok);
          } catch {
            resolve(false);
          }
        }
      });
    });
  }

  function renderPageModel(page) {
    if (!page) return;
    ui("page-title").textContent = page.title || "Government Portal Form";

    const fieldsCount = page.fields?.length || 0;
    ui("fields").textContent = `${fieldsCount} form controls identified`;

    const docsCount = page.documents?.length || 0;
    ui("documents").textContent = `${docsCount} document controls found`;

    const errCount = page.validationMessages?.length || 0;
    ui("errors").textContent = errCount ? `${errCount} portal message(s)` : "No visible validation errors";

    const sensitive = page.sensitiveSignals || [];
    ui("sensitive").classList.toggle("hidden", !sensitive.length && page.pageType !== "LOGIN");

    if (page.pageType === "LOGIN") {
      ui("sensitive-text").textContent = "Please sign in directly on the official portal. Seva Saarthi never inputs passwords.";
    } else if (sensitive.length) {
      ui("sensitive-text").textContent = `Portal requires citizen interaction for: ${sensitive.join(", ")}. Please complete directly on the portal.`;
    }
  }

  async function renderFieldsPreview(tabId) {
    const previewList = ui("fields-preview-list");
    if (!previewList) return;

    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "PREVIEW_AUTOFILL_MAPPINGS",
        profile: currentProfile,
      });

      if (response && response.preview && response.preview.length > 0) {
        previewList.innerHTML = "";
        response.preview.slice(0, 30).forEach((item) => {
          const li = document.createElement("li");

          const labelSpan = document.createElement("span");
          labelSpan.className = "field-label";
          labelSpan.textContent = item.label || item.id;
          labelSpan.title = `${item.label}: ${item.value || "Not mapped"}`;

          const tagSpan = document.createElement("span");
          tagSpan.className = "field-tag";

          if (item.status === "FILLED") {
            tagSpan.className += " tag-filled";
            tagSpan.textContent = "Filled";
          } else if (item.status === "READY_TO_AUTOFILL") {
            tagSpan.className += " tag-ready";
            tagSpan.textContent = "Ready to fill";
          } else if (item.status === "SENSITIVE_MANUAL") {
            tagSpan.className += " tag-sensitive";
            tagSpan.textContent = "Citizen only";
          } else {
            tagSpan.className += " tag-unmapped";
            tagSpan.textContent = "Unmapped";
          }

          li.appendChild(labelSpan);
          li.appendChild(tagSpan);
          previewList.appendChild(li);
        });
      } else {
        previewList.innerHTML = "<li><span class='meta'>No interactive input elements found on this page.</span></li>";
      }
    } catch (err) {
      previewList.innerHTML = "<li><span class='meta'>Refresh page to inspect live form controls.</span></li>";
    }
  }

  async function refresh() {
    const tab = await currentTab();
    if (!tab) return;

    await loadProfile();

    const allowed = await isDomainAllowed(tab.url);
    ui("unverified").classList.toggle("hidden", allowed);
    ui("active").classList.toggle("hidden", !allowed);

    if (!allowed) return;

    try {
      const host = new URL(tab.url).hostname;
      ui("portal").textContent = host;
    } catch {
      ui("portal").textContent = "Verified Portal";
    }

    await ensureContentScriptInjected(tab.id);

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "ANALYZE_PAGE" });
      if (response?.page) {
        renderPageModel(response.page);
        await renderFieldsPreview(tab.id);
      }
    } catch (err) {
      ui("guidance").textContent = "Portal is loading. Click Re-Analyze once page stabilizes.";
    }
  }

  async function handleAutofill() {
    const tab = await currentTab();
    if (!tab?.id) return;

    const btn = ui("autofill-btn");
    btn.disabled = true;
    btn.innerHTML = "<span>⏳ Filling safe fields...</span>";

    await ensureContentScriptInjected(tab.id);

    try {
      const result = await chrome.tabs.sendMessage(tab.id, {
        type: "EXECUTE_AUTOFILL",
        profile: currentProfile,
      });

      if (result && result.ok) {
        const count = result.filledCount || 0;
        const resultBox = ui("result-box");
        resultBox.classList.remove("hidden");

        const sensitiveCount = (result.sensitiveControls || []).length;
        let msg = `✅ ${count} safe field${count === 1 ? "" : "s"} filled smoothly with verified profile data!`;
        if (sensitiveCount > 0) {
          msg += ` (${sensitiveCount} security control${sensitiveCount === 1 ? "" : "s"} reserved for citizen entry)`;
        }

        ui("result-text").textContent = msg;

        // Refresh preview to show updated state
        await renderFieldsPreview(tab.id);

        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = "<span>⚡ Autofill Safe Fields</span>";
        }, 1500);
      } else {
        alert(result?.reason || "Could not autofill fields on this page.");
        btn.disabled = false;
        btn.innerHTML = "<span>⚡ Autofill Safe Fields</span>";
      }
    } catch (err) {
      alert("Autofill communication failed. Please refresh the portal page and try again.");
      btn.disabled = false;
      btn.innerHTML = "<span>⚡ Autofill Safe Fields</span>";
    }
  }

  // PAN Prepared Documents handling
  async function renderPanPreparedDocs() {
    const statusEl = ui("pan-prep-status");
    const itemsEl = ui("pan-prep-items");
    if (!statusEl || !itemsEl) return;

    chrome.storage.local.get(["panPreparedDocuments"], (res) => {
      const data = res?.panPreparedDocuments;
      const docs = data?.documents || [];
      if (docs.length > 0) {
        statusEl.textContent = `✅ ${docs.length} of 3 PAN document(s) prepared & compliant:`;
        itemsEl.innerHTML = docs
          .map(
            (d) =>
              `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #e2e8f0;">
                <span>📄 ${d.type === "photo" ? "Photo (213×213)" : d.type === "signature" ? "Signature (213×106)" : "Proof PDF"}</span>
                <strong style="color:#059669;">${(d.sizeBytes / 1024).toFixed(1)} KB</strong>
              </div>`
          )
          .join("");
      } else {
        statusEl.textContent = "0 files prepared yet. Upload photo & signature in Seva Saarthi.";
        itemsEl.innerHTML = "";
      }
    });
  }

  // Event Listeners
  ui("autofill-btn")?.addEventListener("click", handleAutofill);
  ui("refresh")?.addEventListener("click", refresh);
  ui("continue")?.addEventListener("click", refresh);
  ui("check-domain-btn")?.addEventListener("click", refresh);

  ui("open-pan-prep-btn")?.addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3000/documents/pan" });
  });

  ui("sync-profile-btn")?.addEventListener("click", async () => {
    const btn = ui("sync-profile-btn");
    btn.textContent = "...";
    await loadProfile();
    await renderPanPreparedDocs();
    const tab = await currentTab();
    if (tab?.id) await renderFieldsPreview(tab.id);
    btn.textContent = "Synced!";
    setTimeout(() => { btn.textContent = "Sync"; }, 1500);
  });

  // Listen for background page announcements
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "PAGE_MODEL" && message.page) {
      renderPageModel(message.page);
    }
  });

  // Initial load
  renderPanPreparedDocs();
  refresh();
})();
