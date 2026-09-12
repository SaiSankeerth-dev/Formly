"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  CornerDownLeft,
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_SERVICES_LIST;
    return POPULAR_SERVICES_LIST.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.authority.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [query]);

  // Section 25 unified options: Search services, Ask Saarthi, Documents, Applications, Profile, Settings
  const items = useMemo(() => {
    const list: Array<{
      id: string;
      type: "AI" | "SERVICE" | "NAV";
      label: string;
      sublabel?: string;
      icon?: any;
      action: () => void;
    }> = [];

    // 1. Ask Saarthi
    list.push({
      id: "ai_ask",
      type: "AI",
      label: "Ask Saarthi AI",
      sublabel: "Get instant guidance on any government scheme",
      action: () => {
        onClose();
        if (onAskSaarthi) onAskSaarthi();
        else if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_OPEN_AI"));
        }
      },
    });

    // 2. Services list
    filteredServices.slice(0, 5).forEach((srv) => {
      list.push({
        id: `srv_${srv.id}`,
        type: "SERVICE",
        label: srv.name,
        sublabel: srv.authority,
        action: () => {
          onClose();
          onSelectService(srv);
        },
      });
    });

    // 3. Navigation options (Section 25)
    const navItems = [
      { id: "nav_docs", label: "Documents", href: "/documents", icon: FolderOpen },
      { id: "nav_apps", label: "Applications", href: "/applications", icon: FileText },
      { id: "nav_prof", label: "Profile", href: "/profile", icon: User },
      { id: "nav_sett", label: "Settings", href: "/settings", icon: Settings },
    ];

    navItems.forEach((nav) => {
      list.push({
        id: nav.id,
        type: "NAV",
        label: nav.label,
        icon: nav.icon,
        action: () => {
          onClose();
          router.push(nav.href);
        },
      });
    });

    return list;
  }, [filteredServices, onAskSaarthi, onClose, onSelectService, router]);

  // Reset selectedIndex on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation handler (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

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
            placeholder="Search government services or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">↑↓</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">Enter</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">ESC</kbd>
          </div>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Ask Saarthi AI Option */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
              AI Assistant
            </div>
            <button
              onClick={() => {
                const aiItem = items.find((i) => i.id === "ai_ask");
                aiItem?.action();
              }}
              onMouseEnter={() => setSelectedIndex(0)}
              className={`w-full text-left flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${
                selectedIndex === 0
                  ? "bg-indigo-50/90 ring-1 ring-[#2F27CE]/30 text-[#2F27CE]"
                  : "hover:bg-slate-50 text-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-[#2F27CE] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">
                    Ask Saarthi AI
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Get instant guidance on any government scheme
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Government Services Option */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
              Government Services ({filteredServices.length})
            </div>
            <div className="space-y-1">
              {filteredServices.slice(0, 5).map((srv, idx) => {
                const itemIndex = 1 + idx;
                const isSelected = selectedIndex === itemIndex;
                return (
                  <button
                    key={srv.id}
                    onClick={() => {
                      onClose();
                      onSelectService(srv);
                    }}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`w-full text-left flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/90 ring-1 ring-[#2F27CE]/30 text-[#2F27CE]"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected ? "bg-[#2F27CE] text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs">
                          {srv.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {srv.authority}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      Open details &rarr;
                    </span>
                  </button>
                );
              })}
              {filteredServices.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No matching government services found
                </div>
              )}
            </div>
          </div>

          {/* Navigation Section */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
              Navigation
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "nav_docs", label: "Documents", href: "/documents", icon: FolderOpen },
                { id: "nav_apps", label: "Applications", href: "/applications", icon: FileText },
                { id: "nav_prof", label: "Profile", href: "/profile", icon: User },
                { id: "nav_sett", label: "Settings", href: "/settings", icon: Settings },
              ].map((nav, nIdx) => {
                const navItemIndex = 1 + Math.min(filteredServices.length, 5) + nIdx;
                const isSelected = selectedIndex === navItemIndex;
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.id}
                    onClick={() => {
                      onClose();
                      router.push(nav.href);
                    }}
                    onMouseEnter={() => setSelectedIndex(navItemIndex)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-xs font-semibold text-left cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/90 ring-1 ring-[#2F27CE]/30 text-[#2F27CE]"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
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
