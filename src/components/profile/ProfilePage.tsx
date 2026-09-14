"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Building,
  GraduationCap,
  Banknote,
  Landmark,
  CheckCircle2,
  Edit2,
  Save,
  Sparkles,
  X,
  FileCheck2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { cn, getConfidenceBadgeClass } from "@/lib/utils";
import { toast } from "sonner";
import { CANONICAL_PROFILE_FIELDS, PROFILE_CATEGORIES, getProfileCompleteness } from "@/lib/constants/profile";

type ProfilePageState = "LOADING" | "READY" | "INCOMPLETE" | "EMPTY" | "ERROR";

export function ProfilePage() {
  const router = useRouter();
  const {
    profileFields,
    documents,
    updateProfileField,
    batchUpdateProfileFields,
    profileStrength,
    user,
    isLoadingAuth,
    logout,
  } = useSevaSaarthi();

  const [localFields, setLocalFields] = useState<any[] | null>(null);
  const activeFields = localFields || profileFields;

  const [pageState, setPageState] = useState<ProfilePageState>(() => {
    if (profileFields && profileFields.length > 0) return "READY";
    return "LOADING";
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, string>>({});
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(false);
  const [fullFormData, setFullFormData] = useState<Record<string, string>>({});
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const checkPhoneVerification = useCallback(async () => {
    try {
      const res = await fetch("/api/citizen/phone-verify");
      if (res.ok) {
        const data = await res.json();
        setIsPhoneVerified(Boolean(data.phone_verified));
      }
    } catch {}
  }, []);

  useEffect(() => {
    checkPhoneVerification();
  }, [checkPhoneVerification]);

  const fieldDefinitions = CANONICAL_PROFILE_FIELDS;
  const categories = PROFILE_CATEGORIES;

  // Real backend profile fetch
  const fetchProfile = useCallback(async () => {
    if (pageState !== "READY") {
      setPageState("LOADING");
    }
    setErrorMessage(null);
    try {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        // Unauthenticated access must redirect to /login?from=/profile
        router.replace("/login?from=/profile");
        return;
      }
      if (!res.ok) {
        if (activeFields && activeFields.length > 0) {
          setPageState("READY");
        } else {
          setPageState("ERROR");
          setErrorMessage("Your profile couldn't be loaded right now.");
        }
        return;
      }
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.data)) {
          setLocalFields(data.data);
        }
        setPageState("READY");
      } else {
        if (activeFields && activeFields.length > 0) {
          setPageState("READY");
        } else {
          setPageState("ERROR");
          setErrorMessage(data.error || "Your profile couldn't be loaded right now.");
        }
      }
    } catch (err: any) {
      console.warn("[ProfilePage] Failed to fetch /api/profile", err);
      if (activeFields && activeFields.length > 0) {
        setPageState("READY");
      } else {
        setPageState("ERROR");
        setErrorMessage("Your profile couldn't be loaded right now.");
      }
    }
  }, [router, activeFields, pageState]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const completeness = getProfileCompleteness(activeFields);
  const emptyFieldsCount = completeness.emptyCount;

  const handleStartEdit = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName);
    setTempValues((prev) => ({ ...prev, [fieldName]: currentValue }));
  };

  const handleSaveField = async (fieldName: string) => {
    const val = tempValues[fieldName] !== undefined ? tempValues[fieldName] : "";
    await updateProfileField(fieldName, val);
    setEditingField(null);
    fetchProfile();
  };

  const handleOpenFullModal = () => {
    const initialValues: Record<string, string> = {};
    fieldDefinitions.forEach((fd) => {
      const existing = activeFields.find((pf) => pf.field_name === fd.fieldName);
      if (existing?.value) {
        initialValues[fd.fieldName] = existing.value;
      } else if (fd.fieldName === "full_name" && user?.name) {
        initialValues[fd.fieldName] = user.name;
      } else if (fd.fieldName === "email" && user?.email) {
        initialValues[fd.fieldName] = user.email;
      } else if (fd.fieldName === "phone_number" && user?.phone) {
        initialValues[fd.fieldName] = user.phone;
      } else {
        initialValues[fd.fieldName] = "";
      }
    });
    setFullFormData(initialValues);
    setIsFullEditModalOpen(true);
  };

  const handleSaveFullForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await batchUpdateProfileFields(fullFormData);
    setIsFullEditModalOpen(false);
    fetchProfile();
  };

  const getSourceBadge = (sourceDocId: string | null, confidence: number | null) => {
    if (!sourceDocId) {
      return {
        label: "Manually entered",
        bg: "bg-slate-100 text-slate-700 border-slate-200",
      };
    }
    const doc = documents.find((d) => d.id === sourceDocId);
    const docName = doc ? (doc.original_filename || doc.document_type) : "Uploaded Document";
    return {
      label: `From ${docName}`,
      bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  };

  // Mask sensitive identity/financial data per Section 17
  const formatDisplayValue = (fieldName: string, val: string): string => {
    if (!val || !val.trim()) return "Not entered";
    if (fieldName === "aadhaar_number") {
      const cleaned = val.replace(/\s+/g, "");
      if (cleaned.length >= 4) {
        return "•••• •••• " + cleaned.slice(-4);
      }
      return "•••• •••• ••••";
    }
    if (fieldName === "bank_account_no") {
      if (val.length >= 4) {
        return "••••••••" + val.slice(-4);
      }
      return "••••••••";
    }
    return val;
  };

  // 1. LOADING State: Clean skeleton
  if (isLoadingAuth || pageState === "LOADING") {
    return (
      <div className="space-y-6 pb-16 animate-pulse">
        <div className="h-16 bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between">
          <div className="w-48 h-6 bg-slate-200 rounded-lg" />
          <div className="w-32 h-8 bg-slate-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
              <div className="w-36 h-5 bg-slate-200 rounded-md" />
              <div className="space-y-3 pt-2">
                <div className="h-10 bg-slate-50 rounded-xl" />
                <div className="h-10 bg-slate-50 rounded-xl" />
                <div className="h-10 bg-slate-50 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. ERROR State: Honest server error with real retry
  if (pageState === "ERROR") {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-100 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Your profile couldn&apos;t be loaded right now.</h2>
          <p className="text-xs text-slate-500">Please check your connection and try again.</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fetchProfile()}
            className="py-2.5 px-6 bg-[#2F27CE] hover:bg-[#231CA8] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => logout()}
            className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 3. EMPTY State: Missing profile -> "Let's complete your profile"
  if (pageState === "EMPTY") {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-100 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Let&apos;s complete your profile</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Your profile information is used by Seva Saarthi to automatically fill and verify government applications.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/onboarding/profile?step=1"
            className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#2F27CE] hover:bg-[#231CA8] text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
          >
            <span>Complete Profile</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header matching Section 17 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              My Profile
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Confirmed profile fields used by the browser agent for official application autofill.
          </p>
        </div>

        {/* Action Button & Profile Strength */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenFullModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 flex items-center gap-2 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Complete All Details</span>
          </button>

          <div className="bg-white border border-slate-100 rounded-2xl p-3 px-4 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Profile Strength: <span className="text-emerald-600">{profileStrength}%</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {activeFields.filter((pf) => pf.verified && pf.value.trim().length > 0).length} verified fields
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incomplete Profile Alert Banner */}
      {emptyFieldsCount > 0 && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-950">
                {emptyFieldsCount} details remaining to complete your profile
              </div>
              <div className="text-[11px] text-indigo-700">
                Fill in your education, income, and bank details or upload documents in the vault to automatically extract them.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/onboarding/profile"
              className="px-3.5 py-1.5 bg-[#2F27CE] hover:bg-[#231CA8] text-white text-xs font-bold rounded-xl shrink-0 transition-colors shadow-2xs"
            >
              Complete Profile
            </Link>
            <button
              onClick={handleOpenFullModal}
              className="px-3 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl shrink-0 transition-colors"
            >
              Edit All
            </button>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const catFields = fieldDefinitions.filter((f) => f.category === cat.key);

          return (
            <div key={cat.key} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-50">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", cat.iconBg)}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">{cat.title}</h2>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                {catFields.map((fieldDef) => {
                  const storedField = activeFields.find((pf) => pf.field_name === fieldDef.fieldName);
                  const isEditing = editingField === fieldDef.fieldName;
                  const currentValue = storedField?.value || "";
                  const sourceBadge = getSourceBadge(storedField?.source_document_id || null, storedField?.confidence ?? null);
                  const confidenceBadge = getConfidenceBadgeClass(storedField?.confidence);

                  return (
                    <div
                      key={fieldDef.fieldName}
                      className="p-3.5 bg-slate-50/70 border border-slate-100/90 rounded-2xl hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-600">
                          {fieldDef.label}
                        </label>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5">
                          {storedField?.confidence !== null && storedField?.confidence !== undefined && (
                            <span
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0.2 rounded-md border",
                                confidenceBadge.bg,
                                confidenceBadge.text
                              )}
                            >
                              OCR {Math.round((storedField.confidence || 0) * 100)}%
                            </span>
                          )}
                          <span
                            className={cn(
                              "text-[9px] font-semibold px-2 py-0.2 rounded-md border truncate max-w-[130px]",
                              sourceBadge.bg
                            )}
                            title={sourceBadge.label}
                          >
                            {sourceBadge.label}
                          </span>
                        </div>
                      </div>

                      {/* Value Display / Edit Input */}
                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type={fieldDef.type || "text"}
                            value={tempValues[fieldDef.fieldName] ?? currentValue}
                            onChange={(e) =>
                              setTempValues((prev) => ({
                                ...prev,
                                [fieldDef.fieldName]: e.target.value,
                              }))
                            }
                            placeholder={fieldDef.placeholder}
                            className="flex-1 px-3 py-1.5 bg-white border border-indigo-400 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveField(fieldDef.fieldName)}
                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shrink-0 shadow-2xs"
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl transition-colors shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-bold",
                                currentValue ? "text-slate-900" : "text-slate-400 italic"
                              )}
                            >
                              {formatDisplayValue(fieldDef.fieldName, currentValue)}
                            </span>

                            {fieldDef.fieldName === "phone_number" && (isPhoneVerified || user?.phone) && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Verified
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleStartEdit(fieldDef.fieldName, currentValue)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors opacity-60 group-hover:opacity-100"
                            title="Edit value"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Profile All-in-One Modal */}
      {isFullEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Complete Your Citizen Profile</h2>
                <p className="text-xs text-slate-500">Enter all details below to verify eligibility for schemes.</p>
              </div>
              <button
                onClick={() => setIsFullEditModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSaveFullForm} className="flex-1 overflow-y-auto p-6 space-y-6">
              {categories.map((cat) => {
                const catFields = fieldDefinitions.filter((f) => f.category === cat.key);
                return (
                  <div key={cat.key} className="space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 border-b pb-1">
                      {cat.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {catFields.map((fd) => (
                        <div key={fd.fieldName} className={fd.fieldName === "college_name" ? "sm:col-span-2" : ""}>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {fd.label}
                          </label>
                          <input
                            type={fd.type || "text"}
                            value={fullFormData[fd.fieldName] || ""}
                            onChange={(e) =>
                              setFullFormData((prev) => ({
                                ...prev,
                                [fd.fieldName]: e.target.value,
                              }))
                            }
                            placeholder={fd.placeholder}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsFullEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save All Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
