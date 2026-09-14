const officialDomains = [
  "onlineservices.proteantech.in",
  "www.pan.utiitsl.com",
  "pan.utiitsl.com",
  "www.incometax.gov.in",
  "incometax.gov.in",
  "myaadhaar.uidai.gov.in",
  "uidai.gov.in",
  "www.uidai.gov.in",
  "voters.eci.gov.in",
  "eci.gov.in",
  "www.passportindia.gov.in",
  "services1.passportindia.gov.in",
  "passportindia.gov.in",
  "sarathi.parivahan.gov.in",
  "parivahan.gov.in",
  "serviceonline.gov.in",
  "www.digilocker.gov.in",
  "digilocker.gov.in",
  "scholarships.gov.in",
  "services.india.gov.in",
  "beneficiary.nha.gov.in",
  "www.telangana.gov.in",
  "telangana.gov.in",
  "ts.meeseva.telangana.gov.in",
  "telanganaepass.cgg.gov.in",
  "cgg.gov.in"
];

function isVerified(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      // Local development check
      if (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
        return true;
      }
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith(".gov.in") ||
      host.endsWith(".nic.in") ||
      host.endsWith(".cgg.gov.in") ||
      officialDomains.some((d) => host === d || host.endsWith("." + d))
    );
  } catch {
    return false;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== "complete") return;
  const url = changeInfo.url || tab.url || "";
  const allowed = isVerified(url);
  try {
    chrome.storage.session.set({ [`portal:${tabId}`]: { allowed, url, updatedAt: new Date().toISOString() } });
  } catch (err) {}
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (err) {}
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "VERIFY_PORTAL") {
    const url = message.url || sender.tab?.url || "";
    sendResponse({ allowed: isVerified(url), url });
    return true;
  }

  if (message.type === "ACTIVATE_SERVICE") {
    // Save to session and local storage
    chrome.storage.session.set({ activeService: message.payload });
    chrome.storage.local.set({ activeService: message.payload });
    if (message.payload?.profileMap) {
      chrome.storage.local.set({ activeProfileMap: message.payload.profileMap });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "SYNC_PROFILE_DATA") {
    const payload = message.payload || {};
    chrome.storage.local.set({ citizenProfile: payload });
    chrome.storage.session.set({ citizenProfile: payload });
    if (payload.profileMap) {
      chrome.storage.local.set({ activeProfileMap: payload.profileMap });
    }
    sendResponse({ ok: true, syncedAt: new Date().toISOString() });
    return true;
  }

  if (message.type === "CLEAR_PROFILE_DATA") {
    chrome.storage.local.remove(["citizenProfile", "activeProfileMap", "panPreparedDocuments", "activeService"]);
    try {
      chrome.storage.session.remove(["citizenProfile", "activeProfileMap", "panPreparedDocuments", "activeService"]);
    } catch {}
    sendResponse({ ok: true, clearedAt: new Date().toISOString() });
    return true;
  }

  if (message.type === "SYNC_PREPARED_DOCUMENTS") {
    const payload = message.payload || {};
    chrome.storage.local.set({ panPreparedDocuments: payload });
    sendResponse({ ok: true, syncedAt: new Date().toISOString() });
    return true;
  }

  if (message.type === "GET_PREPARED_DOCUMENTS") {
    chrome.storage.local.get(["panPreparedDocuments"], (result) => {
      sendResponse({ documents: result.panPreparedDocuments || null });
    });
    return true;
  }

  if (message.type === "GET_CITIZEN_PROFILE") {
    chrome.storage.local.get(["citizenProfile", "activeService", "activeProfileMap", "panPreparedDocuments"], (result) => {
      sendResponse({
        profile: result.citizenProfile || null,
        activeService: result.activeService || null,
        profileMap: result.activeProfileMap || null,
        panPreparedDocuments: result.panPreparedDocuments || null,
      });
    });
    return true;
  }

  if (message.type === "TRIGGER_AUTOFILL") {
    // Relay autofill command to content script of current or specified tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: "EXECUTE_AUTOFILL", profile: message.profile }, (response) => {
          sendResponse(response || { ok: false, reason: "No response from page content script" });
        });
      } else {
        sendResponse({ ok: false, reason: "No active tab found" });
      }
    });
    return true;
  }

  return true;
});
