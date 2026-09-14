"use client";

import React, { useMemo, useState } from "react";
import { generateQrMatrix, generateQrSvgPath } from "@/lib/auth/qr-code";
import { Loader2, Copy, Check, X, Smartphone, ExternalLink } from "lucide-react";

interface TruecallerQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  deepLink: string;
}

export function TruecallerQrModal({
  isOpen,
  onClose,
  requestId,
  deepLink,
}: TruecallerQrModalProps) {
  const [copied, setCopied] = useState(false);

  // Compute verify URL to encode in the QR code
  const mobileVerifyUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/auth/truecaller/mobile-verify?requestId=${encodeURIComponent(
      requestId
    )}`;
  }, [requestId]);

  // Generate SVG path from QR matrix
  const { svgPath, matrixSize } = useMemo(() => {
    if (!mobileVerifyUrl) return { svgPath: "", matrixSize: 21 };
    try {
      const matrix = generateQrMatrix(mobileVerifyUrl);
      const path = generateQrSvgPath(matrix);
      return { svgPath: path, matrixSize: matrix.length };
    } catch {
      return { svgPath: "", matrixSize: 21 };
    }
  }, [mobileVerifyUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (mobileVerifyUrl) {
      navigator.clipboard.writeText(mobileVerifyUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center relative overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="w-12 h-12 rounded-2xl bg-[#0087FF]/10 text-[#0087FF] flex items-center justify-center mx-auto mb-3 shadow-xs">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M19.82 15.65c-1.22-.05-2.42-.25-3.55-.61-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.55 6.55 8.35 5.35 8.3 4.13c-.04-.63-.56-1.13-1.2-1.13H3.94c-.69 0-1.26.58-1.23 1.27.47 7.79 6.7 14.02 14.49 14.49.69.03 1.27-.54 1.27-1.23v-3.16c0-.64-.5-1.16-1.13-1.2z" />
          </svg>
        </div>

        <h3 className="text-base font-black text-slate-900">Verify with Truecaller</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Scan this QR code with your mobile camera or Truecaller app to complete 1-tap sign-in.
        </p>

        {/* QR Code Canvas Frame */}
        <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl inline-flex flex-col items-center justify-center shadow-inner">
          {svgPath ? (
            <svg
              viewBox={`-2 -2 ${matrixSize + 4} ${matrixSize + 4}`}
              className="w-44 h-44 fill-slate-900 drop-shadow-xs"
              shapeRendering="crispEdges"
            >
              <rect
                x="-2"
                y="-2"
                width={matrixSize + 4}
                height={matrixSize + 4}
                fill="#ffffff"
                rx="2"
              />
              <path d={svgPath} />
            </svg>
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#0087FF]" />
            </div>
          )}
        </div>

        {/* Polling Pulse Status */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#0087FF] bg-[#0087FF]/5 py-2 px-3 rounded-xl border border-[#0087FF]/20 mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0087FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0087FF]"></span>
          </span>
          <span>Waiting for mobile confirmation...</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied!" : "Copy Link"}</span>
          </button>

          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 bg-[#0087FF] hover:bg-[#0070D4] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Open App</span>
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-semibold"
        >
          Cancel &amp; use SMS OTP instead
        </button>
      </div>
    </div>
  );
}
