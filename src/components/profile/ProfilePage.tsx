"use client";

import React, { useState } from "react";
import {
  User,
  ShieldCheck,
  Building,
  GraduationCap,
  Banknote,
  Landmark,
  FileCheck2,
  CheckCircle2,
  Edit2,
  Save,
  Sparkles,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { cn, getConfidenceBadgeClass } from "@/lib/utils";
import { toast } from "sonner";

interface FieldDef {
  fieldName: string;
  label: string;
  placeholder: string;
  type?: string;
  category: "IDENTITY" | "EDUCATION" | "INCOME" | "BANKING";
}

export function ProfilePage() {
  const { profileFields, documents, updateProfileField, profileStrength, user } = useSevaSaarthi();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

  const fieldDefinitions: FieldDef[] = [
    // Identity
    { fieldName: "full_name", label: "Full Name (as per Aadhaar/10th)", placeholder: "Sai Kumar", category: "IDENTITY" },
    { fieldName: "date_of_birth", label: "Date of Birth", placeholder: "YYYY-MM-DD", type: "date", category: "IDENTITY" },
    { fieldName: "gender", label: "Gender", placeholder: "Male / Female / Other", category: "IDENTITY" },
    { fieldName: "aadhaar_number", label: "Aadhaar Number", placeholder: "5492 8173 9012", category: "IDENTITY" },
    { fieldName: "location", label: "Current City & State", placeholder: "Hyderabad, Telangana", category: "IDENTITY" },

    // Education
    { fieldName: "college_name", label: "College / University Name", placeholder: "VNR VJIET Hyderabad", category: "EDUCATION" },
    { fieldName: "education_degree", label: "Course / Degree & Branch", placeholder: "B.Tech (CSE)", category: "EDUCATION" },
    { fieldName: "roll_number", label: "Roll / Registration Number", placeholder: "22071A0589", category: "EDUCATION" },

    // Income & Category
    { fieldName: "annual_income", label: "Annual Family Income (₹)", placeholder: "180000", type: "number", category: "INCOME" },
    { fieldName: "caste_category", label: "Caste / Social Category", placeholder: "OBC / BC-B / SC / ST / General", category: "INCOME" },

    // Banking
    { fieldName: "bank_account_no", label: "Bank Savings Account Number", placeholder: "38491029481", category: "BANKING" },
    { fieldName: "bank_ifsc", label: "Bank IFSC Code", placeholder: "SBIN0012948", category: "BANKING" },
  ];

  const handleStartEdit = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName);
    setTempValues((prev) => ({ ...prev, [fieldName]: currentValue }));
  };

  const handleSaveField = (fieldName: string) => {
    const val = tempValues[fieldName] !== undefined ? tempValues[fieldName] : "";
    updateProfileField(fieldName, val);
    setEditingField(null);
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

  const categories = [
    { key: "IDENTITY", title: "Identity & Personal Info", icon: User, iconBg: "bg-indigo-50 text-indigo-600" },
    { key: "EDUCATION", title: "Academic & College Details", icon: GraduationCap, iconBg: "bg-blue-50 text-blue-600" },
    { key: "INCOME", title: "Income & Reservation Category", icon: Banknote, iconBg: "bg-amber-50 text-amber-600" },
    { key: "BANKING", title: "Bank Account (DBT Seeding)", icon: Landmark, iconBg: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Your Verified Profile</h1>
          </div>
          <p className="text-xs text-slate-500">
            Seva Saarthi stores confirmed values with complete document provenance (F6, NFR: no silent writes).
          </p>
        </div>

        {/* Profile Strength Widget */}
        <div className="bg-white border border-slate-100 rounded-2xl p-3.5 px-5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">
              Profile Strength: <span className="text-emerald-600">{profileStrength}%</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {profileFields.filter((pf) => pf.verified && pf.value.trim().length > 0).length} verified fields
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
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
                  const storedField = profileFields.find((pf) => pf.field_name === fieldDef.fieldName);
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
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <span
                            className={cn(
                              "text-xs font-bold",
                              currentValue ? "text-slate-900" : "text-slate-400 italic"
                            )}
                          >
                            {currentValue || "Not entered"}
                          </span>

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
    </div>
  );
}
