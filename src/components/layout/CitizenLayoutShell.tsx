"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { CitizenNavigation, CitizenMobileNavigation } from "@/components/citizen/CitizenNavigation";
import { CitizenHeader } from "@/components/citizen/CitizenHeader";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ServiceDetailDrawer, AnyService } from "@/components/services/ServiceDetailDrawer";
import { CitizenFooter } from "@/components/citizen/CitizenFooter";

export function CitizenLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoadingAuth, user } = useSevaSaarthi();
  console.log("[CITIZEN SHELL] pathname:", pathname, "isLoadingAuth:", isLoadingAuth, "user:", user?.id);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<AnyService | null>(null);

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPortalPage = pathname.startsWith("/portal");
  const isTrackPage = pathname.startsWith("/track") || pathname.includes("/status");
  const isOnboarding = pathname.startsWith("/onboarding");

  // Close mobile navigation drawer whenever route changes
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  // Listen for global command palette trigger
  useEffect(() => {
    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    window.addEventListener("SEVA_SAARTHI_OPEN_PALETTE", handleOpenPalette);
    return () => window.removeEventListener("SEVA_SAARTHI_OPEN_PALETTE", handleOpenPalette);
  }, []);

  // If on login/signup, portal simulation, full tracker, or onboarding screen, render clean layout without citizen sidebar/header
  if (isAuthPage || isPortalPage || isTrackPage || isOnboarding) {
    return <div className="min-h-screen">{children}</div>;
  }

  // Show loading spinner while determining authentication state
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#2F27CE] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Checking secure citizen session...</p>
        </div>
      </div>
    );
  }

  // Authenticated full citizen dashboard shell
  return (
    <div className="min-h-screen flex bg-[#FBFBFE] w-full max-w-full overflow-x-hidden relative">
      <CitizenNavigation />
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
        <CitizenHeader
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto box-border overflow-x-hidden">
          {children}
        </main>
        <CitizenFooter />
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectService={(s) => setSelectedService(s)}
      />

      {/* Global Service Detail Drawer */}
      <ServiceDetailDrawer
        service={selectedService}
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
      />

      {/* Mobile Drawer */}
      <CitizenMobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
    </div>
  );
}
