/**
 * Lightweight pure-TypeScript QR Code generator (Byte mode, Error Correction Level M/L)
 * Produces clean SVG elements without external dependencies.
 */

// QR Code Constants & Tables
const PAD0 = 0xec;
const PAD1 = 0x11;

// Galois Field GF(256) tables
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255];
}

function rsComputeGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    const root = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= poly[j];
      nextPoly[j + 1] ^= gfMultiply(poly[j], root);
    }
    poly = nextPoly;
  }
  return poly;
}

function rsEncode(data: Uint8Array, numEcBytes: number): Uint8Array {
  const genPoly = rsComputeGeneratorPoly(numEcBytes);
  const remainder = new Uint8Array(numEcBytes);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[numEcBytes - 1] = 0;
    for (let j = 0; j < numEcBytes; j++) {
      remainder[j] ^= gfMultiply(genPoly[j + 1], factor);
    }
  }
  return remainder;
}

// Version table for QR Code (Version 1 to 6, Level L/M)
interface VersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
}

const VERSIONS: VersionSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 19, ecBytes: 7 },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 34, ecBytes: 10 },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 55, ecBytes: 15 },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, ecBytes: 20 },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 108, ecBytes: 26 },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 136, ecBytes: 36 },
];

/**
 * Generate a 2D boolean grid for the QR code
 */
export function generateQrMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);

  // Pick smallest version that fits
  let version = VERSIONS[0];
  for (const v of VERSIONS) {
    if (v.dataBytes - 3 >= textBytes.length) {
      version = v;
      break;
    }
    version = v;
  }

  const { size, dataBytes, ecBytes } = version;

  // Build bitstream: Mode (4 bits: 0100 for Byte) + Count (8 bits) + Data + Terminator
  const bits: number[] = [];
  const appendBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  appendBits(0b0100, 4); // Byte mode
  appendBits(textBytes.length, 8); // Count
  for (const b of textBytes) {
    appendBits(b, 8);
  }

  // Terminator (up to 4 zeroes)
  const maxBits = dataBytes * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Convert to bytes
  const codewords = new Uint8Array(dataBytes);
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bits[i + j];
    }
    codewords[i / 8] = byteVal;
  }

  // Add pad bytes
  let padIdx = 0;
  for (let i = bits.length / 8; i < dataBytes; i++) {
    codewords[i] = padIdx % 2 === 0 ? PAD0 : PAD1;
    padIdx++;
  }

  // Error correction
  const ec = rsEncode(codewords, ecBytes);
  const finalCodewords = new Uint8Array(codewords.length + ec.length);
  finalCodewords.set(codewords, 0);
  finalCodewords.set(ec, codewords.length);

  // Initialize matrix
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean) => {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  };

  // 1. Finder patterns (7x7) + separators
  const addFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const qr = row + r;
        const qc = col + c;
        if (qr >= 0 && qr < size && qc >= 0 && qc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBlack = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setModule(qr, qc, isBlack);
          } else {
            setModule(qr, qc, false);
          }
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 3. Alignment pattern for Version >= 2
  if (version.version >= 2) {
    const alignPos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const qr = alignPos + r;
        const qc = alignPos + c;
        if (!isFunction[qr][qc]) {
          const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          setModule(qr, qc, isBlack);
        }
      }
    }
  }

  // 4. Dark module
  setModule(size - 8, 8, true);

  // 5. Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setModule(8, i, false);
    if (!isFunction[i][8]) setModule(i, 8, false);
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) setModule(8, i, false);
    if (!isFunction[i][8]) setModule(i, 8, false);
  }

  // 6. Place data bits (2-column zig-zag right to left)
  const allBits: number[] = [];
  for (const b of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((b >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit === 1) !== mask;
        }
      }
    }
    upward = !upward;
  }

  // 7. Format info for Mask 0, Level L: 0b111011111000100
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  const formatCoordsTopLeft = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];

  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoordsTopLeft[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  const formatCoordsSplit = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];

  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoordsSplit[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  return matrix;
}

/**
 * Render QR matrix as pure SVG paths
 */
export function generateQrSvgPath(matrix: boolean[][]): string {
  const size = matrix.length;
  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return path;
}
