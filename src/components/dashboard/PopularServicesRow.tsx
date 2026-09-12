"use client";

import React, { useRef } from "react";
import {
  Clock,
  ArrowRight,
  CreditCard,
  FileText,
  Users,
  GraduationCap,
  Vote,
  Globe,
  Car,
  ChevronRight,
} from "lucide-react";
import { POPULAR_SERVICES_LIST } from "@/lib/services/popular-services-data";
import { ServiceDetail } from "@/components/services/ServiceDetailDrawer";

interface PopularServicesRowProps {
  onSelectService: (service: ServiceDetail) => void;
  onViewAllClick?: () => void;
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  "pan-application-protean": CreditCard,
  "income-certificate": FileText,
  "caste-certificate": Users,
  "scholarship-nsp": GraduationCap,
  "voter-services": Vote,
  "passport-seva": Globe,
  "driving-licence": Car,
};

export function PopularServicesRow({ onSelectService, onViewAllClick }: PopularServicesRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 240, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2F27CE] flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Popular Services
          </h2>
        </div>

        <button
          onClick={onViewAllClick}
          className="text-xs font-bold text-[#2F27CE] hover:text-[#231CA8] flex items-center gap-1 group transition-colors cursor-pointer"
        >
          <span>View All Services</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Horizontal Tiles Row */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none scroll-smooth"
        >
          {POPULAR_SERVICES_LIST.map((service) => {
            const Icon = SERVICE_ICONS[service.id] || FileText;

            return (
              <button
                key={service.id}
                onClick={() => onSelectService(service)}
                className="group shrink-0 flex flex-col items-center justify-center p-3.5 w-28 sm:w-32 bg-slate-50/70 hover:bg-white border border-slate-200/70 hover:border-indigo-200 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm text-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-indigo-50 text-[#2F27CE] flex items-center justify-center mb-2.5 transition-colors border border-slate-100 group-hover:border-indigo-100 shadow-2xs">
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 line-clamp-2 leading-tight">
                  {service.name}
                </span>
              </button>
            );
          })}

          {/* Scroll Right Button matching reference arrow */}
          <button
            onClick={handleScrollRight}
            className="shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-[#2F27CE] text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer ml-1"
            title="Scroll more services"
            aria-label="Scroll more services"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
