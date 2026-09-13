"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { GovProvider } from "@/lib/store/gov-store";
import { GovernmentShell } from "@/components/gov/GovernmentShell";

export function GovLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/government/login" || pathname === "/gov/login";

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#F8FAFC]">{children}</div>;
  }

  return (
    <GovProvider>
      <GovernmentShell>{children}</GovernmentShell>
    </GovProvider>
  );
}
