import type { Metadata } from "next";
import { GovLayout } from "@/components/gov/GovLayout";

export const metadata: Metadata = {
  title: {
    template: "%s | Sarkaar Seva",
    default: "Sarkaar Seva — Government Operations Platform",
  },
  description: "Secure access to the Sarkaar Seva government operations platform.",
};

export default function GovRootLayout({ children }: { children: React.ReactNode }) {
  return <GovLayout>{children}</GovLayout>;
}
