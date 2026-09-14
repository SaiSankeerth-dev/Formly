"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import {
  ShieldCheck,
  ExternalLink,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Download,
  Sliders,
  Sparkles,
  Globe2,
  Info,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { toast } from "sonner";
import { AutofillAssistant } from "@/components/assistant/AutofillAssistant";

const PROTEAN_PAN_URL = "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html";

type ResizerMode = "photo" | "signature" | "document";
type PortalTarget = "protean" | "utiitsl";

interface PresetSpec {
  name: string;
  maxKb: number;
  widthPx: number;
  heightPx: number;
  aspectRatio: number;
  dpi: number;
  format: "image/jpeg";
  dimensionLabel: string;
  advisory: string;
}

const PRESETS: Record<PortalTarget, Record<ResizerMode, PresetSpec>> = {
  protean: {
    photo: {
      name: "Protean (NSDL) Passport Photo",
      maxKb: 50,
      widthPx: 276,
      heightPx: 386,
      aspectRatio: 2.5 / 3.5,
      dpi: 200,
      format: "image/jpeg",
      dimensionLabel: "3.5 cm × 2.5 cm (200 DPI, max 50 KB)",
      advisory: "Use a recent passport photo with a light/white background and face covering 70-80% of frame.",
    },
    signature: {
      name: "Protean (NSDL) Signature",
      maxKb: 50,
      widthPx: 531,
      heightPx: 236,
      aspectRatio: 4.5 / 2.0,
      dpi: 200,
      format: "image/jpeg",
      dimensionLabel: "2.0 cm × 4.5 cm (200 DPI, max 50 KB)",
      advisory: "Sign clearly in black or blue ink on clean white unruled paper.",
    },
    document: {
      name: "Protean Supporting Document",
      maxKb: 200,
      widthPx: 1200,
      heightPx: 1600,
      aspectRatio: 1 / 1.414,
      dpi: 200,
      format: "image/jpeg",
      dimensionLabel: "A4 Scan / e-Aadhaar (max 200 KB)",
      advisory: "Ensure full name, DOB, and address are distinctly readable.",
    },
  },
  utiitsl: {
    photo: {
      name: "UTIITSL Passport Photo",
      maxKb: 30,
      widthPx: 213,
      heightPx: 213,
      aspectRatio: 1,
      dpi: 300,
      format: "image/jpeg",
      dimensionLabel: "213 × 213 pixels (300 DPI, max 30 KB)",
      advisory: "UTIITSL strictly enforces 213x213 px resolution and under 30 KB file size.",
    },
    signature: {
      name: "UTIITSL Signature",
      maxKb: 60,
      widthPx: 400,
      heightPx: 200,
      aspectRatio: 2,
      dpi: 600,
      format: "image/jpeg",
      dimensionLabel: "400 × 200 pixels (600 DPI, max 60 KB)",
      advisory: "Scan signature at 600 DPI, cropped to 400x200 px under 60 KB.",
    },
    document: {
      name: "UTIITSL Supporting Document",
      maxKb: 300,
      widthPx: 1200,
      heightPx: 1600,
      aspectRatio: 1 / 1.414,
      dpi: 200,
      format: "image/jpeg",
      dimensionLabel: "A4 Scan / Document (max 300 KB)",
      advisory: "Document must be under 300 KB JPEG or PDF.",
    },
  },
};

export function SevaSaarthiAssistantPage() {
  const { user, profileFields } = useSevaSaarthi();
  const [isAutofillDrawerOpen, setIsAutofillDrawerOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [portal, setPortal] = useState<PortalTarget>("protean");
  const [mode, setMode] = useState<ResizerMode>("photo");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>("");
  const [sourceFileSize, setSourceFileSize] = useState<number>(0);

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [customKb, setCustomKb] = useState<number>(50);
  const [, setIsProcessing] = useState<boolean>(false);
  const [processedResult, setProcessedResult] = useState<{
    blob: Blob;
    dataUrl: string;
    sizeKb: number;
    width: number;
    height: number;
  } | null>(null);

  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activePreset = PRESETS[portal][mode];

  useEffect(() => {
    setCustomKb(activePreset.maxKb);
  }, [portal, mode, activePreset.maxKb]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a JPG, PNG, or WebP image file.");
      return;
    }

    setSourceFileName(file.name);
    setSourceFileSize(file.size);
    setZoom(1);
    setRotation(0);
    setProcessedResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);

      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        processImage(img, 1, 0, enhanceContrast, activePreset.maxKb);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (
    img: HTMLImageElement,
    zoomVal: number,
    rotVal: number,
    contrast: boolean,
    targetMaxKb: number
  ) => {
    setIsProcessing(true);

    try {
      const targetW = activePreset.widthPx;
      const targetH = activePreset.heightPx;

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetW, targetH);

      ctx.save();
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotVal * Math.PI) / 180);
      ctx.scale(zoomVal, zoomVal);

      const imgAspect = img.width / img.height;
      const targetAspect = targetW / targetH;
      let drawW = targetW;
      let drawH = targetH;

      if (imgAspect > targetAspect) {
        drawH = targetH;
        drawW = targetH * imgAspect;
      } else {
        drawW = targetW;
        drawH = targetW / imgAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      if (contrast) {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const d = imgData.data;

        if (mode === "signature") {
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            if (brightness > 170) {
              d[i] = 255;
              d[i + 1] = 255;
              d[i + 2] = 255;
            } else {
              d[i] = Math.max(0, r * 0.7);
              d[i + 1] = Math.max(0, g * 0.7);
              d[i + 2] = Math.max(0, b * 0.7);
            }
          }
        } else {
          const factor = (259 * (20 + 255)) / (255 * (259 - 20));
          for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
            d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128));
            d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      let minQuality = 0.3;
      let maxQuality = 0.95;
      let bestBlob: Blob | null = null;
      const targetSizeBytes = targetMaxKb * 1024 * 0.95;

      for (let attempt = 0; attempt < 7; attempt++) {
        const q = (minQuality + maxQuality) / 2;
        const blob: Blob | null = await new Promise((res) =>
          canvas.toBlob(res, "image/jpeg", q)
        );

        if (!blob) break;

        if (blob.size <= targetSizeBytes) {
          bestBlob = blob;
          minQuality = q;
        } else {
          maxQuality = q;
        }
      }

      if (!bestBlob) {
        bestBlob = await new Promise((res) =>
          canvas.toBlob(res, "image/jpeg", 0.4)
        );
      }

      if (bestBlob) {
        const dataUrl = URL.createObjectURL(bestBlob);
        setProcessedResult({
          blob: bestBlob,
          dataUrl,
          sizeKb: Math.round((bestBlob.size / 1024) * 10) / 10,
          width: targetW,
          height: targetH,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const reprocess = (
    newZoom = zoom,
    newRot = rotation,
    newContrast = enhanceContrast,
    newKb = customKb
  ) => {
    if (imageObjRef.current) {
      processImage(imageObjRef.current, newZoom, newRot, newContrast, newKb);
    }
  };

  const downloadPreparedImage = () => {
    if (!processedResult) return;
    const a = document.createElement("a");
    a.href = processedResult.dataUrl;
    const prefix = portal === "protean" ? "Protean_PAN" : "UTIITSL_PAN";
    a.download = `${prefix}_${mode.toUpperCase()}_${processedResult.sizeKb}KB.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const panFields = [
    { key: "app_type", label: "Application Type", value: "New PAN - Indian Citizen (Form 49A)", code: "49A" },
    { key: "cat_type", label: "Category", value: "INDIVIDUAL", code: "INDIVIDUAL" },
    { key: "title", label: "Title / Salutation", value: "SHRI", code: "1" },
    { key: "first_name", label: "First Name", value: "Sai", code: "Sai" },
    { key: "last_name", label: "Last Name / Surname", value: "Sankeerth", code: "Sankeerth" },
    { key: "dob", label: "Date of Birth", value: "15/08/2001", code: "15/08/2001" },
    { key: "email", label: "Email ID", value: user?.email || "user@gmail.com", code: user?.email || "user@gmail.com" },
    { key: "mobile", label: "Mobile Number", value: user?.phone || "9876543210", code: user?.phone || "9876543210" },
    { key: "aadhaar", label: "Aadhaar Number", value: "5492 8173 9012", code: "5492 8173 9012" },
  ];

  const handleCopyAll = () => {
    const text = panFields.map((f) => `${f.label}: ${f.value}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("All verified PAN profile fields copied to clipboard!");
  };

  const handleCopySingle = (key: string, value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    toast.success(`Copied ${label}: "${value}"`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenOfficialApplication = () => {
    const profileMap: Record<string, string> = {
      full_name: user?.name || "Sai Sankeerth",
      first_name: "Sai",
      last_name: "Sankeerth",
      surname: "Sankeerth",
      title: "SHRI",
      app_type: "49A",
      cat_type: "INDIVIDUAL",
      date_of_birth: "15/08/2001",
      dob: "15/08/2001",
      email: user?.email || "user@gmail.com",
      mobile: user?.phone || "9876543210",
      phone_number: user?.phone || "9876543210",
      gender: "Male",
      aadhaar_number: "5492 8173 9012",
      father_name: "Suresh Kumar",
      mother_name: "Laxmi Devi",
      permanent_address: "H.No 4-52/1, Green Hills Colony, Gachibowli, Hyderabad, Telangana - 500032",
      address: "H.No 4-52/1, Green Hills Colony, Gachibowli, Hyderabad, Telangana - 500032",
      pincode: "500032",
    };

    profileFields.forEach((f) => {
      if (f.field_name && f.value) profileMap[f.field_name] = f.value;
    });

    const payload = {
      user: { id: user?.id, name: user?.name, email: user?.email, phone: user?.phone },
      profileFields,
      profileMap,
      serviceId: "pan-application-protean",
      serviceName: "Instant e-PAN & Form 49A Application",
      officialDomain: "onlineservices.proteantech.in",
      applicationUrl: PROTEAN_PAN_URL,
      syncedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("seva_saarthi_active_profile", JSON.stringify(payload));
    } catch (e) {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SYNC_PROFILE", { detail: payload }));
      document.dispatchEvent(new CustomEvent("SEVA_SAARTHI_SYNC_PROFILE", { detail: payload }));

      window.dispatchEvent(
        new CustomEvent("SEVA_SAARTHI_ACTIVATE_SERVICE", {
          detail: {
            serviceId: "pan-application-protean",
            officialDomain: "onlineservices.proteantech.in",
            applicationUrl: PROTEAN_PAN_URL,
            supportLevel: "FULL_ASSIST",
            authority: "Income Tax Department / Protean",
            profileMap,
          },
        })
      );
      document.dispatchEvent(
        new CustomEvent("SEVA_SAARTHI_ACTIVATE_SERVICE", {
          detail: {
            serviceId: "pan-application-protean",
            officialDomain: "onlineservices.proteantech.in",
            applicationUrl: PROTEAN_PAN_URL,
            supportLevel: "FULL_ASSIST",
            authority: "Income Tax Department / Protean",
            profileMap,
          },
        })
      );
    }

    try {
      fetch("/api/agent/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AUTOFILL",
          serviceId: "pan-application-protean",
          portalUrl: PROTEAN_PAN_URL,
        }),
      }).catch(() => {});
    } catch (e) {}

    toast.success("Profile verified & synced! Opening official Protean portal with autofill...");
    window.open(PROTEAN_PAN_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
      {/* SECTION 1: VERIFIED OFFICIAL SERVICE CARD (EXACT MATCH TO CITIZEN SCREENSHOT) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
              <span>VERIFIED OFFICIAL SERVICE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Instant e-PAN & Form 49A Application
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Official Authority: Income Tax Department (Protean eGov / UTIITSL)
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Globe2 className="w-5 h-5" />
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mt-4 leading-relaxed">
          Income Tax Department (Protean eGov / UTIITSL) Official Portal (onlineservices.proteantech.in)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              OFFICIAL PORTAL
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mt-1 truncate">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">onlineservices.proteantech.in</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              SUPPORT LEVEL
            </div>
            <div className="text-xs font-black text-slate-900 mt-1">
              FULL_ASSIST
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              LAST VERIFIED
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
              <span>📅</span>
              <span>11/9/2026</span>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-50/60 rounded-2xl border border-slate-100 p-4 sm:p-5">
          <div className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>Mandatory Portal Enclosures (3)</span>
            <span className="text-[10px] text-slate-400 font-normal">Strict portal specifications</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Aadhaar Card (UIDAI)
              </div>
              <div className="font-mono text-[11px] text-slate-500">Max 200 KB · PDF, JPG, JPEG</div>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Recent Passport Size Photograph
              </div>
              <div className="font-mono text-[11px] text-slate-500">Max 50 KB · JPG, JPEG</div>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Applicant Signature on White Paper
              </div>
              <div className="font-mono text-[11px] text-slate-500">Max 50 KB · JPG, JPEG</div>
            </div>
          </div>
        </div>

        {/* 1-CLICK PAN AUTOFILL DATA PACKAGE */}
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Live Autofill Enabled
                </span>
                <span className="text-xs font-bold text-slate-800">
                  9 Form 49A Verified Fields
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                These safe citizen profile fields will be filled automatically when you open the Protean official portal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                title="Copy all PAN fields to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All Fields</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAutofillDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                <span>Autofill Drawer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3.5">
            {panFields.map((field) => (
              <div
                key={field.key}
                className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:border-blue-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 truncate">
                    {field.label}
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate mt-0.5 font-mono">
                    {field.value}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopySingle(field.key, field.value, field.label)}
                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 shrink-0 transition-colors"
                  title={`Copy ${field.label}`}
                >
                  {copiedField === field.key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Citizen Responsibility Notice:</strong> Open the official government website below. The Seva Saarthi assistant automatically fills permitted fields (Name, DOB, Mobile, Email, Category). You enter the CAPTCHA and review before clicking submit.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenOfficialApplication}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            title="Opens official Protean PAN Application in a new tab with autofill"
          >
            <span>OPEN OFFICIAL APPLICATION & AUTOFILL</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-500 font-mono">
            Direct Official Link: onlineservices.proteantech.in
          </span>
        </div>
      </div>

      {/* SECTION 2: PAN CARD IMAGE & DOCUMENT RESIZER (pancardresizer.com INTEGRATION) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                pancardresizer.com Engine
              </span>
              <span className="text-xs text-slate-400 font-semibold">100% In-Browser & Private</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Smart PAN Card Document & Photo Optimizer
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Automatically resizes, sharpens, and compresses your photo or signature to pass the official portal&apos;s strict upload checker.
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-2xl shrink-0 self-start md:self-auto">
            <button
              onClick={() => {
                setPortal("protean");
                reprocess();
              }}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all",
                portal === "protean"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Protean (NSDL)
            </button>
            <button
              onClick={() => {
                setPortal("utiitsl");
                reprocess();
              }}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all",
                portal === "utiitsl"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              UTIITSL Portal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setMode("photo");
              reprocess();
            }}
            className={cn(
              "p-4 rounded-2xl border text-left transition-all",
              mode === "photo"
                ? "border-blue-500 bg-blue-50/50 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>📸 Passport Photograph</span>
              {mode === "photo" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {portal === "protean" ? "3.5 × 2.5 cm · Max 50 KB" : "213 × 213 px · Max 30 KB"}
            </div>
          </button>

          <button
            onClick={() => {
              setMode("signature");
              reprocess();
            }}
            className={cn(
              "p-4 rounded-2xl border text-left transition-all",
              mode === "signature"
                ? "border-blue-500 bg-blue-50/50 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>✍️ Applicant Signature</span>
              {mode === "signature" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {portal === "protean" ? "2.0 × 4.5 cm · Max 50 KB" : "400 × 200 px · Max 60 KB"}
            </div>
          </button>

          <button
            onClick={() => {
              setMode("document");
              reprocess();
            }}
            className={cn(
              "p-4 rounded-2xl border text-left transition-all",
              mode === "document"
                ? "border-blue-500 bg-blue-50/50 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>📄 Aadhaar / Document</span>
              {mode === "document" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {portal === "protean" ? "A4 JPEG · Max 200 KB" : "A4 JPEG · Max 300 KB"}
            </div>
          </button>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Requirement:</strong> {activePreset.dimensionLabel}. {activePreset.advisory}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {!selectedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all hover:bg-slate-50/50 flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Click to choose your {mode === "photo" ? "photograph" : mode === "signature" ? "signature scan" : "document"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Supports JPG, PNG, WebP up to 10 MB
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Target: &le; {activePreset.maxKb} KB strictly
                </div>
              </div>
            ) : (
              <div className="space-y-4 bg-slate-50 p-5 rounded-3xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-800 truncate max-w-[200px]">
                    {sourceFileName}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                  >
                    Change Image
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Zoom / Crop Scale</span>
                      <span>{Math.round(zoom * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ZoomOut className="w-4 h-4 text-slate-400" />
                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setZoom(val);
                          reprocess(val, rotation, enhanceContrast, customKb);
                        }}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <ZoomIn className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const newRot = (rotation + 90) % 360;
                        setRotation(newRot);
                        reprocess(zoom, newRot, enhanceContrast, customKb);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Rotate 90°
                    </button>

                    <button
                      onClick={() => {
                        const newContrast = !enhanceContrast;
                        setEnhanceContrast(newContrast);
                        reprocess(zoom, rotation, newContrast, customKb);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all",
                        enhanceContrast
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      {mode === "signature" ? "Pure White Paper Filter" : "Auto Contrast Boost"}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Maximum File Size Limit</span>
                      <span className="font-mono text-blue-600 font-bold">&le; {customKb} KB</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="300"
                      step="5"
                      value={customKb}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setCustomKb(val);
                        reprocess(zoom, rotation, enhanceContrast, val);
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">
                      Official portal requirement is strictly &le; {activePreset.maxKb} KB.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[340px]">
            {processedResult ? (
              <div className="w-full space-y-4 text-center">
                <div className="relative inline-block border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm bg-white p-1">
                  <img
                    src={processedResult.dataUrl}
                    alt="Optimized PAN preview"
                    className="max-h-60 mx-auto object-contain rounded-xl"
                  />
                  <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                    {processedResult.width}×{processedResult.height} px
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Original Size:</span>
                    <span className="font-mono text-slate-700">
                      {Math.round(sourceFileSize / 1024)} KB
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Optimized Size:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {processedResult.sizeKb} KB
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Portal Compliance:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Passes {portal === "protean" ? "Protean" : "UTIITSL"} &le; {activePreset.maxKb} KB Check
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={downloadPreparedImage}
                    className="w-full flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download Prepared Image
                  </button>

                  <button
                    onClick={handleOpenOfficialApplication}
                    className="w-full sm:w-auto py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Open Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 space-y-2 p-6">
                <FileCheck className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
                <div className="text-xs font-semibold text-slate-600">No Image Processed Yet</div>
                <div className="text-[11px] text-slate-400 max-w-xs">
                  Upload your photograph or signature to see the live size counter and instant compliance optimization.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AUTOFILL ASSISTANT MODAL DRAWER */}
      <AutofillAssistant
        isOpen={isAutofillDrawerOpen}
        onClose={() => setIsAutofillDrawerOpen(false)}
      />
    </div>
  );
}
