import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  AlertTriangle,
  History,
  Settings,
} from "lucide-react";
import React from "react";

export interface GovNavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ElementType;
  badgeKey?: string;
  activeMatch?: (pathname: string, prefix?: string) => boolean;
}

/**
 * Authoritative Government Navigation definitions for Sarkaar Seva.
 * All routes stay strictly within the Government Platform boundary (/gov/*).
 */
export const GOV_PRIMARY_NAV: GovNavItem[] = [
  {
    id: "gov_dashboard",
    label: "Dashboard",
    href: "/gov/dashboard",
    icon: LayoutDashboard,
    activeMatch: (p: string, prefix = "/gov") =>
      p === `${prefix}/dashboard` || p === `${prefix}` || p === "/gov" || p === "/government",
  },
  {
    id: "gov_applications",
    label: "Applications",
    href: "/gov/applications",
    icon: FileText,
    activeMatch: (p: string, prefix = "/gov") =>
      p === `${prefix}/applications` ||
      p.startsWith(`${prefix}/applications/`) ||
      p.startsWith(`${prefix}/workspace`),
  },
  {
    id: "gov_queue",
    label: "My Queue",
    href: "/gov/queue",
    icon: CheckSquare,
    badgeKey: "myQueue",
    activeMatch: (p: string, prefix = "/gov") => p.startsWith(`${prefix}/queue`),
  },
  {
    id: "gov_exceptions",
    label: "Exceptions",
    href: "/gov/exceptions",
    icon: AlertTriangle,
    badgeKey: "exceptions",
    activeMatch: (p: string, prefix = "/gov") => p.startsWith(`${prefix}/exceptions`),
  },
  {
    id: "gov_audit",
    label: "Audit",
    href: "/gov/audit",
    icon: History,
    activeMatch: (p: string, prefix = "/gov") => p.startsWith(`${prefix}/audit`),
  },
  {
    id: "gov_settings",
    label: "Settings",
    href: "/gov/settings",
    icon: Settings,
    activeMatch: (p: string, prefix = "/gov") => p.startsWith(`${prefix}/settings`),
  },
];
