import React, { Suspense } from "react";
import { CitizenAuthView } from "@/components/auth/CitizenAuthView";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F8FF]">
          <div className="w-8 h-8 border-3 border-[#3B49DF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CitizenAuthView initialMode="signup" />
    </Suspense>
  );
}
