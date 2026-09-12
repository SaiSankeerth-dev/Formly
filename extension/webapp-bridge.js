(() => {
  // 1. Listen for ACTIVATE_SERVICE event
  const handleActivateService = (e) => {
    chrome.runtime.sendMessage({
      type: "ACTIVATE_SERVICE",
      payload: e.detail,
    });
  };

  // 2. Listen for SYNC_PROFILE event from web app
  const handleSyncProfile = (e) => {
    if (e.detail) {
      chrome.runtime.sendMessage({
        type: "SYNC_PROFILE_DATA",
        payload: e.detail,
      });
    }
  };

  window.addEventListener("SEVA_SAARTHI_ACTIVATE_SERVICE", handleActivateService);
  document.addEventListener("SEVA_SAARTHI_ACTIVATE_SERVICE", handleActivateService);

  window.addEventListener("SEVA_SAARTHI_SYNC_PROFILE", handleSyncProfile);
  document.addEventListener("SEVA_SAARTHI_SYNC_PROFILE", handleSyncProfile);

  // 3. Proactively read saved profile from localStorage if present
  try {
    const raw = localStorage.getItem("seva_saarthi_active_profile");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        chrome.runtime.sendMessage({
          type: "SYNC_PROFILE_DATA",
          payload: parsed,
        });
      }
    }
  } catch (err) {
    // Ignore storage restrictions
  }

  // 4. Request latest profile from webapp page
  window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_REQUEST_PROFILE"));
  document.dispatchEvent(new CustomEvent("SEVA_SAARTHI_REQUEST_PROFILE"));

  // 5. Listen for messages from extension background / sidepanel to request webapp sync
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "REQUEST_WEBAPP_PROFILE_SYNC") {
      try {
        const raw = localStorage.getItem("seva_saarthi_active_profile");
        if (raw) {
          const parsed = JSON.parse(raw);
          sendResponse({ ok: true, profile: parsed });
          return true;
        }
      } catch (err) {}
      window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_REQUEST_PROFILE"));
      document.dispatchEvent(new CustomEvent("SEVA_SAARTHI_REQUEST_PROFILE"));
      sendResponse({ ok: true, requested: true });
    }
    return true;
  });
})();
