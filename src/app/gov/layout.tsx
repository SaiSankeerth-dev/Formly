import type { Metadata } from "next";
import { GovLayout } from "@/components/gov/GovLayout";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: {
    template: "%s | Sarkaar Seva",
    default: "Sarkaar Seva — Government Operations Platform",
  },
  description: "Secure access to the Sarkaar Seva government operations platform.",
};

export default async function GovRootLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: server layout verifies gov shell is isolated to Sarkaar Seva branding.
  // Actual auth enforcement remains in middleware (redirect to /gov/login) + API validateGovSession.
  // We keep layout server-rendered to ensure metadata override (Sarkaar Seva) always wins over root Seva Saarthi.
  return <GovLayout>{children}</GovLayout>;
}
