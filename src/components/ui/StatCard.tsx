"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface StatCardProps {
  title: string;
  count: number | string;
  icon: React.ElementType;
  href: string;
  iconBgColor: string;
  iconColor: string;
}

export function StatCard({
  title,
  count,
  icon: Icon,
  href,
  iconBgColor,
  iconColor,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md hover:border-slate-200 transition-all flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105",
            iconBgColor,
            iconColor
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{count}</div>
        </div>
      </div>
      <Link
        href={href}
        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
      >
        <span>View all</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
