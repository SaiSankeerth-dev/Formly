import type { Metadata } from "next";
import { Suspense } from "react";
import CitizenLoginClient from "./CitizenLoginClient";

export const metadata: Metadata = {
  title: "Citizen Login — Seva Saarthi",
  description: "Sign in to your Seva Saarthi citizen account. One Form. A Smarter India.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBFBFE]" />}>
      <CitizenLoginClient />
    </Suspense>
  );
}
