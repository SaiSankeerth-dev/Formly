import type { Metadata } from "next";
import { GovLayoutClient } from "./GovLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Sarkaar Seva",
    default: "Sarkaar Seva — Government Operations Platform",
  },
  description: "Secure access to the Sarkaar Seva government operations platform.",
};

export default function GovLayout({ children }: { children: React.ReactNode }) {
  return <GovLayoutClient>{children}</GovLayoutClient>;
}
