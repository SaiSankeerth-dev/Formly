/**
 * Truecaller Request Correlation & Verification Store
 * 
 * Manages the asynchronous correlation between:
 * 1. Mobile Web / Desktop client initiating verification with a unique requestId (nonce)
 * 2. Truecaller webhook callback POST /auth/truecaller/callback delivering accessToken & endpoint
 * 3. Client polling GET /api/auth/truecaller/poll?requestId=... to retrieve session
 * 
 * Provides thread-safety via globalThis in Node.js runtime, TTL expiration (5 minutes),
 * and atomic consumption to prevent replay attacks.
 */

export interface TruecallerVerifiedPayload {
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
    email?: string;
    avatar?: string;
  };
  token: string;
  redirectTo: string;
  phone: string;
  profile?: Record<string, any>;
}

export interface TruecallerRequestRecord {
  requestId: string;
  status: "pending" | "verified" | "failed" | "consumed";
  createdAt: number;
  expiresAt: number;
  error?: string;
  data?: TruecallerVerifiedPayload;
  meta?: Record<string, any>;
}

const REQUEST_TTL_MS = 5 * 60 * 1000; // 5 minutes

declare global {
  // eslint-disable-next-line no-var
  var __formly_truecaller_store: Map<string, TruecallerRequestRecord> | undefined;
}

function getStore(): Map<string, TruecallerRequestRecord> {
  if (!globalThis.__formly_truecaller_store) {
    globalThis.__formly_truecaller_store = new Map<string, TruecallerRequestRecord>();
  }
  return globalThis.__formly_truecaller_store;
}

/**
 * Register a new pending verification request with nonce
 */
export function createPendingRequest(
  requestId: string,
  meta?: Record<string, any>
): TruecallerRequestRecord {
  const store = getStore();
  cleanupExpiredRequests();

  const now = Date.now();
  const record: TruecallerRequestRecord = {
    requestId,
    status: "pending",
    createdAt: now,
    expiresAt: now + REQUEST_TTL_MS,
    meta,
  };

  store.set(requestId, record);
  return record;
}

/**
 * Complete verification when Truecaller server webhook callback is processed
 */
export function completeVerification(
  requestId: string,
  data: TruecallerVerifiedPayload
): boolean {
  const store = getStore();
  const existing = store.get(requestId);

  const now = Date.now();
  if (existing && existing.expiresAt < now) {
    store.delete(requestId);
    return false;
  }

  const record: TruecallerRequestRecord = {
    requestId,
    status: "verified",
    createdAt: existing?.createdAt || now,
    expiresAt: (existing?.createdAt || now) + REQUEST_TTL_MS,
    data,
    meta: existing?.meta,
  };

  store.set(requestId, record);
  return true;
}

/**
 * Fail a verification request with an error message
 */
export function failVerification(requestId: string, error: string): void {
  const store = getStore();
  const existing = store.get(requestId);
  if (!existing) return;

  existing.status = "failed";
  existing.error = error;
}

/**
 * Peek at verification state without consuming it (e.g. for inspection or status checks)
 */
export function getVerification(requestId: string): TruecallerRequestRecord | null {
  const store = getStore();
  const record = store.get(requestId);
  if (!record) return null;

  if (record.expiresAt < Date.now()) {
    store.delete(requestId);
    return null;
  }

  return record;
}

/**
 * Retrieve verification state and atomically mark as consumed to prevent replay attacks
 */
export function consumeVerification(requestId: string): TruecallerRequestRecord | null {
  const store = getStore();
  const record = store.get(requestId);
  if (!record) return null;

  if (record.expiresAt < Date.now()) {
    store.delete(requestId);
    return null;
  }

  if (record.status === "verified") {
    // Return record copy and update status to consumed
    const result = { ...record };
    record.status = "consumed";
    return result;
  }

  return record;
}

/**
 * Purge stale requests past their TTL
 */
export function cleanupExpiredRequests(): void {
  const store = getStore();
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.expiresAt < now) {
      store.delete(key);
    }
  }
}
