import React, { Suspense } from "react";
import { MeeSevaAssistantPage } from "@/components/assistant/MeeSevaAssistantPage";

export default function AssistantRoute() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-500">
          Loading Seva Saarthi browser assistant...
        </div>
      }
    >
      <MeeSevaAssistantPage />
    </Suspense>
  );
}
