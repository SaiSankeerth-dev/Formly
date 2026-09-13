(() => {
  // 1. Listen for ACTIVATE_SERVICE and LAUNCH_SERVICE events
  const handleActivateService = (e) => {
    const payload = e.detail || (e.data && e.data.data);
    if (payload) {
      chrome.runtime.sendMessage({
        type: "ACTIVATE_SERVICE",
        payload: payload,
      });
    }
  };

  // 2. Listen for SYNC_PROFILE event from web app
  const handleSyncProfile = (e) => {
    const payload = e.detail || (e.data && e.data.data);
    if (payload) {
      chrome.runtime.sendMessage({
        type: "SYNC_PROFILE_DATA",
        payload: payload,
      });
    }
  };

  // 2b. Listen for SEVA_SAARTHI_PREPARED_DOCUMENTS event from PAN document preparation
  const handlePreparedDocuments = (e) => {
    const payload = e.detail || (e.data && e.data.data);
    if (payload) {
      chrome.runtime.sendMessage({
        type: "SYNC_PREPARED_DOCUMENTS",
        payload: payload,
      });
    }
  };

  window.addEventListener("SEVA_SAARTHI_ACTIVATE_SERVICE", handleActivateService);
  document.addEventListener("SEVA_SAARTHI_ACTIVATE_SERVICE", handleActivateService);
  window.addEventListener("SEVA_SAARTHI_LAUNCH_SERVICE", handleActivateService);
  document.addEventListener("SEVA_SAARTHI_LAUNCH_SERVICE", handleActivateService);

  window.addEventListener("SEVA_SAARTHI_SYNC_PROFILE", handleSyncProfile);
  document.addEventListener("SEVA_SAARTHI_SYNC_PROFILE", handleSyncProfile);

  window.addEventListener("SEVA_SAARTHI_PREPARED_DOCUMENTS", handlePreparedDocuments);
  document.addEventListener("SEVA_SAARTHI_PREPARED_DOCUMENTS", handlePreparedDocuments);

  window.addEventListener("message", (e) => {
    if (e.data && (e.data.type === "SEVA_SAARTHI_ACTIVATE_SERVICE" || e.data.type === "SEVA_SAARTHI_LAUNCH_SERVICE")) {
      handleActivateService(e);
    }
    if (e.data && e.data.type === "SEVA_SAARTHI_SYNC_PROFILE") {
      handleSyncProfile(e);
    }
    if (e.data && e.data.type === "SEVA_SAARTHI_PREPARED_DOCUMENTS") {
      handlePreparedDocuments(e);
    }
  });

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
