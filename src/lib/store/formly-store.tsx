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

interface SevaSaarthiContextType {
  user: typeof DEFAULT_USER;
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
  // Actions
  uploadDocument: (file: File, documentType?: DocumentType) => Promise<string>;
  acceptExtractedField: (documentId: string, fieldId: string, customValue?: string) => void;
  rejectExtractedField: (documentId: string, fieldId: string) => void;
  acceptAllExtractedFields: (documentId: string) => void;
  updateProfileField: (fieldName: string, value: string) => void;
  deleteDocument: (documentId: string) => void;
  retryOcr: (documentId: string) => Promise<void>;
  markRequirementResolved: (requirementId: string, note?: string) => void;
  unmarkRequirementResolved: (requirementId: string) => void;
  recomputeRequirements: () => void;
  resetToPreset: (preset: "default" | "first_run" | "completed") => void;
}

const SevaSaarthiContext = createContext<SevaSaarthiContextType | null>(null);

const STORAGE_KEY = "formly_app_state_v1";

export function SevaSaarthiProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState(DEFAULT_USER);
  const [services, setServices] = useState<ServiceRow[]>(INITIAL_SERVICES);
  const [requirements, setRequirements] = useState<ServiceRequirement[]>(INITIAL_REQUIREMENTS);
  const [documents, setDocuments] = useState<DocumentRow[]>(INITIAL_DOCUMENTS);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>(INITIAL_EXTRACTED_FIELDS);
  const [profileFields, setProfileFields] = useState<ProfileField[]>(INITIAL_PROFILE_FIELDS);
  const [requirementStatuses, setRequirementStatuses] = useState<RequirementStatusRow[]>(INITIAL_REQUIREMENT_STATUS);
  const [activeServiceId, setActiveServiceId] = useState<string>("s001");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.documents) setDocuments(parsed.documents);
        if (parsed.extractedFields) setExtractedFields(parsed.extractedFields);
        if (parsed.profileFields) setProfileFields(parsed.profileFields);
        if (parsed.requirementStatuses) setRequirementStatuses(parsed.requirementStatuses);
      }
    } catch (e) {
      console.warn("Could not load stored state", e);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          documents,
          extractedFields,
          profileFields,
          requirementStatuses,
        })
      );
    } catch (e) {
      console.warn("Could not persist state", e);
    }
  }, [documents, extractedFields, profileFields, requirementStatuses, isHydrated]);

  // Recompute Requirement Status Function (Mirror of Postgres recompute_requirement_status function)
  const recomputeRequirements = useCallback(() => {
    setRequirementStatuses((prevStatuses) => {
      const activeReqs = requirements.filter((r) => r.service_id === activeServiceId);
      const nextMap = new Map<string, RequirementStatusRow>();

      // Populate existing or initial rows
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
        if (!current || current.locked) return; // Locked / Manually resolved items are never overwritten

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
          // Document type requirements
          const matchingDoc = documents.find(
            (d) => !d.is_superseded && d.status === "VERIFIED" && d.document_type === req.notes
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
  }, [requirements, activeServiceId, user.id, profileFields, documents]);

  // Upload a document and kick off OCR
  const uploadDocument = async (file: File, documentType?: DocumentType): Promise<string> => {
    const docId = `doc_${Date.now()}`;
    const newDoc: DocumentRow = {
      id: docId,
      user_id: user.id,
      document_type: documentType || "OTHER",
      storage_path: `vault/${file.name}`,
      original_filename: file.name,
      mime_type: file.type,
      status: "PROCESSING",
      ocr_raw_text: null,
      is_superseded: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDocuments((prev) => [newDoc, ...prev]);
    toast.loading("Scanning and extracting fields with OCR...", { id: docId });

    try {
      const ocrResult = await extractDocumentFields(file, documentType);

      // Create extracted fields
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

      toast.success(`OCR Complete! ${newExtracted.length} fields extracted. Click "Review Fields" to confirm.`, {
        id: docId,
        duration: 5000,
      });

      return docId;
    } catch (err) {
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
      toast.error("Retry failed. Please re-upload a clearer image.", { id: documentId });
    }
  };

  // Accept a single extracted field into profile_fields
  const acceptExtractedField = (documentId: string, fieldId: string, customValue?: string) => {
    const field = extractedFields.find((f) => f.id === fieldId);
    if (!field) return;

    const valueToWrite = customValue !== undefined ? customValue : field.raw_value;
    const isManualOverride = customValue !== undefined && customValue !== field.raw_value;

    // Mark field accepted
    setExtractedFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, accepted: true, raw_value: valueToWrite } : f))
    );

    // Upsert into profile_fields
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

    // Check if all fields for this doc are accepted -> mark VERIFIED
    setDocuments((prev) =>
      prev.map((d) => (d.id === documentId ? { ...d, status: "VERIFIED", updated_at: new Date().toISOString() } : d))
    );

    toast.success(`Confirmed "${field.field_name}" into profile!`);
    setTimeout(recomputeRequirements, 50);
  };

  // Reject a field
  const rejectExtractedField = (documentId: string, fieldId: string) => {
    setExtractedFields((prev) => prev.filter((f) => f.id !== fieldId));
    toast.info("Extracted field discarded.");
  };

  // Accept all fields from a document
  const acceptAllExtractedFields = (documentId: string) => {
    const fieldsToAccept = extractedFields.filter((f) => f.document_id === documentId && !f.accepted);
    fieldsToAccept.forEach((f) => {
      acceptExtractedField(documentId, f.id);
    });
    setDocuments((prev) =>
      prev.map((d) => (d.id === documentId ? { ...d, status: "VERIFIED", updated_at: new Date().toISOString() } : d))
    );
    toast.success("All extracted fields verified and added to profile!");
    setTimeout(recomputeRequirements, 100);
  };

  // Manual Profile Field Update
  const updateProfileField = (fieldName: string, value: string) => {
    setProfileFields((prev) => {
      const existingIndex = prev.findIndex((pf) => pf.field_name === fieldName);
      const newField: ProfileField = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `pf_${Date.now()}`,
        user_id: user.id,
        field_name: fieldName,
        value,
        source_document_id: existingIndex >= 0 ? prev[existingIndex].source_document_id : null,
        confidence: null, // manual entry
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

  // Delete Document
  const deleteDocument = (documentId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    setExtractedFields((prev) => prev.filter((ef) => ef.document_id !== documentId));

    // Handle edge case: set source_document_id = null on profile_fields, keep verified = true as manually confirmed
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

  // Manual Resolution (F10)
  const markRequirementResolved = (requirementId: string, note?: string) => {
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
  const unmarkRequirementResolved = (requirementId: string) => {
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

  // Reset to preset
  const resetToPreset = (preset: "default" | "first_run" | "completed") => {
    if (preset === "first_run") {
      setDocuments([]);
      setExtractedFields([]);
      setProfileFields([]);
      setRequirementStatuses([]);
      toast.success("Switched to First-Run Empty state (0 documents, 0 profile fields).");
    } else if (preset === "completed") {
      setDocuments(INITIAL_DOCUMENTS.map((d) => ({ ...d, status: "VERIFIED" as const })));
      setProfileFields([
        ...INITIAL_PROFILE_FIELDS,
        {
          id: "pf_bonafide",
          user_id: DEFAULT_USER.id,
          field_name: "college_id_proof",
          value: "Bonafide 2026-27 Active",
          source_document_id: "doc_bonafide_pending",
          confidence: 0.98,
          verified: true,
          confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setRequirementStatuses(
        INITIAL_REQUIREMENTS.map((req) => ({
          id: `rs_comp_${req.id}`,
          user_id: DEFAULT_USER.id,
          requirement_id: req.id,
          status: "SATISFIED",
          satisfied_by_document_id: "doc_aadhaar",
          satisfied_by_field_name: null,
          resolved_note: null,
          locked: false,
          updated_at: new Date().toISOString(),
        }))
      );
      toast.success("Switched to 100% Completed state!");
    } else {
      setDocuments(INITIAL_DOCUMENTS);
      setExtractedFields(INITIAL_EXTRACTED_FIELDS);
      setProfileFields(INITIAL_PROFILE_FIELDS);
      setRequirementStatuses(INITIAL_REQUIREMENT_STATUS);
      toast.success("Reset to Sai Kumar standard demo state!");
    }
  };

  // Calculate Checklist Summary
  const checklistSummary: ChecklistSummary = useMemo(() => {
    const activeService = services.find((s) => s.id === activeServiceId) || services[0];
    const serviceReqs = requirements.filter((r) => r.service_id === activeServiceId);

    const items: ChecklistItemViewModel[] = serviceReqs.map((req) => {
      const statusRow = requirementStatuses.find((rs) => rs.requirement_id === req.id);
      const status = statusRow?.status || "MISSING";
      const satisfiedByDoc = statusRow?.satisfied_by_document_id
        ? documents.find((d) => d.id === statusRow.satisfied_by_document_id) || null
        : null;
      const satisfiedByProfile = statusRow?.satisfied_by_field_name
        ? profileFields.find((pf) => pf.field_name === statusRow.satisfied_by_field_name) || null
        : null;

      return {
        requirement: req,
        status,
        satisfiedByDocument: satisfiedByDoc,
        satisfiedByProfileField: satisfiedByProfile,
        resolvedNote: statusRow?.resolved_note || null,
        locked: statusRow?.locked || false,
        updatedAt: statusRow?.updated_at || new Date().toISOString(),
      };
    });

    const totalRequirements = items.filter((i) => i.requirement.required).length;
    const satisfiedCount = items.filter((i) => i.requirement.required && i.status === "SATISFIED").length;
    const manuallyResolvedCount = items.filter((i) => i.requirement.required && i.status === "MANUALLY_RESOLVED").length;
    const missingCount = items.filter((i) => i.requirement.required && i.status === "MISSING").length;
    const percentageComplete = totalRequirements > 0
      ? Math.round(((satisfiedCount + manuallyResolvedCount) / totalRequirements) * 100)
      : 0;

    return {
      service: activeService,
      totalRequirements,
      satisfiedCount,
      missingCount,
      manuallyResolvedCount,
      percentageComplete,
      items,
    };
  }, [services, activeServiceId, requirements, requirementStatuses, documents, profileFields]);

  // Profile Strength (e.g. 92%)
  const profileStrength = useMemo(() => {
    const coreFields = [
      "full_name",
      "date_of_birth",
      "gender",
      "aadhaar_number",
      "location",
      "annual_income",
      "education_degree",
      "college_name",
      "bank_account_no",
      "bank_ifsc",
      "caste_category",
    ];
    const filledCount = coreFields.filter((f) =>
      profileFields.some((pf) => pf.field_name === f && pf.verified && pf.value.trim().length > 0)
    ).length;

    const basePct = Math.round((filledCount / coreFields.length) * 100);
    return Math.min(100, Math.max(10, basePct));
  }, [profileFields]);

  // Top Stats
  const stats = useMemo(() => {
    const verifiedDocs = documents.filter((d) => d.status === "VERIFIED").length;
    const missingDocs = checklistSummary.missingCount;
    return {
      activeApplications: 3,
      completedApplications: 7,
      totalDocuments: documents.length > 0 ? documents.length : 0,
      verifiedDocuments: verifiedDocs,
      pendingTasks: checklistSummary.missingCount > 0 ? checklistSummary.missingCount : 0,
      missingDocuments: missingDocs,
      expiringSoonDocuments: 1,
    };
  }, [documents, checklistSummary]);

  return (
    <SevaSaarthiContext.Provider
      value={{
        user,
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
        uploadDocument,
        acceptExtractedField,
        rejectExtractedField,
        acceptAllExtractedFields,
        updateProfileField,
        deleteDocument,
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
