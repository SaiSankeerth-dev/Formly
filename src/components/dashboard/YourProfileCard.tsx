"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  GraduationCap,
  Phone,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";

export function YourProfileCard() {
  const { user, profileFields, profileStrength } = useSevaSaarthi();

  // Extract real citizen data from profile fields
  const getField = (name: string) => profileFields.find((f) => f.field_name === name)?.value;

  const dob = getField("date_of_birth") || "Not provided";
  const location = getField("location") || getField("district") || "Not provided";
  const education = getField("education_degree") || "Not provided";
  const phone = getField("phone_number") || user?.phone || "Not provided";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CZ";

  const isComplete = profileStrength >= 80;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Your Profile</h3>
        <Link
          href="/profile"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Real User Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center ring-2 ring-blue-100 shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900 truncate">
              {user?.name || "Citizen"}
            </span>
            {isComplete ? (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Incomplete</span>
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 truncate mt-0.5">
            {user?.email || "Account not connected"}
          </div>
        </div>
      </div>

      {/* Real Citizen Metadata */}
      <div className="space-y-2.5 pt-1 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Date of Birth</span>
          </div>
          <span className="font-semibold text-slate-800">{dob}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>Location</span>
          </div>
          <span className="font-semibold text-slate-800">{location}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            <span>Education</span>
          </div>
          <span className="font-semibold text-slate-800">{education}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>Phone</span>
          </div>
          <span className="font-semibold text-slate-800 font-mono">{phone}</span>
        </div>
      </div>

      {/* Dynamic Profile Completion Bar */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Profile Completion</span>
          <span className="font-bold text-blue-600">{profileStrength}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, Math.min(100, profileStrength))}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400">
          {profileStrength < 100
            ? "Add your real verified details to enable instant live portal filling."
            : "All personal and demographic records are ready for live official portal assistance."}
        </p>

        <Link
          href="/profile"
          className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs mt-2"
        >
          <span>{profileStrength < 100 ? "Complete Profile" : "Edit Profile"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
