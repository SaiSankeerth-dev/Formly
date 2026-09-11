"use client";

import { ExternalLink, Lock, ShieldCheck, X } from "lucide-react";

interface BrowserAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName?: string;
  portalUrl?: string;
  portalDomain?: string;
}

export function BrowserAgentModal({
  isOpen,
  onClose,
  serviceName = "Government service",
  portalUrl,
  portalDomain,
}: BrowserAgentModalProps) {
  if (!isOpen) return null;

  const isVerifiedUrl = Boolean(portalUrl && /^https:\/\//i.test(portalUrl));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Seva Saarthi live handoff</div>
            <h2 className="mt-1 text-xl font-black text-slate-900">{serviceName}</h2>
            <p className="mt-1 text-xs text-slate-500">{portalDomain || "Verified official portal"}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
            Open the real official website, sign in there yourself, and start assistance from the
            browser extension. Seva Saarthi does not launch a headless browser or clone the portal.
          </div>
          <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Live DOM only</div>
            <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-emerald-600" />Credentials stay with you</div>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            The extension may fill permitted fields and prepare selected documents. It stops for
            OTP, CAPTCHA, payment, legal declarations, and final submission.
          </p>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
            Close
          </button>
          <a
            href={isVerifiedUrl ? portalUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!isVerifiedUrl}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white ${isVerifiedUrl ? "bg-blue-600 hover:bg-blue-700" : "pointer-events-none bg-slate-300"}`}
          >
            Open official site <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
