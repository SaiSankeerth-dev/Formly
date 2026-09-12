"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Search,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { IndiaHeroVisual } from "@/components/dashboard/IndiaHeroVisual";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { PopularServicesRow } from "@/components/dashboard/PopularServicesRow";
import { SaarthiTipCard } from "@/components/dashboard/SaarthiTipCard";
import { ContinueWorkSection } from "@/components/dashboard/ContinueWorkSection";
import { ServiceDetailDrawer, ServiceDetail, AnyService } from "@/components/services/ServiceDetailDrawer";
import { FloatingSaarthiAI } from "@/components/assistant/FloatingSaarthiAI";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { POPULAR_SERVICES_LIST } from "@/lib/services/popular-services-data";
import { CitizenSessionRecord } from "@/lib/server/db";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoadingAuth, logout } = useSevaSaarthi();

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  // Dashboard API state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CitizenSessionRecord[]>([]);

  // Modals & Drawers state
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const firstName = dashboardData?.user?.firstName || (user?.name ? user.name.trim().split(/\s+/)[0] : "Citizen");

  // Suggestion tags matching specification
  const searchSuggestions = [
    { label: "PAN", serviceId: "pan-application-protean" },
    { label: "Income certificate", serviceId: "income-certificate" },
    { label: "Caste certificate", serviceId: "caste-certificate" },
    { label: "Scholarship", serviceId: "scholarship-nsp" },
    { label: "Driving licence", serviceId: "driving-licence" },
  ];

  // Fetch verified dashboard data for the authenticated user
  const fetchDashboardData = React.useCallback(async () => {
    setDashboardError(null);
    setIsLoadingDashboard(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 401) {
        // Session missing or expired -> purge stale state and redirect directly to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("seva_saarthi_active_session");
          localStorage.removeItem("seva_saarthi_active_profile");
        }
        router.push("/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // First-login onboarding detection: If citizen profile is not yet complete, route to wizard
          if (data.profile && !data.profile.completed) {
            const step = data.profile.currentStep || 1;
            router.push(`/onboarding/profile?step=${step}`);
            return;
          }

          setDashboardData(data);
          const recents = Array.isArray(data.recentServices)
            ? data.recentServices
            : Array.isArray(data.recentSessions)
            ? data.recentSessions
            : [];
          setSessions(recents);
        } else {
          setDashboardError(data.error || "Your dashboard couldn't be loaded.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setDashboardError(errData.error || "Your dashboard couldn't be loaded.");
      }
    } catch (err: any) {
      console.warn("[HomePage] Failed to fetch /api/dashboard", err);
      setDashboardError("Your dashboard couldn't be loaded.");
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user) {
        router.push("/login");
      } else {
        fetchDashboardData();
      }
    }
  }, [user, isLoadingAuth, router, fetchDashboardData]);

  const handleOpenService = (service: ServiceDetail) => {
    setSelectedService(service);
    setIsDrawerOpen(true);
  };

  const handleSuggestionClick = (serviceId: string) => {
    const target = POPULAR_SERVICES_LIST.find((s) => s.id === serviceId);
    if (target) {
      handleOpenService(target);
    }
  };

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Find best match in service registry
    const match = POPULAR_SERVICES_LIST.find(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.authority.toLowerCase().includes(query)
    );

    if (match) {
      handleOpenService(match);
    } else {
      // Open Saarthi AI to assist with unknown or general queries
      setIsAIOpen(true);
    }
  };

  const handleSessionCreated = (service: AnyService) => {
    const sId = "id" in service ? service.id : service.serviceId;
    const sName = "name" in service ? service.name : service.serviceName;
    const newSession: CitizenSessionRecord = {
      id: `sess_${Date.now()}`,
      userId: user?.id || "citizen",
      serviceId: sId,
      serviceName: sName,
      department: service.authority,
      officialUrl: service.officialApplicationUrl,
      status: "Work in progress",
      lastEditedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      nextAction: "Continue form",
    };

    setSessions((prev) => {
      const filtered = prev.filter((s) => s.serviceId !== sId);
      return [newSession, ...filtered];
    });
  };

  // 1. Loading Skeleton state (Rule 24: No hardcoded demo user flash)
  if (isLoadingAuth || isLoadingDashboard) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Skeleton Hero */}
        <div className="h-64 sm:h-72 bg-white/70 rounded-3xl border border-slate-100 p-8 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-48 h-6 bg-slate-200 rounded-full" />
            <div className="w-72 h-8 bg-slate-200 rounded-xl" />
            <div className="w-96 h-4 bg-slate-200 rounded-lg" />
          </div>
          <div className="w-full max-w-xl h-12 bg-slate-100 rounded-full" />
        </div>

        {/* Skeleton Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white/70 rounded-3xl border border-slate-100 p-5 shadow-xs" />
          ))}
        </div>

        {/* Skeleton Popular Services */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 h-44 bg-white/70 rounded-3xl border border-slate-100 p-6 shadow-xs" />
          <div className="h-44 bg-white/70 rounded-3xl border border-slate-100 p-6 shadow-xs" />
        </div>
      </div>
    );
  }

  // 2. Error State (Explicit error handling with Try Again refetch and Sign Out escape)
  if (dashboardError) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-100 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Your dashboard couldn&apos;t be loaded.</h2>
          <p className="text-xs text-slate-500">Please check your connection and try again.</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              fetchDashboardData();
            }}
            className="py-2.5 px-6 bg-[#2F27CE] hover:bg-[#231CA8] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              logout();
            }}
            className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      {/* ========================================================
          1. HERO BANNER matching Reference Image
          ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F0F4FF] via-[#F8FAFF] to-[#FFFFFF] border border-blue-100/80 p-6 sm:p-8 md:p-10 shadow-xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Left Text & Search Content */}
          <div className="max-w-2xl space-y-4">
            {/* Small Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50/90 text-[#2F27CE] text-xs font-bold rounded-full border border-indigo-100 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#433BFF]" />
              <span>Your AI-Powered Government Services Companion</span>
            </div>

            {/* Dynamic Personalized Headline */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Good {timeOfDay}, {firstName}!</span>
                <span className="text-2xl sm:text-3xl">👋</span>
              </h1>
              <h2 className="text-base sm:text-lg font-bold text-slate-700">
                What do you need to get done?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xl pt-0.5">
                Discover government services, prepare documents, and complete official applications with intelligent guidance.
              </p>
            </div>

            {/* Main Hero Search Bar */}
            <form
              onSubmit={handleHeroSearchSubmit}
              className="pt-2"
            >
              <div className="relative flex items-center max-w-xl bg-white border border-slate-200/90 rounded-full shadow-md shadow-indigo-100/40 p-1.5 pl-4 transition-all focus-within:ring-2 focus-within:ring-[#2F27CE]/20 focus-within:border-[#2F27CE]">
                <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                <input
                  type="text"
                  placeholder="I want to apply for an income certificate..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none min-w-0"
                />
                <button
                  type="submit"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#2F27CE] hover:bg-[#231CA8] active:scale-95 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-300/50 cursor-pointer shrink-0"
                  aria-label="Search service"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Clickable Search Suggestions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-slate-500">
              <span className="text-slate-400">Try searching:</span>
              {searchSuggestions.map((sug) => (
                <button
                  key={sug.label}
                  type="button"
                  onClick={() => handleSuggestionClick(sug.serviceId)}
                  className="px-3 py-1 bg-indigo-50/70 hover:bg-indigo-100/80 text-[#2F27CE] rounded-full text-xs font-semibold transition-colors cursor-pointer border border-indigo-100/60"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right India Hero Visual Illustration */}
          <div className="shrink-0 flex justify-center lg:justify-end">
            <IndiaHeroVisual />
          </div>
        </div>
      </div>

      {/* ========================================================
          2. QUICK ACTIONS (4 lightweight cards)
          ======================================================== */}
      <QuickActionCard
        onAskSaarthiClick={() => setIsAIOpen(true)}
        onDiscoverClick={() => {
          const el = document.getElementById("popular-services");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* ========================================================
          3. POPULAR SERVICES & SAARTHI TIP (Side-by-side)
          ======================================================== */}
      <div id="popular-services" className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        <div className="lg:col-span-3">
          <PopularServicesRow
            onSelectService={handleOpenService}
            onViewAllClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("SEVA_SAARTHI_OPEN_PALETTE"));
              }
            }}
          />
        </div>

        <div className="lg:col-span-1">
          <SaarthiTipCard />
        </div>
      </div>

      {/* ========================================================
          4. CONTINUE YOUR WORK (User-specific local sessions)
          ======================================================== */}
      <ContinueWorkSection
        sessions={sessions}
        onContinueSession={(session) => {
          const matched = POPULAR_SERVICES_LIST.find((s) => s.id === session.serviceId);
          if (matched) {
            handleOpenService(matched);
          } else if (session.officialUrl) {
            window.open(session.officialUrl, "_blank", "noopener,noreferrer");
          }
        }}
        onDiscoverClick={() => {
          const el = document.getElementById("popular-services");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* ========================================================
          5. MINIMAL FOOTER matching Reference Image
          ======================================================== */}
      <footer className="pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-600 transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-slate-600 transition-colors cursor-pointer">Terms</span>
          <span className="hover:text-slate-600 transition-colors cursor-pointer">Contact</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          v2.0.0
        </div>
      </footer>

      {/* ========================================================
          6. SERVICE DETAIL DRAWER (Real Official URLs)
          ======================================================== */}
      <ServiceDetailDrawer
        service={selectedService}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSessionCreated={handleSessionCreated}
      />

      {/* ========================================================
          7. FLOATING SAARTHI AI ASSISTANT WIDGET
          ======================================================== */}
      <FloatingSaarthiAI
        isOpen={isAIOpen}
        onOpen={() => setIsAIOpen(true)}
        onClose={() => setIsAIOpen(false)}
        onSelectService={(srv) => {
          setIsAIOpen(false);
          handleOpenService(srv);
        }}
      />
    </div>
  );
}
