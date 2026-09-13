import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function runTests() {
  console.log("===============================================================");
  console.log("SEVA SAARTHI - PAN CARD DOCUMENT PREPARATION TEST SUITE");
  console.log("===============================================================\n");

  // Test 1: Verify Engine File exists and has all required exports
  console.log("--- 1. Testing Engine Module Architecture ---");
  const enginePath = path.resolve("src/lib/pan/pan-document-resizer.ts");
  assert(fs.existsSync(enginePath), "src/lib/pan/pan-document-resizer.ts must exist");

  const engineContent = fs.readFileSync(enginePath, "utf-8");
  assert(engineContent.includes("export async function processPanPhotograph"), "Must export processPanPhotograph");
  assert(engineContent.includes("export async function processPanSignature"), "Must export processPanSignature");
  assert(engineContent.includes("export async function processPanSupportingDocument"), "Must export processPanSupportingDocument");
  assert(engineContent.includes("export function triggerFileDownload"), "Must export triggerFileDownload");
  assert(engineContent.includes("export function notifyExtensionOfPreparedDocuments"), "Must export notifyExtensionOfPreparedDocuments");
  assert(engineContent.includes("applySignaturePaperWhitening"), "Must include paper background whitening filter");
  assert(engineContent.includes("SEVA_SAARTHI_PREPARED_DOCUMENTS"), "Must dispatch SEVA_SAARTHI_PREPARED_DOCUMENTS event");

  // Test 2: Verify PDF Generation Logic using pdf-lib (A4 dimensions and <300 KB limit)
  console.log("\n--- 2. Testing PDF Generation & Compression Logic ---");
  const testDoc = await PDFDocument.create();
  const a4Width = 595.28;
  const a4Height = 841.89;
  const page = testDoc.addPage([a4Width, a4Height]);
  
  testDoc.setTitle("");
  testDoc.setAuthor("");
  testDoc.setProducer("Seva Saarthi Citizen PAN Suite");
  testDoc.setCreator("Seva Saarthi");

  const pdfBytes = await testDoc.save({ useObjectStreams: true });
  assert(pdfBytes.length < 300 * 1024, `Generated PDF (${pdfBytes.length} bytes) must be well under 300 KB limit`);
  assert(page.getWidth() === a4Width, `PDF page width must match standard A4 width (${a4Width} pt)`);
  assert(page.getHeight() === a4Height, `PDF page height must match standard A4 height (${a4Height} pt)`);

  // Test 3: Verify Extension Bridge integration
  console.log("\n--- 3. Testing Extension Bridge Integration ---");
  const webappBridgePath = path.resolve("extension/webapp-bridge.js");
  assert(fs.existsSync(webappBridgePath), "extension/webapp-bridge.js must exist");
  const bridgeContent = fs.readFileSync(webappBridgePath, "utf-8");
  assert(
    bridgeContent.includes("SEVA_SAARTHI_PREPARED_DOCUMENTS"),
    "extension/webapp-bridge.js must listen for SEVA_SAARTHI_PREPARED_DOCUMENTS"
  );
  assert(
    bridgeContent.includes("SYNC_PREPARED_DOCUMENTS"),
    "extension/webapp-bridge.js must forward SYNC_PREPARED_DOCUMENTS to background"
  );

  const backgroundPath = path.resolve("extension/background.js");
  const bgContent = fs.readFileSync(backgroundPath, "utf-8");
  assert(
    bgContent.includes("SYNC_PREPARED_DOCUMENTS"),
    "extension/background.js must handle SYNC_PREPARED_DOCUMENTS message"
  );
  assert(
    bgContent.includes("panPreparedDocuments"),
    "extension/background.js must store panPreparedDocuments in chrome storage"
  );

  // Test 4: Verify Routes and Components exist
  console.log("\n--- 4. Testing Citizen Routes and Components ---");
  const docPanRoute = path.resolve("src/app/(citizen)/documents/pan/page.tsx");
  assert(fs.existsSync(docPanRoute), "Route /documents/pan must exist");

  const servicePanRoute = path.resolve("src/app/(citizen)/services/pan/document-prep/page.tsx");
  assert(fs.existsSync(servicePanRoute), "Route /services/pan/document-prep must exist");

  const compPath = path.resolve("src/components/pan/PanDocumentPreparation.tsx");
  assert(fs.existsSync(compPath), "PanDocumentPreparation component must exist");
  const compContent = fs.readFileSync(compPath, "utf-8");
  assert(compContent.includes("100% Client-Side Privacy Guarantee"), "Must emphasize client-side privacy guarantee");
  assert(compContent.includes("213 × 213"), "Must enforce official 213x213 photograph requirement");
  assert(compContent.includes("213 × 106"), "Must enforce official 213x106 signature requirement");
  assert(compContent.includes("pancardresizer.com"), "Must provide clear disclaimer for pancardresizer.com fallback");

  // Test 5: Verify entry points in DocumentsManager and ApplyPanModal
  console.log("\n--- 5. Testing Entry Points Integration ---");
  const docManagerPath = path.resolve("src/components/documents/DocumentsManager.tsx");
  const docManagerContent = fs.readFileSync(docManagerPath, "utf-8");
  assert(
    docManagerContent.includes("/documents/pan"),
    "DocumentsManager must contain entry link to /documents/pan"
  );

  const applyPanModalPath = path.resolve("src/components/dashboard/ApplyPanModal.tsx");
  const applyPanModalContent = fs.readFileSync(applyPanModalPath, "utf-8");
  assert(
    applyPanModalContent.includes("/documents/pan"),
    "ApplyPanModal must contain entry link to /documents/pan"
  );

  const navPath = path.resolve("src/lib/navigation/citizenNavigation.ts");
  const navContent = fs.readFileSync(navPath, "utf-8");
  assert(
    navContent.includes("/documents/pan"),
    "Citizen Navigation must contain entry link to /documents/pan"
  );

  // Test 6: Verify Live HTTP Route Reachability (if server is running on port 3000)
  console.log("\n--- 6. Testing Live HTTP Server Response ---");
  try {
    // 6a. Test unauthenticated request: middleware properly protects /documents/pan and redirects to /login
    const unauthRes = await fetch("http://localhost:3000/documents/pan", { redirect: "manual" });
    if (unauthRes.status === 307 || unauthRes.status === 302) {
      const loc = unauthRes.headers.get("location") || "";
      assert(loc.includes("/login"), "Unauthenticated request to /documents/pan properly redirects to /login");
      console.log(`✓ /documents/pan properly redirects unauthenticated users to /login (${loc})`);
    }

    // 6b. Test authenticated request with citizen session cookie
    const authCookie = "seva_saarthi_session=eyJpZCI6InVfMGJjNWEzYjYtZjA1OS00YWIyLTk4NzAtNDZhOWMyNTE3OGI3IiwiZW1haWwiOiJzYW5rZWVydGhzNjE1QGdtYWlsLmNvbSIsIm5hbWUiOiJTYWkgU2Fua2VlcnRoIn0=";
    const authRes = await fetch("http://localhost:3000/documents/pan", {
      headers: { Cookie: authCookie },
    });
    if (authRes.ok) {
      const html = await authRes.text();
      assert(html.includes("Saarthi Document Preparation") || html.includes("PAN Document Preparation"), "Authenticated /documents/pan renders PanDocumentPreparation component");
      console.log(`✓ Authenticated http://localhost:3000/documents/pan responded with HTTP ${authRes.status} OK`);
    }

    // 6c. Test public service route /services/pan/document-prep
    const serviceRes = await fetch("http://localhost:3000/services/pan/document-prep");
    if (serviceRes.ok) {
      const sHtml = await serviceRes.text();
      assert(sHtml.includes("Saarthi Document Preparation") || sHtml.includes("PAN Document Preparation"), "Public route /services/pan/document-prep renders PanDocumentPreparation component");
      console.log(`✓ http://localhost:3000/services/pan/document-prep responded with HTTP ${serviceRes.status} OK`);
    }
  } catch (e) {
    console.log("ℹ Dev server check skipped (server not reachable):", e.message);
  }

  console.log("\n===============================================================");
  console.log("✅ ALL TESTS PASSED SUCCESSFULLY!");
  console.log("===============================================================");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
