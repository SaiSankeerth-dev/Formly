import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { GovernmentLoginView } from "@/components/gov/GovernmentLoginView";
import CitizenLoginClient from "./CitizenLoginClient";

export const metadata: Metadata = {
  title: "Citizen Login — Seva Saarthi",
  description: "Sign in to your Seva Saarthi citizen account. One Form. A Smarter India.",
};

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const forwardedPort = headersList.get("x-forwarded-port") || "";
  const forwardedHost = headersList.get("x-forwarded-host") || "";
  const isGov =
    forwardedPort === "3001" ||
    host.endsWith(":3001") ||
    forwardedHost.endsWith(":3001") ||
    process.env.NEXT_PUBLIC_APP_PLATFORM === "government" ||
    process.env.PLATFORM === "government";

  if (isGov) {
    return <GovernmentLoginView />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBFBFE]" />}>
      <CitizenLoginClient />
    </Suspense>
  );
}
