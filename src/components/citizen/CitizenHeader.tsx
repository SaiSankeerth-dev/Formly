"use client";

import React from "react";
import { Header } from "@/components/layout/Header";

export interface CitizenHeaderProps {
  onOpenMobileNav?: () => void;
  onOpenCommandPalette?: () => void;
}

export function CitizenHeader(props: CitizenHeaderProps) {
  return <Header {...props} />;
}
