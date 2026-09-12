import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

console.log("=== SEVA SAARTHI CHROME EXTENSION PACKAGER ===\n");

const EXTENSION_DIR = path.resolve("extension");
const DIST_DIR = path.resolve("dist");

if (!fs.existsSync(EXTENSION_DIR)) {
  console.error("❌ Error: extension directory does not exist!");
  process.exit(1);
}

// 1. Read manifest.json
const manifestRaw = fs.readFileSync(path.join(EXTENSION_DIR, "manifest.json"), "utf8");
let manifest;
try {
  manifest = JSON.parse(manifestRaw);
} catch (e) {
  console.error("❌ Error: extension/manifest.json is not valid JSON:", e.message);
  process.exit(1);
}

const version = manifest.version || "1.0.0";
console.log(`📦 Packaging Seva Saarthi Extension v${version}...`);

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 2. Gather all files in extension/ recursively
function getFiles(dir, base = "") {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const relPath = path.join(base, file).replace(/\\/g, "/");
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, relPath));
    } else {
      results.push({ fullPath: filePath, relPath, stat });
    }
  }
  return results;
}

const files = getFiles(EXTENSION_DIR);
console.log(`Found ${files.length} files to package:`);
files.forEach((f) => console.log(`  - ${f.relPath} (${f.stat.size} bytes)`));

// 3. Simple pure-Node.js ZIP generator (PKZIP 2.0 format)
function createZip(entries) {
  const localHeaders = [];
  const centralDirs = [];
  let offset = 0;

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let c = (crc ^ buf[i]) & 0xff;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  for (const entry of entries) {
    const uncompressedData = fs.readFileSync(entry.fullPath);
    const uncompressedSize = uncompressedData.length;
    const crc = crc32(uncompressedData);
    const compressedData = zlib.deflateRawSync(uncompressedData);
    const compressedSize = compressedData.length;
    const nameBuf = Buffer.from(entry.relPath, "utf8");

    // DOS Date & Time (fixed constant for reproducibility)
    const dosTime = 0x54cd; // 10:38:26
    const dosDate = 0x5cd3; // 2026-09-11

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed: 2.0
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // compression method: Deflate
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory header
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // compression method: Deflate
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra field len
    centralHeader.writeUInt16LE(0, 32); // file comment len
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0, 38); // external file attributes
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralDirs.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralDirs.reduce((acc, b) => acc + b.length, 0);

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(entries.length, 8); // total entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12); // size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // offset of central directory
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, ...centralDirs, eocd]);
}

const zipBuffer = createZip(files);
const versionedZipPath = path.join(DIST_DIR, `seva-saarthi-extension-v${version}.zip`);
const latestZipPath = path.join(DIST_DIR, "seva-saarthi-extension.zip");

fs.writeFileSync(versionedZipPath, zipBuffer);
fs.writeFileSync(latestZipPath, zipBuffer);

console.log("\n=======================================================");
console.log(`✅ Extension successfully packaged!`);
console.log(`📁 Versioned bundle: dist/seva-saarthi-extension-v${version}.zip (${zipBuffer.length} bytes)`);
console.log(`📁 Latest bundle:    dist/seva-saarthi-extension.zip (${zipBuffer.length} bytes)`);
console.log("=======================================================\n");

console.log("Next steps to use or publish:");
console.log("1. FOR LOCAL DEVELOPMENT:");
console.log("   - Open Chrome browser -> chrome://extensions/");
console.log("   - Toggle 'Developer mode' (top right)");
console.log("   - Click 'Load unpacked' -> Select the 'extension' folder");
console.log("");
console.log("2. FOR CHROME WEB STORE PUBLISHING:");
console.log("   - Visit https://chrome.google.com/webstore/devconsole");
console.log(`   - Upload 'dist/seva-saarthi-extension-v${version}.zip'`);
console.log("   - Complete the store listing, privacy disclosures, and submit for review.");
