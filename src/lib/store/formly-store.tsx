"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  ProfileField,
  DocumentRow,
  ExtractedField,
  ServiceRow,
  ServiceRequirement,
  RequirementStatusRow,
  ChecklistSummary,
  ChecklistItemViewModel,
  DocumentType,
} from "@/types";
import {
  DEFAULT_USER,
  INITIAL_SERVICES,
  INITIAL_REQUIREMENTS,
  INITIAL_DOCUMENTS,
  INITIAL_EXTRACTED_FIELDS,
  INITIAL_PROFILE_FIELDS,
  INITIAL_REQUIREMENT_STATUS,
} from "@/lib/mock-data/initial-state";
import { extractDocumentFields } from "@/lib/ocr/ocr-engine";
import { toast } from "sonner";
import { CANONICAL_PROFILE_FIELDS, computeProfileStrength, getProfileCompleteness } from "@/lib/constants/profile";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  category: "DOCUMENT" | "PROFILE" | "READINESS" | "SECURITY";
  href: string;
  read: boolean;
}

interface SevaSaarthiContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
    redirectOverride?: string
  ) => Promise<{
    success: boolean;
    isGovernment?: boolean;
    error?: string;
    redirectTo?: string;
    requires2Fa?: boolean;
    phone?: string;
    maskedPhone?: string;
  }>;
  signup: (name: string, email: string, password: string, phone?: string) => Promise<boolean>;
  logout: () => Promise<void>;

  services: ServiceRow[];
  requirements: ServiceRequirement[];
  documents: DocumentRow[];
  extractedFields: ExtractedField[];
  profileFields: ProfileField[];
  requirementStatuses: RequirementStatusRow[];
  activeServiceId: string;
  setActiveServiceId: (id: string) => void;
  checklistSummary: ChecklistSummary;
  profileStrength: number;
  stats: {
    activeApplications: number;
    completedApplications: number;
    totalDocuments: number;
    verifiedDocuments: number;
    pendingTasks: number;
    missingDocuments: number;
    expiringSoonDocuments: number;
  };

  // Real Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Actions
  uploadDocument: (
    file: File | Blob,
    documentType?: DocumentType | string,
    serviceId?: string,
    preparationMetadata?: any
  ) => Promise<string>;
  acceptExtractedField: (documentId: string, fieldId: string, customValue?: string) => Promise<void>;
  rejectExtractedField: (documentId: string, fieldId: string) => Promise<void>;
  acceptAllExtractedFields: (documentId: string) => Promise<void>;
  updateProfileField: (fieldName: string, value: string) => Promise<void>;
  batchUpdateProfileFields: (fields: Record<string, string>) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  prepareDocument: (documentId: string, preparedSizeBytes: number) => Promise<void>;
  retryOcr: (documentId: string) => Promise<void>;
  markRequirementResolved: (requirementId: string, note?: string) => Promise<void>;
  unmarkRequirementResolved: (requirementId: string) => Promise<void>;
  recomputeRequirements: () => void;
  resetToPreset: (preset: "default" | "first_run" | "completed") => void;
}

const SevaSaarthiContext = createContext<SevaSaarthiContextType | null>(null);

const STORAGE_SESSION_KEY = "seva_saarthi_active_session";

export function buildEnrichedProfileMap(profileFields: ProfileField[], user: UserSession | null) {
  const map: Record<string, string> = {};
  profileFields.forEach((f) => {
    if (f.field_name && f.value) {
      map[f.field_name] = f.value;
    }
  });

  const fullName = map.full_name || user?.name || "";
  const mobile = map.phone_number || map.mobile || user?.phone || "";
  const email = map.email || user?.email || "";
  const dob = map.date_of_birth || "";
  const gender = map.gender || "";
  const aadhaar = map.aadhaar_number || "";
  const address = map.permanent_address || map.address || map.location || "";
  const pincode = map.pincode || "";

  // Disaggregate full name
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || fullName || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

  // Disaggregate father name
  const fatherName = map.father_name || "";
  const fParts = fatherName.trim().split(/\s+/).filter(Boolean);
  const fatherFirstName = fParts[0] || fatherName;
  const fatherLastName = fParts.length > 1 ? fParts[fParts.length - 1] : "";

  // Disaggregate mother name
  const motherName = map.mother_name || "";
  const mParts = motherName.trim().split(/\s+/).filter(Boolean);
  const motherFirstName = mParts[0] || motherName;
  const motherLastName = mParts.length > 1 ? mParts[mParts.length - 1] : "";

  // DOB variations
  let dobFormatted = "";
  let dobDay = "";
  let dobMonth = "";
  let dobYear = "";
  if (dob.includes("-")) {
    const parts = dob.split("-");
    if (parts.length === 3) {
      dobYear = parts[0];
      dobMonth = parts[1];
      dobDay = parts[2];
      dobFormatted = `${dobDay}/${dobMonth}/${dobYear}`;
    }
  } else if (dob.includes("/")) {
    dobFormatted = dob;
  }

  // Aadhaar variations
  const aadhaarClean = aadhaar.replace(/\s+/g, "");
  const uidParts = aadhaar.split(/\s+/).filter(Boolean);
  const uid1 = uidParts[0] || aadhaarClean.slice(0, 4);
  const uid2 = uidParts[1] || aadhaarClean.slice(4, 8);
  const uid3 = uidParts[2] || aadhaarClean.slice(8, 12);

  return {
    ...map,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    surname: lastName,
    middle_name: middleName,
    name: fullName,
    mobile,
    phone_number: mobile,
    phone: mobile,
    email,
    date_of_birth: dob,
    dob,
    dob_formatted: dobFormatted,
    dob_day: dobDay,
    dob_month: dobMonth,
    dob_year: dobYear,
    gender,
    aadhaar_number: aadhaar,
    aadhaar: aadhaar,
    aadhaar_clean: aadhaarClean,
    uid1,
    uid2,
    uid3,
    permanent_address: address,
    address,
    pincode,
    pin_code: pincode,
    district: map.district || "",
    mandal: map.mandal || "",
    location: map.location || "",
    city: map.city || map.village || map.location || "",
    father_name: fatherName,
    father_first_name: fatherFirstName,
    father_last_name: fatherLastName,
    mother_name: motherName,
    mother_first_name: motherFirstName,
    mother_last_name: motherLastName,
    annual_income: map.annual_income || "",
    income: map.annual_income || "",
    caste_category: map.caste_category || "",
    category: map.caste_category || "",
    college_name: map.college_name || "",
    education_degree: map.education_degree || "",
    roll_number: map.roll_number || "",
    current_year: map.current_year || "",
    tenth_percentage: map.tenth_percentage || "",
    twelfth_percentage: map.twelfth_percentage || "",
    bank_name: map.bank_name || "",
    bank_account_no: map.bank_account_no || "",
    bank_ifsc: map.bank_ifsc || "",
    account_holder_name: map.account_holder_name || fullName,
    dbt_seeding_status: map.dbt_seeding_status || "",
  };
}

export function SevaSaarthiProvider({ children }: { children: React.ReactNode }) {
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [user, setUser] = useState<UserSession | null>(null);

  const [services, setServices] = useState<ServiceRow[]>(INITIAL_SERVICES);
  const [requirements, setRequirements] = useState<ServiceRequirement[]>(INITIAL_REQUIREMENTS);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [profileFields, setProfileFields] = useState<ProfileField[]>([]);
  const [requirementStatuses, setRequirementStatuses] = useState<RequirementStatusRow[]>([]);
  const [activeServiceId, setActiveServiceId] = useState<string>("s001");
  const isDataLoadedRef = React.useRef(false);

  // Load user data from server / localStorage for this specific authenticated user
  const loadUserData = useCallback(async (activeUser: UserSession) => {
    try {
      // 1. Try fetching from server APIs independently
      const [profRes, docsRes, checkRes] = await Promise.allSettled([
        fetch("/api/profile"),
        fetch("/api/documents"),
        fetch(`/api/services/s001/checklist`),
      ]);

      let loadedProfile: ProfileField[] | null = null;
      let loadedDocs: DocumentRow[] | null = null;
      let loadedExtracted: ExtractedField[] = [];
      let loadedStatuses: RequirementStatusRow[] | null = null;

      if (profRes.status === "fulfilled" && profRes.value.ok) {
        const profData = await profRes.value.json();
        if (profData.success && Array.isArray(profData.data)) {
          loadedProfile = profData.data;
          setProfileFields(profData.data);
        }
      }

      if (docsRes.status === "fulfilled" && docsRes.value.ok) {
        const docsData = await docsRes.value.json();
        if (docsData.success && Array.isArray(docsData.data)) {
          loadedDocs = docsData.data;
          setDocuments(docsData.data);
          loadedExtracted = docsData.data.flatMap((d: any) => d.extracted_fields || []);
          setExtractedFields(loadedExtracted);
        }
      }

      if (checkRes.status === "fulfilled" && checkRes.value.ok) {
        const checkData = await checkRes.value.json();
        if (checkData.success && Array.isArray(checkData.items)) {
          const statuses: RequirementStatusRow[] = checkData.items.map((item: any) => ({
            id: `reqstat_${activeUser.id}_${item.requirement.id}`,
            user_id: activeUser.id,
            requirement_id: item.requirement.id,
            status: item.status,
            satisfied_by_document_id: item.satisfiedByDocument?.id || null,
            satisfied_by_field_name: item.satisfiedByProfileField?.field_name || null,
            resolved_note: item.resolvedNote || null,
            locked: item.locked || false,
            updated_at: new Date().toISOString(),
          }));
          loadedStatuses = statuses;
          setRequirementStatuses(statuses);
        }
      }

      // If we received server data, cache it locally and mark loaded
      if (loadedProfile !== null || loadedDocs !== null || loadedStatuses !== null) {
        isDataLoadedRef.current = true;
        const userStorageKey = `seva_saarthi_data_${activeUser.id}`;
        localStorage.setItem(
          userStorageKey,
          JSON.stringify({
            documents: loadedDocs ?? [],
            extractedFields: loadedExtracted,
            profileFields: loadedProfile ?? [],
            requirementStatuses: loadedStatuses ?? [],
          })
        );
        return;
      }
    } catch (e) {
      console.warn("[Seva Saarthi Store] API load failed, checking local storage cache", e);
    }

    // Fallback to local storage keyed by user ID
    try {
      const userStorageKey = `seva_saarthi_data_${activeUser.id}`;
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.documents) setDocuments(parsed.documents);
        if (parsed.extractedFields) setExtractedFields(parsed.extractedFields);
        if (parsed.profileFields) setProfileFields(parsed.profileFields);
        if (parsed.requirementStatuses) setRequirementStatuses(parsed.requirementStatuses);
        isDataLoadedRef.current = true;
      } else if (activeUser.id === DEFAULT_USER.id) {
        setDocuments(INITIAL_DOCUMENTS);
        setExtractedFields(INITIAL_EXTRACTED_FIELDS);
        setProfileFields(INITIAL_PROFILE_FIELDS);
        setRequirementStatuses(INITIAL_REQUIREMENT_STATUS);
        isDataLoadedRef.current = true;
      } else {
        // Fresh user: initialize empty profile with their registration name & email
        const initialProfile: ProfileField[] = [
          {
            id: `pf_${activeUser.id}_fullname`,
            user_id: activeUser.id,
            field_name: "full_name",
            value: activeUser.name,
            source_document_id: null,
            confidence: 1.0,
            verified: true,
            confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: `pf_${activeUser.id}_email`,
            user_id: activeUser.id,
            field_name: "email",
            value: activeUser.email,
            source_document_id: null,
            confidence: 1.0,
            verified: true,
            confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        if (activeUser.phone) {
          initialProfile.push({
            id: `pf_${activeUser.id}_phone`,
            user_id: activeUser.id,
            field_name: "phone_number",
            value: activeUser.phone,
            source_document_id: null,
            confidence: 1.0,
            verified: true,
            confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        setProfileFields(initialProfile);
        setDocuments([]);
        setExtractedFields([]);
        isDataLoadedRef.current = true;
      }
    } catch (err) {
      console.error("[Seva Saarthi Store] Failed to load local user cache", err);
    }
  }, []);

  // Save changes locally per user ONLY after data is loaded (prevents wiping cache with empty array)
  useEffect(() => {
    if (!user || !isDataLoadedRef.current) return;
    try {
      const userStorageKey = `seva_saarthi_data_${user.id}`;
      localStorage.setItem(
        userStorageKey,
        JSON.stringify({
          documents,
          extractedFields,
          profileFields,
          requirementStatuses,
        })
      );

      // Sync active profile to browser extension bridge
      const profileMap = buildEnrichedProfileMap(profileFields, user);
      const extensionPayload = {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        profileFields,
        profileMap,
        documents: documents.map((d) => ({ id: d.id, document_type: d.document_type, status: d.status })),
        syncedAt: new Date().toISOString(),
      };
      localStorage.setItem("seva_saarthi_active_profile", JSON.stringify(extensionPayload));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SYNC_PROFILE", { detail: extensionPayload }));
        document.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SYNC_PROFILE", { detail: extensionPayload }));
      }
    } catch (e) {
      console.warn("Could not persist user data locally", e);
    }
  }, [user, documents, extractedFields, profileFields, requirementStatuses]);

  // Listen for extension requests for profile
  useEffect(() => {
    const handleRequestProfile = () => {
      if (!user) return;
      const profileMap = buildEnrichedProfileMap(profileFields, user);
      const extensionPayload = {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        profileFields,
        profileMap,
        documents: documents.map((d) => ({ id: d.id, document_type: d.document_type, status: d.status })),
        syncedAt: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SYNC_PROFILE", { detail: extensionPayload }));
        document.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SYNC_PROFILE", { detail: extensionPayload }));
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("SEVA_SAARTHI_REQUEST_PROFILE", handleRequestProfile);
      document.addEventListener("SEVA_SAARTHI_REQUEST_PROFILE", handleRequestProfile);
      return () => {
        window.removeEventListener("SEVA_SAARTHI_REQUEST_PROFILE", handleRequestProfile);
        document.removeEventListener("SEVA_SAARTHI_REQUEST_PROFILE", handleRequestProfile);
      };
    }
  }, [user, profileFields, documents]);

  // Check active session on mount
  useEffect(() => {
    const initSession = async () => {
      console.log("[FORMLY STORE] initSession starting...");
      // 1. Immediately check client local session to restore user & data without flash
      try {
        const localSaved = localStorage.getItem(STORAGE_SESSION_KEY);
        if (localSaved) {
          const parsedUser = JSON.parse(localSaved);
          if (parsedUser && parsedUser.id) {
            setUser(parsedUser);
            const userStorageKey = `seva_saarthi_data_${parsedUser.id}`;
            const cached = localStorage.getItem(userStorageKey);
            if (cached) {
              const parsedData = JSON.parse(cached);
              if (Array.isArray(parsedData.documents) && parsedData.documents.length > 0) {
                setDocuments(parsedData.documents);
              }
              if (Array.isArray(parsedData.extractedFields) && parsedData.extractedFields.length > 0) {
                setExtractedFields(parsedData.extractedFields);
              }
              if (Array.isArray(parsedData.profileFields) && parsedData.profileFields.length > 0) {
                setProfileFields(parsedData.profileFields);
              }
              if (Array.isArray(parsedData.requirementStatuses) && parsedData.requirementStatuses.length > 0) {
                setRequirementStatuses(parsedData.requirementStatuses);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Error restoring preliminary local session", err);
      }

      // 2. Fetch verified server session and live data
      try {
        console.log("[FORMLY STORE] fetching /api/auth/session...");
        const res = await fetch("/api/auth/session");
        console.log("[FORMLY STORE] /api/auth/session status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("[FORMLY STORE] session data:", JSON.stringify(data));
          if (data.authenticated && data.user) {
            setUser(data.user);
            localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
            console.log("[FORMLY STORE] loading user data for:", data.user.id);
            await loadUserData(data.user);
            console.log("[FORMLY STORE] loadUserData finished, setting isLoadingAuth to false");
            setIsLoadingAuth(false);
            return;
          } else {
            // Server session is invalid or logged out - purge stale local state
            setUser(null);
            localStorage.removeItem(STORAGE_SESSION_KEY);
            localStorage.removeItem("seva_saarthi_active_profile");
            setDocuments([]);
            setExtractedFields([]);
            setProfileFields([]);
            setRequirementStatuses([]);
          }
        } else {
          // Server returned 401 or non-OK: invalid session -> purge stale state
          setUser(null);
          localStorage.removeItem(STORAGE_SESSION_KEY);
          localStorage.removeItem("seva_saarthi_active_profile");
          setDocuments([]);
          setExtractedFields([]);
          setProfileFields([]);
          setRequirementStatuses([]);
        }
      } catch (err) {
        console.warn("Server auth check failed", err);
      }

      setIsLoadingAuth(false);
    };

    initSession();
  }, [loadUserData]);

  // Login handler
  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = true,
    redirectOverride?: string
  ): Promise<{
    success: boolean;
    isGovernment?: boolean;
    error?: string;
    redirectTo?: string;
    requires2Fa?: boolean;
    phone?: string;
    maskedPhone?: string;
  }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (!data.isGovernment) {
          toast.error(data.error || "Login failed. Please check your credentials.");
        }
        return {
          success: false,
          isGovernment: Boolean(data.isGovernment),
          error: data.error || "Login failed. Please check your credentials.",
          redirectTo: data.redirectTo,
        };
      }

      if (data.requires2Fa) {
        return {
          success: true,
          requires2Fa: true,
          phone: data.phone,
          maskedPhone: data.maskedPhone,
        };
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
      await loadUserData(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);

      const target =
        redirectOverride ||
        data.redirectTo ||
        (data.completed ? "/dashboard" : "/onboarding/profile");
      window.location.href = target;
      return { success: true, redirectTo: target };
    } catch (err: any) {
      const msg = err.message || "Network error while signing in.";
      const displayMsg =
        msg === "fetch failed" || msg.includes("Failed to fetch")
          ? "Unable to connect to the authentication server. Please check your connection."
          : msg;
      toast.error(displayMsg);
      return { success: false, error: displayMsg };
    }
  };

  // Signup handler
  const signup = async (name: string, email: string, password: string, phone?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Signup failed. Please try again.");
        return false;
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
      await loadUserData(data.user);
      toast.success(`Account created successfully! Welcome to Seva Saarthi, ${data.user.name}.`);
      const target = data.redirectTo || "/onboarding/profile";
      window.location.href = target;
      return true;
    } catch (err: any) {
      const msg = err.message || "Network error while signing up.";
      const displayMsg =
        msg === "fetch failed" || msg.includes("Failed to fetch")
          ? "Unable to connect to the authentication server. Please check your connection."
          : msg;
      toast.error(displayMsg);
      return false;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}

    const oldUserId = user?.id;
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem("seva_saarthi_active_profile");
    if (oldUserId) {
      localStorage.removeItem(`seva_saarthi_data_${oldUserId}`);
    }
    setUser(null);
    setDocuments([]);
    setExtractedFields([]);
    setProfileFields([]);
    setRequirementStatuses([]);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_LOGOUT"));
      document.dispatchEvent(new CustomEvent("SEVA_SAARTHI_LOGOUT"));
    }

    toast.info("You have signed out.");
    window.location.href = "/login";
  };

  // Recompute Requirement Status Function
  const recomputeRequirements = useCallback(() => {
    if (!user) return;

    setRequirementStatuses((prevStatuses) => {
      const activeReqs = requirements.filter((r) => r.service_id === activeServiceId);
      const nextMap = new Map<string, RequirementStatusRow>();

      activeReqs.forEach((req) => {
        const existing = prevStatuses.find((rs) => rs.requirement_id === req.id);
        if (existing) {
          nextMap.set(req.id, { ...existing });
        } else {
          nextMap.set(req.id, {
            id: `rs_${Date.now()}_${req.id}`,
            user_id: user.id,
            requirement_id: req.id,
            status: "MISSING",
            satisfied_by_document_id: null,
            satisfied_by_field_name: null,
            resolved_note: null,
            locked: false,
            updated_at: new Date().toISOString(),
          });
        }
      });

      // Apply recompute rules
      activeReqs.forEach((req) => {
        const current = nextMap.get(req.id);
        if (!current || current.locked) return; // Locked manual overrides are protected

        if (req.requirement_type === "PERSONAL_INFORMATION") {
          const matchingProfileField = profileFields.find(
            (pf) => pf.field_name === req.field_name && pf.verified && pf.value && pf.value.trim().length > 0
          );
          if (matchingProfileField) {
            current.status = "SATISFIED";
            current.satisfied_by_field_name = matchingProfileField.field_name;
            current.satisfied_by_document_id = null;
            current.updated_at = new Date().toISOString();
          } else {
            current.status = "MISSING";
            current.satisfied_by_field_name = null;
            current.satisfied_by_document_id = null;
          }
        } else {
          // Document requirements
          const matchingDoc = documents.find(
            (d) => !d.is_superseded && (d.status === "VERIFIED" || d.status === "EXTRACTED") && d.document_type === req.notes
          );
          if (matchingDoc) {
            current.status = "SATISFIED";
            current.satisfied_by_document_id = matchingDoc.id;
            current.satisfied_by_field_name = null;
            current.updated_at = new Date().toISOString();
          } else {
            current.status = "MISSING";
            current.satisfied_by_document_id = null;
            current.satisfied_by_field_name = null;
          }
        }
      });

      return Array.from(nextMap.values());
    });
  }, [requirements, activeServiceId, user, profileFields, documents]);

  // Upload document
  const uploadDocument = async (
    file: File | Blob,
    documentType?: DocumentType | string,
    serviceId?: string,
    preparationMetadata?: any
  ): Promise<string> => {
    if (!user) throw new Error("Please log in to upload documents.");

    const fileName =
      (file as any).name ||
      preparationMetadata?.preparedFileName ||
      preparationMetadata?.originalFileName ||
      "document.pdf";
    const docId = `doc_${Date.now()}`;
    const newDoc: DocumentRow = {
      id: docId,
      user_id: user.id,
      document_type: documentType || "OTHER",
      storage_path: `vault/${fileName}`,
      original_filename: preparationMetadata?.originalFileName || fileName,
      prepared_filename: fileName,
      mime_type: (file as any).type || "application/octet-stream",
      status: "PROCESSING",
      ocr_raw_text: null,
      is_superseded: false,
      original_size_bytes: preparationMetadata?.originalSizeBytes || file.size,
      prepared_size_bytes: file.size,
      target_size_bytes: preparationMetadata?.targetSizeBytes || null,
      readability_score: preparationMetadata?.readabilityScore ?? 85,
      readability_status: preparationMetadata?.readabilityStatus ?? "GOOD",
      optimization_metadata: preparationMetadata || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDocuments((prev) => [newDoc, ...prev]);
    toast.loading("Scanning document and extracting fields with OCR...", { id: docId });

    try {
      // Send to backend API
      const formData = new FormData();
      formData.append("file", file, fileName);
      if (documentType) formData.append("document_type", documentType);
      if (serviceId) formData.append("service_id", serviceId);
      if (preparationMetadata) {
        formData.append("preparation_metadata", JSON.stringify(preparationMetadata));
      }

      const apiRes = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.success && data.document) {
          setDocuments((prev) => prev.map((d) => (d.id === docId ? data.document : d)));
          setExtractedFields((prev) => [...(data.extracted_fields || []), ...prev]);
          toast.success(`OCR Complete! ${data.extracted_fields?.length || 0} fields extracted. Click "Review Fields" to confirm.`, {
            id: docId,
            duration: 5000,
          });
          setTimeout(recomputeRequirements, 50);
          return data.document.id;
        }
      }

      // Local extraction fallback
      const ocrResult = await extractDocumentFields(
        file instanceof File
          ? file
          : { name: fileName, type: (file as any).type || "application/pdf", size: file.size },
        documentType as any
      );
      const newExtracted: ExtractedField[] = ocrResult.fields.map((f, i) => ({
        id: `ef_${Date.now()}_${i}`,
        document_id: docId,
        field_name: f.fieldName,
        raw_value: f.rawValue,
        normalized_value: f.normalizedValue || null,
        confidence: f.confidence,
        accepted: false,
        created_at: new Date().toISOString(),
      }));

      setExtractedFields((prev) => [...newExtracted, ...prev]);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                document_type: ocrResult.documentType,
                status: "EXTRACTED",
                ocr_raw_text: ocrResult.rawText,
                updated_at: new Date().toISOString(),
              }
            : d
        )
      );

      toast.success(`OCR Complete! ${newExtracted.length} fields extracted. Review them to add to your profile.`, {
        id: docId,
        duration: 5000,
      });
      setTimeout(recomputeRequirements, 50);
      return docId;
    } catch (err: any) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: "FAILED", updated_at: new Date().toISOString() } : d))
      );
      toast.error("OCR Extraction failed. You can retry or enter fields manually.", { id: docId });
      throw err;
    }
  };

  // Retry OCR
  const retryOcr = async (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (!doc) return;

    setDocuments((prev) =>
      prev.map((d) => (d.id === documentId ? { ...d, status: "PROCESSING" } : d))
    );
    toast.loading("Retrying OCR on stored document...", { id: documentId });

    try {
      const ocrResult = await extractDocumentFields(
        { name: doc.original_filename || "document.pdf", type: doc.mime_type || "application/pdf", size: 1024 * 100 },
        doc.document_type as DocumentType
      );

      const newExtracted: ExtractedField[] = ocrResult.fields.map((f, i) => ({
        id: `ef_${Date.now()}_${i}`,
        document_id: documentId,
        field_name: f.fieldName,
        raw_value: f.rawValue,
        normalized_value: f.normalizedValue || null,
        confidence: f.confidence,
        accepted: false,
        created_at: new Date().toISOString(),
      }));

      setExtractedFields((prev) => [
        ...newExtracted,
        ...prev.filter((ef) => ef.document_id !== documentId),
      ]);

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId
            ? {
                ...d,
                document_type: ocrResult.documentType,
                status: "EXTRACTED",
                ocr_raw_text: ocrResult.rawText,
                updated_at: new Date().toISOString(),
              }
            : d
        )
      );

      toast.success("OCR completed successfully!", { id: documentId });
    } catch {
      setDocuments((prev) =>
        prev.map((d) => (d.id === documentId ? { ...d, status: "FAILED" } : d))
      );
      toast.error("Retry failed. Please re-upload a clearer document.", { id: documentId });
    }
  };

  // Accept extracted field
  const acceptExtractedField = async (documentId: string, fieldId: string, customValue?: string) => {
    const field = extractedFields.find((f) => f.id === fieldId);
    if (!field || !user) return;

    const valueToWrite = customValue !== undefined ? customValue : field.raw_value;
    const isManualOverride = customValue !== undefined && customValue !== field.raw_value;

    try {
      await fetch(`/api/documents/${documentId}/extracted-fields/${fieldId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_value: valueToWrite }),
      });
    } catch {}

    setExtractedFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, accepted: true, raw_value: valueToWrite } : f))
    );

    setProfileFields((prev) => {
      const existingIndex = prev.findIndex((pf) => pf.field_name === field.field_name);
      const newField: ProfileField = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `pf_${Date.now()}`,
        user_id: user.id,
        field_name: field.field_name,
        value: valueToWrite,
        source_document_id: documentId,
        confidence: isManualOverride ? null : field.confidence,
        verified: true,
        confirmed_at: new Date().toISOString(),
        created_at: existingIndex >= 0 ? prev[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = newField;
        return next;
      }
      return [...prev, newField];
    });

    setDocuments((prev) =>
      prev.map((d) => (d.id === documentId ? { ...d, status: "VERIFIED", updated_at: new Date().toISOString() } : d))
    );

    toast.success(`Confirmed "${field.field_name}" into profile!`);
    setTimeout(recomputeRequirements, 50);
  };

  // Reject extracted field
  const rejectExtractedField = async (documentId: string, fieldId: string) => {
    try {
      await fetch(`/api/documents/${documentId}/extracted-fields/${fieldId}/reject`, {
        method: "POST",
      });
    } catch {}

    setExtractedFields((prev) => prev.filter((f) => f.id !== fieldId));
    toast.info("Extracted field discarded.");
  };

  // Accept all fields from document
  const acceptAllExtractedFields = async (documentId: string) => {
    const fieldsToAccept = extractedFields.filter((f) => f.document_id === documentId && !f.accepted);
    for (const f of fieldsToAccept) {
      await acceptExtractedField(documentId, f.id);
    }
    setDocuments((prev) =>
      prev.map((d) => (d.id === documentId ? { ...d, status: "VERIFIED", updated_at: new Date().toISOString() } : d))
    );
    toast.success("All extracted fields verified and saved to profile!");
    setTimeout(recomputeRequirements, 100);
  };

  // Update single profile field manually
  const updateProfileField = async (fieldName: string, value: string) => {
    if (!user) return;

    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_name: fieldName, value }),
      });
    } catch {}

    setProfileFields((prev) => {
      const existingIndex = prev.findIndex((pf) => pf.field_name === fieldName);
      const newField: ProfileField = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `pf_${Date.now()}`,
        user_id: user.id,
        field_name: fieldName,
        value,
        source_document_id: existingIndex >= 0 ? prev[existingIndex].source_document_id : null,
        confidence: null,
        verified: true,
        confirmed_at: new Date().toISOString(),
        created_at: existingIndex >= 0 ? prev[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = newField;
        return next;
      }
      return [...prev, newField];
    });

    toast.success("Profile field saved!");
    setTimeout(recomputeRequirements, 50);
  };

  // Batch update multiple profile fields at once
  const batchUpdateProfileFields = async (fields: Record<string, string>) => {
    if (!user) return;

    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
    } catch (e) {
      console.warn("Batch profile update API failed", e);
    }

    setProfileFields((prev) => {
      let next = [...prev];
      const now = new Date().toISOString();

      Object.entries(fields).forEach(([fieldName, value]) => {
        const idx = next.findIndex((pf) => pf.field_name === fieldName);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            value,
            verified: true,
            confirmed_at: now,
            updated_at: now,
          };
        } else {
          next.push({
            id: `pf_${Date.now()}_${fieldName}`,
            user_id: user.id,
            field_name: fieldName,
            value,
            source_document_id: null,
            confidence: null,
            verified: true,
            confirmed_at: now,
            created_at: now,
            updated_at: now,
          });
        }
      });
      return next;
    });

    toast.success("All profile details updated successfully!");
    setTimeout(recomputeRequirements, 50);
  };

  // Delete document
  const deleteDocument = async (documentId: string) => {
    try {
      await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    } catch {}

    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    setExtractedFields((prev) => prev.filter((ef) => ef.document_id !== documentId));

    setProfileFields((prev) =>
      prev.map((pf) =>
        pf.source_document_id === documentId
          ? { ...pf, source_document_id: null, confidence: null }
          : pf
      )
    );

    toast.info("Document removed from vault.");
    setTimeout(recomputeRequirements, 50);
  };

  // Prepare document (Rule 16: update prepared size and status)
  const prepareDocument = async (documentId: string, preparedSizeBytes: number) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === documentId
          ? {
              ...d,
              prepared_size_bytes: preparedSizeBytes,
              status: "VERIFIED",
              updated_at: new Date().toISOString(),
            }
          : d
      )
    );

    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepared_size_bytes: preparedSizeBytes, status: "VERIFIED" }),
      });
    } catch (err) {
      console.warn("Failed to persist document preparation", err);
    }
  };

  // Manual Resolution (F10)
  const markRequirementResolved = async (requirementId: string, note?: string) => {
    if (!user) return;

    try {
      await fetch(`/api/requirements/${requirementId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
    } catch {}

    setRequirementStatuses((prev) => {
      const existingIndex = prev.findIndex((rs) => rs.requirement_id === requirementId);
      const newStatus: RequirementStatusRow = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `rs_${Date.now()}`,
        user_id: user.id,
        requirement_id: requirementId,
        status: "MANUALLY_RESOLVED",
        satisfied_by_document_id: null,
        satisfied_by_field_name: null,
        resolved_note: note || "Resolved manually by applicant.",
        locked: true,
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = newStatus;
        return next;
      }
      return [...prev, newStatus];
    });

    toast.success("Requirement marked as manually resolved.");
  };

  // Unmark resolution
  const unmarkRequirementResolved = async (requirementId: string) => {
    try {
      await fetch(`/api/requirements/${requirementId}/unresolve`, {
        method: "POST",
      });
    } catch {}

    setRequirementStatuses((prev) =>
      prev.map((rs) =>
        rs.requirement_id === requirementId
          ? { ...rs, locked: false, resolved_note: null, status: "MISSING" }
          : rs
      )
    );
    toast.info("Reverted to automatic verification.");
    setTimeout(recomputeRequirements, 50);
  };

  // Reset presets
  const resetToPreset = (preset: "default" | "first_run" | "completed") => {
    if (!user) return;

    if (preset === "first_run") {
      setDocuments([]);
      setExtractedFields([]);
      setProfileFields([
        {
          id: `pf_${user.id}_fullname`,
          user_id: user.id,
          field_name: "full_name",
          value: user.name,
          source_document_id: null,
          confidence: 1.0,
          verified: true,
          confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setRequirementStatuses([]);
      toast.success("Reset to Clean / First-Run State.");
      setTimeout(recomputeRequirements, 50);
    } else {
      recomputeRequirements();
      toast.info("Recomputed live requirements.");
    }
  };

  // Calculate dynamic checklist summary
  const checklistSummary: ChecklistSummary = useMemo(() => {
    const activeReqs = requirements.filter((r) => r.service_id === activeServiceId);
    const items: ChecklistItemViewModel[] = activeReqs.map((req) => {
      const statusRow = requirementStatuses.find((rs) => rs.requirement_id === req.id);
      const status = statusRow?.status || "MISSING";

      const satisfiedDoc = statusRow?.satisfied_by_document_id
        ? documents.find((d) => d.id === statusRow.satisfied_by_document_id) || null
        : null;

      const satisfiedField = statusRow?.satisfied_by_field_name
        ? profileFields.find((pf) => pf.field_name === statusRow.satisfied_by_field_name) || null
        : null;

      return {
        requirement: req,
        status,
        satisfiedByDocument: satisfiedDoc,
        satisfiedByProfileField: satisfiedField,
        resolvedNote: statusRow?.resolved_note || null,
        locked: statusRow?.locked || false,
        updatedAt: statusRow?.updated_at || new Date().toISOString(),
      };
    });

    const currentService = services.find((s) => s.id === activeServiceId) || services[0];
    const total = items.filter((i) => i.requirement.required).length;
    const satisfied = items.filter((i) => i.requirement.required && i.status === "SATISFIED").length;
    const manuallyResolved = items.filter((i) => i.requirement.required && i.status === "MANUALLY_RESOLVED").length;
    const missing = items.filter((i) => i.requirement.required && i.status === "MISSING").length;
    const percentage = total > 0 ? Math.round(((satisfied + manuallyResolved) / total) * 100) : 0;

    return {
      service: currentService,
      totalRequirements: total,
      satisfiedCount: satisfied,
      missingCount: missing,
      manuallyResolvedCount: manuallyResolved,
      percentageComplete: percentage,
      items,
    };
  }, [services, requirements, activeServiceId, requirementStatuses, documents, profileFields]);

  // Dynamic Profile Strength (Unified from Canonical Fields)
  const profileStrength = useMemo(() => {
    return computeProfileStrength(profileFields);
  }, [profileFields]);

  // Real Citizen Applications tracked per user (Rule 12: No fake mock data)
  const [realUserApps, setRealUserApps] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const activeLocalUser = localStorage.getItem(STORAGE_SESSION_KEY);
        const parsed = activeLocalUser ? JSON.parse(activeLocalUser) : null;
        if (parsed?.id) {
          const stored = localStorage.getItem(`citizen_apps_${parsed.id}`);
          if (stored) {
            const parsedApps = JSON.parse(stored);
            return Array.isArray(parsedApps) ? parsedApps : [];
          }
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) {
      setRealUserApps([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`citizen_apps_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRealUserApps(Array.isArray(parsed) ? parsed : []);
      } else {
        setRealUserApps([]);
      }
    } catch {
      setRealUserApps([]);
    }
  }, [user?.id]);

  // Overall Stats
  const stats = useMemo(() => {
    const verifiedDocs = documents.filter((d) => !d.is_superseded && d.status === "VERIFIED").length;
    const totalDocs = documents.filter((d) => !d.is_superseded).length;
    const activeApps = realUserApps.filter(
      (a) => a.statusCategory === "IN_PROGRESS" || a.statusCategory === "ACTION_REQUIRED"
    ).length;
    const completedApps = realUserApps.filter((a) => a.statusCategory === "COMPLETED").length;

    return {
      activeApplications: activeApps,
      completedApplications: completedApps,
      totalDocuments: totalDocs,
      verifiedDocuments: verifiedDocs,
      pendingTasks: checklistSummary.missingCount,
      missingDocuments: checklistSummary.items.filter(
        (i) => i.status === "MISSING" && i.requirement.requirement_type !== "PERSONAL_INFORMATION"
      ).length,
      expiringSoonDocuments: 0,
    };
  }, [documents, checklistSummary, realUserApps]);

  // Real Notification State (Loaded from Supabase / PostgreSQL API)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          const mapped: AppNotification[] = data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            desc: n.body || "",
            time: new Date(n.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            category: (n.notification_type || "PROFILE") as any,
            href: n.action_url || "/dashboard",
            read: Boolean(n.read_at),
          }));
          setNotifications(mapped);
          setUnreadNotificationsCount(
            typeof data.unreadCount === "number"
              ? data.unreadCount
              : mapped.filter((m) => !m.read).length
          );
          return;
        }
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ unreadCount?: number }>;
      if (typeof customEvent.detail?.unreadCount === "number") {
        setUnreadNotificationsCount(customEvent.detail.unreadCount);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("SEVA_NOTIFICATIONS_SYNC", handleSync);
      return () => window.removeEventListener("SEVA_NOTIFICATIONS_SYNC", handleSync);
    }
  }, []);

  const markNotificationAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    const next = Math.max(0, unreadNotificationsCount - 1);
    setUnreadNotificationsCount(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("SEVA_NOTIFICATIONS_SYNC", { detail: { unreadCount: next } }));
    }
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch {}
  };

  const clearAllNotifications = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotificationsCount(0);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("SEVA_NOTIFICATIONS_SYNC", { detail: { unreadCount: 0 } }));
    }
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } catch {}
  };

  return (
    <SevaSaarthiContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
        login,
        signup,
        logout,

        services,
        requirements,
        documents,
        extractedFields,
        profileFields,
        requirementStatuses,
        activeServiceId,
        setActiveServiceId,
        checklistSummary,
        profileStrength,
        stats,

        // Real Notifications
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        clearAllNotifications,

        uploadDocument,
        acceptExtractedField,
        rejectExtractedField,
        acceptAllExtractedFields,
        updateProfileField,
        batchUpdateProfileFields,
        deleteDocument,
        prepareDocument,
        retryOcr,
        markRequirementResolved,
        unmarkRequirementResolved,
        recomputeRequirements,
        resetToPreset,
      }}
    >
      {children}
    </SevaSaarthiContext.Provider>
  );
}

export function useSevaSaarthi() {
  const context = useContext(SevaSaarthiContext);
  if (!context) {
    throw new Error("useSevaSaarthi must be used within a SevaSaarthiProvider");
  }
  return context;
}
