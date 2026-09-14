import { GoogleGenAI } from "@google/genai";
import { createWorker } from "tesseract.js";
import { PDFDocument } from "pdf-lib";

async function testDependencies() {
  console.log("Testing @google/genai...");
  const ai = new GoogleGenAI({ apiKey: "test_key_sample" });
  console.log("✓ @google/genai initialized:", typeof ai.models);

  console.log("Testing pdf-lib...");
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([200, 200]);
  const pdfBytes = await pdfDoc.save();
  console.log("✓ pdf-lib created document, size:", pdfBytes.length);

  console.log("Testing tesseract.js...");
  const worker = await createWorker("eng");
  console.log("✓ tesseract.js worker created successfully");
  await worker.terminate();

  console.log("All dependencies verified successfully!");
  process.exit(0);
}

testDependencies().catch((e) => {
  console.error("Dependency verification failed:", e);
  process.exit(1);
});
