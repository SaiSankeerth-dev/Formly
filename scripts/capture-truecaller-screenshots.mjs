import { chromium } from "playwright";
import path from "path";
import fs from "fs";

async function main() {
  const artifactDir = "C:\\Users\\V. Sai Sankeerth\\.gemini\\antigravity\\brain\\9d40b4eb-f3ad-4d85-8676-4d0e98854ddb";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.locator("button:has-text('Phone OTP')").click();
  await page.waitForTimeout(500);

  const shot1 = path.join(artifactDir, "truecaller-phone-tab.png");
  await page.screenshot({ path: shot1 });
  console.log("Saved shot 1 to:", shot1);

  await page.locator("#citizen-truecaller-btn").click();
  await page.waitForTimeout(500);

  const shot2 = path.join(artifactDir, "truecaller-qr-modal.png");
  await page.screenshot({ path: shot2 });
  console.log("Saved shot 2 to:", shot2);

  await browser.close();
}

main().catch(console.error);
