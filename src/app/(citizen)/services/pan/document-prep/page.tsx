import React from "react";
import { PanDocumentPreparation } from "@/components/pan/PanDocumentPreparation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PAN Document Preparation Suite | Seva Saarthi",
  description: "Prepare and optimize Photo, Signature, and Supporting Documents for Protean (NSDL) and UTIITSL PAN Card applications with 100% client-side privacy.",
};

export default function PanServiceDocumentPrepPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PanDocumentPreparation />
    </div>
  );
}
