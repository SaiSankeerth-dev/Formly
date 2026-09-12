import React, { Suspense } from "react";
import { SevaSaarthiAssistantPage } from "@/components/assistant/SevaSaarthiAssistantPage";

export default function AssistantRoute() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-500">
          Loading Seva Saarthi browser assistant...
        </div>
      }
    >
      <SevaSaarthiAssistantPage />
    </Suspense>
  );
}
