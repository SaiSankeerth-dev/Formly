document.getElementById("btn-autofill").addEventListener("click", async () => {
  const btn = document.getElementById("btn-autofill");
  btn.innerText = "⏳ Autofilling Form...";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    // Try sending message to content script
    chrome.tabs.sendMessage(tab.id, { action: "AUTOFILL_NOW" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Fallback: inject content script directly and trigger
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["content.js"],
        }).then(() => {
          chrome.tabs.sendMessage(tab.id, { action: "AUTOFILL_NOW" });
        });
      }
    });

    setTimeout(() => {
      btn.innerText = "✓ Autofill Executed!";
      setTimeout(() => {
        btn.innerText = "⚡ AUTOFILL THIS PAGE";
      }, 1500);
    }, 600);
  }
});

document.getElementById("btn-open-formly").addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:3000" });
});
