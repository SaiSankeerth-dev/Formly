import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ProfileField, DocumentRow, ExtractedField, RequirementStatusRow, ServiceRequirement } from "@/types";
import { INITIAL_REQUIREMENTS } from "@/lib/mock-data/initial-state";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "formly-db.json");

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  salt: string;
  role: string;
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  profiles: Record<string, ProfileField[]>;
  documents: Record<string, DocumentRow[]>;
  extractedFields: Record<string, ExtractedField[]>;
  requirementStatuses: Record<string, RequirementStatusRow[]>;
}

// In-memory cache synced to disk
let dbMemory: DatabaseSchema | null = null;

function ensureDbFile(): DatabaseSchema {
  if (dbMemory) return dbMemory;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, "utf8");
      dbMemory = JSON.parse(data);
      return dbMemory!;
    } catch (e) {
      console.warn("[Formly DB] Error parsing db file, initializing fresh db", e);
    }
  }

  const initialDb: DatabaseSchema = {
    users: [],
    sessions: [],
    profiles: {},
    documents: {},
    extractedFields: {},
    requirementStatuses: {},
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
  dbMemory = initialDb;
  return dbMemory;
}

function persistDb() {
  if (!dbMemory) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(dbMemory, null, 2), "utf8");
}

// ----------------------------------------------------------------------
// Password Hashing & Security
// ----------------------------------------------------------------------
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 100000, 64, "sha512").toString("hex");
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: calculatedHash } = hashPassword(password, salt);
  const hashBuffer = Buffer.from(hash, "hex");
  const calcBuffer = Buffer.from(calculatedHash, "hex");
  if (hashBuffer.length !== calcBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, calcBuffer);
}

// ----------------------------------------------------------------------
// User Management
// ----------------------------------------------------------------------
export function registerUser(name: string, email: string, password: string, phone?: string): { user: Omit<UserRecord, "passwordHash" | "salt">; token: string } {
  const db = ensureDbFile();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = db.users.find((u) => u.email === normalizedEmail);
  if (existing) {
    throw new Error("An account with this email address already exists.");
  }

  const { hash, salt } = hashPassword(password);
  const userId = `u_${crypto.randomUUID()}`;

  const newUser: UserRecord = {
    id: userId,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || "",
    passwordHash: hash,
    salt,
    role: "Applicant / Citizen",
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  // Initialize fresh, empty citizen profile for this user
  db.profiles[userId] = [
    {
      id: `pf_${userId}_fullname`,
      user_id: userId,
      field_name: "full_name",
      value: name.trim(),
      source_document_id: null,
      confidence: 1.0,
      verified: true,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `pf_${userId}_email`,
      user_id: userId,
      field_name: "email",
      value: normalizedEmail,
      source_document_id: null,
      confidence: 1.0,
      verified: true,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    ...(phone
      ? [
          {
            id: `pf_${userId}_phone`,
            user_id: userId,
            field_name: "phone_number",
            value: phone.trim(),
            source_document_id: null,
            confidence: 1.0,
            verified: true,
            confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      : []),
  ];

  db.documents[userId] = [];
  db.extractedFields[userId] = [];

  // Compute initial requirement status (0% initially, or matched against provided name/email)
  recomputeRequirementStatuses(userId, "s001");

  // Create session
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  db.sessions.push({ token, userId, expiresAt });

  persistDb();

  const { passwordHash, salt: _, ...safeUser } = newUser;
  return { user: safeUser, token };
}

export function loginUser(email: string, password: string): { user: Omit<UserRecord, "passwordHash" | "salt">; token: string } {
  const db = ensureDbFile();
  const normalizedEmail = email.trim().toLowerCase();

  const user = db.users.find((u) => u.email === normalizedEmail);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  // Create session
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({ token, userId: user.id, expiresAt });

  persistDb();

  const { passwordHash, salt: _, ...safeUser } = user;
  return { user: safeUser, token };
}

export function authenticateSession(token: string): Omit<UserRecord, "passwordHash" | "salt"> | null {
  if (!token) return null;
  const db = ensureDbFile();

  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    // Expired
    db.sessions = db.sessions.filter((s) => s.token !== token);
    persistDb();
    return null;
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return null;

  const { passwordHash, salt: _, ...safeUser } = user;
  return safeUser;
}

export function logoutSession(token: string): boolean {
  const db = ensureDbFile();
  const beforeLen = db.sessions.length;
  db.sessions = db.sessions.filter((s) => s.token !== token);
  persistDb();
  return db.sessions.length < beforeLen;
}

// ----------------------------------------------------------------------
// User Profile & Document Methods
// ----------------------------------------------------------------------
export function getUserProfileFields(userId: string): ProfileField[] {
  const db = ensureDbFile();
  return db.profiles[userId] || [];
}

export function updateUserProfileField(
  userId: string,
  fieldName: string,
  value: string,
  sourceDocId: string | null = null,
  confidence: number | null = null
): ProfileField {
  const db = ensureDbFile();
  if (!db.profiles[userId]) db.profiles[userId] = [];

  const existingIndex = db.profiles[userId].findIndex((f) => f.field_name === fieldName);
  const now = new Date().toISOString();

  let field: ProfileField;

  if (existingIndex >= 0) {
    field = {
      ...db.profiles[userId][existingIndex],
      value,
      source_document_id: sourceDocId !== undefined ? sourceDocId : db.profiles[userId][existingIndex].source_document_id,
      confidence: confidence !== undefined ? confidence : db.profiles[userId][existingIndex].confidence,
      verified: true,
      confirmed_at: now,
      updated_at: now,
    };
    db.profiles[userId][existingIndex] = field;
  } else {
    field = {
      id: `pf_${userId}_${fieldName}`,
      user_id: userId,
      field_name: fieldName,
      value,
      source_document_id: sourceDocId,
      confidence: confidence,
      verified: true,
      confirmed_at: now,
      created_at: now,
      updated_at: now,
    };
    db.profiles[userId].push(field);
  }

  // Auto recompute requirement status for active schemes
  recomputeRequirementStatuses(userId, "s001");
  persistDb();
  return field;
}

export function getUserDocuments(userId: string): DocumentRow[] {
  const db = ensureDbFile();
  return db.documents[userId] || [];
}

export function getUserExtractedFields(userId: string): ExtractedField[] {
  const db = ensureDbFile();
  return db.extractedFields[userId] || [];
}

export function addDocumentForUser(userId: string, doc: DocumentRow, fields: ExtractedField[]) {
  const db = ensureDbFile();
  if (!db.documents[userId]) db.documents[userId] = [];
  if (!db.extractedFields[userId]) db.extractedFields[userId] = [];

  // If another document of same type exists, supersede it
  db.documents[userId] = db.documents[userId].map((d) => {
    if (d.document_type === doc.document_type && d.id !== doc.id && !d.is_superseded) {
      return { ...d, is_superseded: true, updated_at: new Date().toISOString() };
    }
    return d;
  });

  db.documents[userId].unshift(doc);
  db.extractedFields[userId].push(...fields);

  persistDb();
}

export function deleteDocumentForUser(userId: string, docId: string): boolean {
  const db = ensureDbFile();
  if (!db.documents[userId]) return false;

  db.documents[userId] = db.documents[userId].filter((d) => d.id !== docId);
  if (db.extractedFields[userId]) {
    db.extractedFields[userId] = db.extractedFields[userId].filter((ef) => ef.document_id !== docId);
  }

  recomputeRequirementStatuses(userId, "s001");
  persistDb();
  return true;
}

export function acceptExtractedFieldForUser(userId: string, docId: string, fieldId: string, customValue?: string): ProfileField | null {
  const db = ensureDbFile();
  const fields = db.extractedFields[userId] || [];
  const targetField = fields.find((f) => f.id === fieldId && f.document_id === docId);

  if (!targetField) return null;

  targetField.accepted = true;
  const valueToSave = customValue !== undefined && customValue !== null ? customValue : (targetField.normalized_value || targetField.raw_value);

  const updatedProfileField = updateUserProfileField(
    userId,
    targetField.field_name,
    valueToSave,
    docId,
    targetField.confidence
  );

  // Update doc status to VERIFIED if all accepted
  const docFields = fields.filter((f) => f.document_id === docId);
  const allAccepted = docFields.length > 0 && docFields.every((f) => f.accepted);
  if (allAccepted) {
    const doc = (db.documents[userId] || []).find((d) => d.id === docId);
    if (doc) doc.status = "VERIFIED";
  }

  recomputeRequirementStatuses(userId, "s001");
  persistDb();
  return updatedProfileField;
}

export function rejectExtractedFieldForUser(userId: string, docId: string, fieldId: string): boolean {
  const db = ensureDbFile();
  const fields = db.extractedFields[userId] || [];
  const targetField = fields.find((f) => f.id === fieldId && f.document_id === docId);
  if (!targetField) return false;

  targetField.accepted = false;
  persistDb();
  return true;
}

// ----------------------------------------------------------------------
// Requirement Matching Engine (F8, F9, F10)
// ----------------------------------------------------------------------
export function getUserRequirementStatuses(userId: string, serviceId = "s001"): RequirementStatusRow[] {
  const db = ensureDbFile();
  return db.requirementStatuses[userId] || [];
}

export function recomputeRequirementStatuses(userId: string, serviceId = "s001"): RequirementStatusRow[] {
  const db = ensureDbFile();
  const currentStatuses = db.requirementStatuses[userId] || [];
  const profile = db.profiles[userId] || [];
  const docs = (db.documents[userId] || []).filter((d) => !d.is_superseded);

  const requirements = INITIAL_REQUIREMENTS.filter((r) => r.service_id === serviceId);

  const updatedStatuses: RequirementStatusRow[] = requirements.map((req) => {
    const existing = currentStatuses.find((s) => s.requirement_id === req.id);

    // Rule: Locked manual overrides are NEVER overwritten by automatic recomputation
    if (existing && existing.locked && existing.status === "MANUALLY_RESOLVED") {
      return existing;
    }

    // 1. Personal Information Requirement
    if (req.requirement_type === "PERSONAL_INFORMATION") {
      const matchingField = profile.find(
        (f) => f.field_name === req.field_name && f.verified && f.value && f.value.trim().length > 0
      );

      if (matchingField) {
        return {
          id: existing?.id || `reqstat_${userId}_${req.id}`,
          user_id: userId,
          requirement_id: req.id,
          status: "SATISFIED",
          satisfied_by_document_id: null,
          satisfied_by_field_name: matchingField.field_name,
          resolved_note: null,
          locked: false,
          updated_at: new Date().toISOString(),
        };
      }
    }

    // 2. Document Requirement
    const matchingDoc = docs.find(
      (d) => d.document_type === req.notes && (d.status === "VERIFIED" || d.status === "EXTRACTED")
    );

    if (matchingDoc) {
      return {
        id: existing?.id || `reqstat_${userId}_${req.id}`,
        user_id: userId,
        requirement_id: req.id,
        status: "SATISFIED",
        satisfied_by_document_id: matchingDoc.id,
        satisfied_by_field_name: null,
        resolved_note: null,
        locked: false,
        updated_at: new Date().toISOString(),
      };
    }

    // Otherwise Missing
    return {
      id: existing?.id || `reqstat_${userId}_${req.id}`,
      user_id: userId,
      requirement_id: req.id,
      status: "MISSING",
      satisfied_by_document_id: null,
      satisfied_by_field_name: null,
      resolved_note: null,
      locked: false,
      updated_at: new Date().toISOString(),
    };
  });

  db.requirementStatuses[userId] = updatedStatuses;
  persistDb();
  return updatedStatuses;
}

export function markRequirementResolvedForUser(userId: string, reqId: string, note?: string): RequirementStatusRow {
  const db = ensureDbFile();
  if (!db.requirementStatuses[userId]) {
    recomputeRequirementStatuses(userId, "s001");
  }

  const index = db.requirementStatuses[userId].findIndex((r) => r.requirement_id === reqId);
  const now = new Date().toISOString();

  const resolvedRow: RequirementStatusRow = {
    id: index >= 0 ? db.requirementStatuses[userId][index].id : `reqstat_${userId}_${reqId}`,
    user_id: userId,
    requirement_id: reqId,
    status: "MANUALLY_RESOLVED",
    satisfied_by_document_id: null,
    satisfied_by_field_name: null,
    resolved_note: note || "Resolved manually by citizen",
    locked: true, // Lock protects from auto-recompute
    updated_at: now,
  };

  if (index >= 0) {
    db.requirementStatuses[userId][index] = resolvedRow;
  } else {
    db.requirementStatuses[userId].push(resolvedRow);
  }

  persistDb();
  return resolvedRow;
}

export function unmarkRequirementResolvedForUser(userId: string, reqId: string): void {
  const db = ensureDbFile();
  if (!db.requirementStatuses[userId]) return;

  const target = db.requirementStatuses[userId].find((r) => r.requirement_id === reqId);
  if (target) {
    target.locked = false;
    target.resolved_note = null;
  }

  recomputeRequirementStatuses(userId, "s001");
  persistDb();
}
