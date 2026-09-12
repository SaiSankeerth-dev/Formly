"use client";

import React, { useState } from "react";
import { Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";

const SAARTHI_TIPS = [
  "Keep your key documents ready (Aadhaar, PAN, photo, signature) to complete applications faster.",
  "Ensure uploaded documents are readable and within size limits for instantaneous AI autofill verification.",
  "Check your state domicile requirements before starting caste and income certificate applications.",
  "Official scholarship applications require your bank account to be linked with the Aadhaar NPCI mapper.",
];

export function SaarthiTipCard() {
  const [tipIndex, setTipIndex] = useState(0);

  const handlePrev = () => {
    setTipIndex((prev) => (prev === 0 ? SAARTHI_TIPS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setTipIndex((prev) => (prev === SAARTHI_TIPS.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="h-full bg-gradient-to-br from-[#F5F7FF] via-[#EEF2FF] to-[#E9EEFF] border border-blue-100/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Saarthi Tip
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-6 h-6 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              aria-label="Previous tip"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              className="w-6 h-6 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              aria-label="Next tip"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 font-medium leading-relaxed min-h-[50px]">
          {SAARTHI_TIPS[tipIndex]}
        </p>
      </div>

      <div className="flex items-center gap-1 mt-3">
        {SAARTHI_TIPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === tipIndex ? "w-4 bg-[#2F27CE]" : "w-1.5 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
