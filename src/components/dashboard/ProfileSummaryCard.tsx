"use client";

import React from "react";
import Link from "next/link";
import { User, Calendar, MapPin, GraduationCap, Banknote, FileCheck, ArrowRight } from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { formatCurrency } from "@/lib/utils";

export function ProfileSummaryCard() {
  const { profileFields, profileStrength, stats, user } = useSevaSaarthi();

  // Extract key values from profile fields
  const name = profileFields.find((f) => f.field_name === "full_name")?.value || user.name;
  const dob = profileFields.find((f) => f.field_name === "date_of_birth")?.value || "2004-08-14";
  const location = profileFields.find((f) => f.field_name === "location")?.value || "Hyderabad, Telangana";
  const education = profileFields.find((f) => f.field_name === "education_degree")?.value || "B.Tech";
  const rawIncome = profileFields.find((f) => f.field_name === "annual_income")?.value || "180000";
  const incomeFormatted = `${formatCurrency(rawIncome)} / year`;

  // Calculate approximate age
  let age = 22;
  try {
    const birthYear = new Date(dob).getFullYear();
    if (!isNaN(birthYear)) {
      age = new Date().getFullYear() - birthYear;
    }
  } catch {
    age = 22;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Your Profile Summary</h2>
          <Link href="/profile" className="text-xs font-semibold text-indigo-600 hover:underline">
            Edit
          </Link>
        </div>

        {/* Profile Attributes List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
            <div className="flex items-center gap-2.5 text-slate-500 font-medium">
              <User className="w-4 h-4 text-slate-400" />
              <span>Name</span>
            </div>
            <span className="font-bold text-slate-800">{name}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
            <div className="flex items-center gap-2.5 text-slate-500 font-medium">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Age</span>
            </div>
            <span className="font-bold text-slate-800">{age}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
            <div className="flex items-center gap-2.5 text-slate-500 font-medium">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Location</span>
            </div>
            <span className="font-bold text-slate-800">{location}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
            <div className="flex items-center gap-2.5 text-slate-500 font-medium">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <span>Education</span>
            </div>
            <span className="font-bold text-slate-800">{education}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
            <div className="flex items-center gap-2.5 text-slate-500 font-medium">
              <Banknote className="w-4 h-4 text-slate-400" />
              <span>Income</span>
            </div>
            <span className="font-bold text-slate-800">{incomeFormatted}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2.5 text-slate-500 font-medium">
              <FileCheck className="w-4 h-4 text-slate-400" />
              <span>Documents</span>
            </div>
            <span className="font-bold text-slate-800">{stats.verifiedDocuments} Verified</span>
          </div>
        </div>
      </div>

      {/* Bottom Alert / Strength Callout */}
      <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4">
        <div className="text-xs font-bold text-emerald-900 mb-2">
          Great! Your profile is {profileStrength}% complete.
        </div>
        <div className="w-full h-2 bg-emerald-200/70 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${profileStrength}%` }}
          />
        </div>
        <Link
          href="/profile"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center justify-end gap-1 group"
        >
          <span>Improve Profile</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
