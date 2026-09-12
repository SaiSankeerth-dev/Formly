"use client";

import React from "react";
import Link from "next/link";
import { Search, Sparkles, FolderOpen, PlayCircle, ArrowRight } from "lucide-react";

interface QuickActionProps {
  onAskSaarthiClick?: () => void;
  onDiscoverClick?: () => void;
}

export function QuickActionCard({ onAskSaarthiClick, onDiscoverClick }: QuickActionProps) {
  const actions = [
    {
      title: "Discover Services",
      desc: "Find and explore verified government services",
      icon: Search,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      arrowColor: "text-blue-600",
      onClick: onDiscoverClick,
      href: "#popular-services",
    },
    {
      title: "Ask Saarthi",
      desc: "Get instant guidance on any government service",
      icon: Sparkles,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      arrowColor: "text-purple-600",
      onClick: onAskSaarthiClick,
    },
    {
      title: "Your Documents",
      desc: "Manage and prepare your documents for applications",
      icon: FolderOpen,
      iconColor: "text-teal-600",
      iconBg: "bg-teal-50",
      arrowColor: "text-teal-600",
      href: "/documents",
    },
    {
      title: "My Applications",
      desc: "Continue where you left off",
      icon: PlayCircle,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      arrowColor: "text-emerald-600",
      href: "/applications",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((act) => {
        const Icon = act.icon;

        const Content = (
          <div className="group h-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-3xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-2xl ${act.iconBg} ${act.iconColor} flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs`}>
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className={`w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:${act.arrowColor} transition-all duration-200 group-hover:translate-x-1`}>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-950">
                  {act.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  {act.desc}
                </p>
              </div>
            </div>
          </div>
        );

        if (act.href) {
          return (
            <Link key={act.title} href={act.href} onClick={act.onClick} className="block h-full">
              {Content}
            </Link>
          );
        }

        return (
          <div key={act.title} onClick={act.onClick} className="block h-full">
            {Content}
          </div>
        );
      })}
    </div>
  );
}
