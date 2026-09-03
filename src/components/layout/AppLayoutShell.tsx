"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoadingAuth } = useSevaSaarthi();

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPortalPage = pathname.startsWith("/portal");

  // Route protection: Redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !isAuthPage && !isPortalPage) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoadingAuth, isAuthPage, isPortalPage, router]);

  // If on login/signup or portal pages, render clean layout without sidebar/header
  if (isAuthPage || isPortalPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  // Show loading spinner while determining authentication state
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Checking secure session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and redirecting, render minimal placeholder
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated full dashboard shell
  return (
    <div className="min-h-screen flex bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
