import { chromium } from "playwright";

async function reproducePhoneOtpBrowser() {
  console.log("=================================================");
  console.log("   STEP 1 & 2: REPRODUCING PHONE OTP IN REAL BROWSER ");
  console.log("=================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const networkTraffic = [];
  const consoleMessages = [];

  page.on("console", (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  page.on("request", (req) => {
    if (req.url().includes("supabase") || req.url().includes("/api/")) {
      networkTraffic.push({
        event: "REQUEST",
        url: req.url(),
        method: req.method(),
        postData: req.postData(),
        headers: req.headers(),
      });
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("supabase") || res.url().includes("/api/")) {
      let body = "";
      try {
        body = await res.text();
      } catch (e) {
        body = `[Failed to read body: ${e.message}]`;
      }
      networkTraffic.push({
        event: "RESPONSE",
        url: res.url(),
        status: res.status(),
        statusText: res.statusText(),
        headers: res.headers(),
        body: body,
      });
    }
  });

  console.log("Navigating to http://localhost:3000/login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  console.log("Clicking 'Phone' login tab...");
  const phoneTab = page.locator("button:has-text('Phone')");
  await phoneTab.click();
  await page.waitForTimeout(500);

  console.log("Entering phone number: 8499801489...");
  const phoneInput = page.locator("#citizen-phone-input");
  await phoneInput.fill("8499801489");
  await page.waitForTimeout(300);

  console.log("Clicking 'Send OTP' button (#citizen-send-otp-btn)...");
  const sendOtpBtn = page.locator("#citizen-send-otp-btn");
  await sendOtpBtn.click();

  // Wait for the Supabase network response and UI update
  console.log("Waiting for network response and UI state update...");
  await page.waitForTimeout(3000);

  // Capture UI status message
  const statusEl = page.locator(".bg-rose-50, .bg-emerald-50, .bg-amber-50");
  let uiMessage = "";
  if (await statusEl.isVisible()) {
    uiMessage = (await statusEl.textContent()).trim();
  }

  console.log("\n=================================================");
  console.log("   RECORDED BROWSER EVIDENCE");
  console.log("=================================================");
  console.log("UI Displayed Message:", uiMessage);

  console.log("\n--- Recorded Console Messages ---");
  for (const c of consoleMessages) {
    if (c.text.includes("[PHONE_AUTH]") || c.type === "error" || c.text.includes("supabase")) {
      console.log(`[CONSOLE ${c.type.toUpperCase()}]`, c.text);
    }
  }

  console.log("\n--- Recorded Network Traffic ---");
  for (const item of networkTraffic) {
    console.log(`\n[${item.event}] ${item.method || item.status} ${item.url}`);
    if (item.postData) console.log("Request Payload:", item.postData);
    if (item.body) console.log("Response Body:", item.body);
  }

  // Save screenshot
  await page.screenshot({ path: "scratch/phone_otp_reproduce.png", fullPage: true });
  console.log("\nSaved reproduction screenshot to scratch/phone_otp_reproduce.png");

  await browser.close();
}

reproducePhoneOtpBrowser().catch((err) => {
  console.error("Reproduction failed:", err);
  process.exit(1);
});
