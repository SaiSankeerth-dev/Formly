import type { Metadata } from "next";
import { GovernmentLoginView } from "@/components/gov/GovernmentLoginView";

export const metadata: Metadata = {
  title: "Sarkaar Seva — Government Portal",
  description: "Secure access to the Sarkaar Seva government operations platform.",
};

export default function GovernmentLoginPage() {
  return <GovernmentLoginView />;
}
