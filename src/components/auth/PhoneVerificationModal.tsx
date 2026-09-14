"use client";

import React from "react";
import { X, Shield } from "lucide-react";
import { PhoneOtpFlow } from "@/components/auth/PhoneOtpFlow";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhone?: string;
  onVerified: (phone: string) => void;
}

export function PhoneVerificationModal({
  isOpen,
  onClose,
  currentPhone = "",
  onVerified,
}: PhoneVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-7 relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#3B49DF]/10 text-[#3B49DF] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Verify Phone Number
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Verify your mobile number using Supabase Phone Auth to complete your citizen profile.
            </p>
          </div>
        </div>

        {/* Phone OTP Flow */}
        <PhoneOtpFlow
          mode="profile"
          initialPhone={currentPhone}
          onSuccess={(phone) => {
            onVerified(phone);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
