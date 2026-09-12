"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FolderOpen,
  FileText,
  User,
  Settings,
  Sparkles,
  ArrowRight,
  X,
  CreditCard,
  Building,
} from "lucide-react";
import { POPULAR_SERVICES_LIST } from "@/lib/services/popular-services-data";
import { ServiceDetail } from "@/components/services/ServiceDetailDrawer";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: ServiceDetail) => void;
  onAskSaarthi?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectService,
  onAskSaarthi,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredServices = POPULAR_SERVICES_LIST.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.authority.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
  );

  const quickNav = [
    { label: "Your Documents", href: "/documents", icon: FolderOpen },
    { label: "My Applications", href: "/applications", icon: FileText },
    { label: "My Profile", href: "/profile", icon: User },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a service name or command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Ask Saarthi shortcut */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
              AI Assistant
            </div>
            <button
              onClick={() => {
                onClose();
                if (onAskSaarthi) {
                  onAskSaarthi();
                } else if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_OPEN_ASSISTANT"));
                }
              }}
              className="w-full text-left flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50/70 text-xs font-semibold text-slate-800 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#2F27CE] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-[#2F27CE]">
                    Ask Saarthi AI
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Get instant guidance on any government scheme
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2F27CE] group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* Government Services */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
              Government Services ({filteredServices.length})
            </div>
            <div className="space-y-1">
              {filteredServices.slice(0, 5).map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => {
                    onClose();
                    onSelectService(srv);
                  }}
                  className="w-full text-left flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-[#2F27CE] flex items-center justify-center transition-colors">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-[#2F27CE]">
                        {srv.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {srv.authority}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-indigo-600">
                    Open details &rarr;
                  </span>
                </button>
              ))}
              {filteredServices.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No matching government services found
                </div>
              )}
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
              Navigation
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {quickNav.map((nav) => {
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.label}
                    onClick={() => {
                      onClose();
                      router.push(nav.href);
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{nav.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
