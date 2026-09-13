import {
  Home,
  FileText,
  Folder,
  User,
  Settings,
  HelpCircle,
  Bell,
  Compass,
} from "lucide-react";
import React from "react";

export interface CitizenNavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ElementType;
  description?: string;
}

/**
 * Authoritative Citizen Navigation definitions for Seva Saarthi.
 * All routes stay strictly within the Citizen Portal boundary.
 */
export const CITIZEN_PRIMARY_NAV: CitizenNavItem[] = [
  {
    id: "nav_dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Citizen homepage and ongoing application tracking",
  },
  {
    id: "nav_discover",
    label: "Discover",
    href: "/discover",
    icon: Compass,
    description: "Explore government welfare schemes and citizen services",
  },
  {
    id: "nav_applications",
    label: "Applications",
    href: "/applications",
    icon: FileText,
    description: "View and manage submitted applications",
  },
  {
    id: "nav_documents",
    label: "Documents",
    href: "/documents",
    icon: Folder,
    description: "Secure DigiLocker-integrated personal document locker",
  },
  {
    id: "nav_profile",
    label: "Profile",
    href: "/profile",
    icon: User,
    description: "Verified citizen profile attributes and identity data",
  },
  {
    id: "nav_settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Preferences, language, notifications, and DPDP privacy",
  },
];

export const CITIZEN_SECONDARY_NAV: CitizenNavItem[] = [
  {
    id: "nav_help",
    label: "Help & Support",
    href: "/help",
    icon: HelpCircle,
    description: "Citizen assistance desk and FAQs",
  },
  {
    id: "nav_notifications",
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    description: "Important application alerts and reminders",
  },
];

export const CITIZEN_FOOTER_NAV: CitizenNavItem[] = [
  { id: "ft_privacy", label: "Privacy Policy", href: "/privacy" },
  { id: "ft_terms", label: "Terms of Service", href: "/terms" },
  { id: "ft_support", label: "Support Desk", href: "/support" },
  { id: "ft_help", label: "Help Center", href: "/help" },
];
