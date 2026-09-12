"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, FileText, Award, CreditCard, ChevronRight, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { services } from "@/lib/registry/official-service-registry";

export function RecommendedSchemes() {
  // Show top verified production services
  const featuredServiceIds = [
    "telangana-income-certificate",
    "pan-application-protean",
    "telangana-caste-certificate",
    "telangana-scholarships",
  ];

  const featuredServices = featuredServiceIds
    .map((id) => services.find((s) => s.serviceId === id || s.serviceId === id.replace("telangana-", "") + "-telangana"))
    .filter(Boolean) as typeof services;

  const getIcon = (id: string) => {
    switch (id) {
      case "pan-application-protean":
        return { icon: CreditCard, bg: "bg-blue-50 text-blue-600" };
      case "telangana-income-certificate":
        return { icon: FileText, bg: "bg-emerald-50 text-emerald-600" };
      case "telangana-caste-certificate":
        return { icon: Award, bg: "bg-teal-50 text-teal-600" };
      case "telangana-scholarships":
      default:
        return { icon: GraduationCap, bg: "bg-indigo-50 text-indigo-600" };
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-xs relative w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">Verified Official Government Services</h2>
          <p className="text-xs text-slate-500 mt-0.5">Authoritative state and central services operated directly on official portals.</p>
        </div>
        <Link href="/discover" className="text-xs font-semibold text-indigo-600 hover:underline">
          View all
        </Link>
      </div>

      {/* Grid of Verified Services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative w-full min-w-0">
        {featuredServices.map((service) => {
          const { icon: Icon, bg: iconBg } = getIcon(service.serviceId);
          return (
            <div
              key={service.serviceId}
              className="bg-white rounded-2xl border border-slate-100/90 p-4 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between w-full min-w-0"
            >
              <div className="min-w-0">
                {/* Top icon and Support Level */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0", iconBg)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap",
                    service.supportLevel === "FULL_ASSIST"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  )}>
                    {service.supportLevel.replace("_", " ")}
                  </span>
                </div>

                {/* Title and Authority */}
                <h3 className="font-bold text-sm text-slate-900 leading-snug mb-1 [overflow-wrap:anywhere] break-normal min-w-0">
                  {service.serviceName}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3 [overflow-wrap:anywhere] break-normal min-w-0">
                  {service.authority}
                </p>
              </div>

              {/* Portal Info and Action */}
              <div className="pt-2 border-t border-slate-50 min-w-0 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{service.officialDomains[0]}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/assistant?serviceId=${service.serviceId}`}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-center block transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                  >
                    Assistant
                  </Link>
                  <a
                    href={service.officialApplicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl text-xs font-semibold text-center block transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                    title="Open official portal"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {/* Carousel Arrow Button (Right) */}
        <Link
          href="/discover"
          className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all z-10"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
