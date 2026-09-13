"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GOV_PRIMARY_NAV, GovNavItem } from "@/lib/navigation/governmentNavigation";
import { StateEmblem } from "@/components/ui/StateEmblem";

export interface GovNavigationProps {
  stats?: {
    myQueue?: number;
    needsReview?: number;
    exceptions?: number;
  };
  onCloseMobile?: () => void;
}

export function GovNavigation({ stats = {}, onCloseMobile }: GovNavigationProps) {
  const pathname = usePathname();
  const prefix = pathname.startsWith("/government") ? "/government" : "/gov";

  return (
    <div className="p-5 flex flex-col justify-between h-full select-none">
      <div>
        {/* Brand */}
        <div className="pb-6 border-b border-slate-800/80">
          <Link
            href={`${prefix}/dashboard`}
            className="flex items-center gap-3 group"
            onClick={onCloseMobile}
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-blue-950/50">
              <StateEmblem size={24} className="text-blue-300" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight leading-tight flex items-center gap-1.5 text-white">
                Sarkaar <span className="text-blue-400">Seva</span>
              </div>
              <div className="text-[10px] font-semibold text-slate-400 leading-tight">
                Government Operations Platform
              </div>
            </div>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="mt-5 space-y-1">
          {GOV_PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch
              ? item.activeMatch(pathname, prefix)
              : pathname.startsWith(`${prefix}/${item.id.replace("gov_", "")}`);

            let badgeCount: number | undefined;
            if (item.badgeKey === "myQueue") {
              badgeCount = stats.myQueue || (stats.needsReview && stats.needsReview > 0 ? stats.needsReview : undefined);
            } else if (item.badgeKey === "exceptions") {
              badgeCount = stats.exceptions && stats.exceptions > 0 ? stats.exceptions : undefined;
            }

            const linkHref = item.href.replace("/gov", prefix);

            return (
              <Link
                key={item.id}
                href={linkHref}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {Icon && (
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </div>

                {badgeCount !== undefined && badgeCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      isActive ? "bg-white/25 text-white" : "bg-rose-600 text-white"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tricolor Ribbon & Motto Footer */}
      <div className="pt-6 border-t border-slate-800/60 text-slate-400 text-[11px] leading-tight space-y-1">
        <div className="font-bold text-slate-200">Sarkaar Seva &bull; Operations</div>
        <div>Enable Efficient Governance for a Stronger India</div>
      </div>
    </div>
  );
}
