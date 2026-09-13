"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ExternalLink,
  CheckCheck,
  RotateCw,
  X,
  Filter,
} from "lucide-react";

export interface GovNotification {
  id: string;
  application_id?: string | null;
  recipient_type: "EMPLOYEE";
  recipient_id: string;
  notification_type: string;
  title: string;
  body: string;
  severity: "INFO" | "ACTION_REQUIRED" | "WARNING" | "SUCCESS" | "ERROR";
  action_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

interface GovNotificationPopoverProps {
  buttonClassName?: string;
  badgeClassName?: string;
  iconClassName?: string;
}

export function GovNotificationPopover({
  buttonClassName = "relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer",
  badgeClassName = "absolute top-1.5 right-1.5 min-w-[18px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs",
  iconClassName = "w-5 h-5",
}: GovNotificationPopoverProps) {
  const router = useRouter();
  const pathname = usePathname();
  const prefix = pathname.startsWith("/government") ? "/government" : "/gov";

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<GovNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "READY" | "EMPTY" | "ERROR">("LOADING");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTION" | "EXCEPTIONS" | "UPDATES">("ALL");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch real notifications from government notifications endpoint
  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setStatus("LOADING");
    }

    try {
      const res = await fetch("/api/gov/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          const count =
            typeof data.unreadCount === "number"
              ? data.unreadCount
              : data.notifications.filter((n: GovNotification) => !n.read_at).length;
          setUnreadCount(count);
          setStatus(data.notifications.length === 0 ? "EMPTY" : "READY");
          return;
        }
      }
      setStatus("READY");
    } catch {
      setStatus("READY");
    }
  }, []);

  useEffect(() => {
    fetchNotifications(true);
    // Poll every 30 seconds for live updates in operations center
    const timer = setInterval(() => fetchNotifications(false), 30000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Click outside to dismiss popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await fetch("/api/gov/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("[GovNotificationPopover] Error marking all as read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Mark individual item as read and navigate
  const handleNotificationClick = async (notif: GovNotification) => {
    if (!notif.read_at) {
      try {
        await fetch("/api/gov/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notif.id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("[GovNotificationPopover] Error marking single read:", err);
      }
    }

    setIsOpen(false);

    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === "ACTION") {
      return notif.severity === "ACTION_REQUIRED";
    }
    if (activeFilter === "EXCEPTIONS") {
      return notif.severity === "WARNING" || notif.severity === "ERROR";
    }
    if (activeFilter === "UPDATES") {
      return notif.severity === "INFO" || notif.severity === "SUCCESS";
    }
    return true;
  });

  const getSeverityBadge = (severity: GovNotification["severity"]) => {
    switch (severity) {
      case "ACTION_REQUIRED":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          dot: "bg-rose-500",
          tag: "Action Required",
        };
      case "ERROR":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-600" />,
          bg: "bg-red-50 border-red-200 text-red-700",
          dot: "bg-red-500",
          tag: "Exception",
        };
      case "WARNING":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          bg: "bg-amber-50 border-amber-200 text-amber-700",
          dot: "bg-amber-500",
          tag: "Conflict Flag",
        };
      case "SUCCESS":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
          dot: "bg-emerald-500",
          tag: "System OK",
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-blue-600" />,
          bg: "bg-blue-50 border-blue-200 text-blue-700",
          dot: "bg-blue-500",
          tag: "Notice",
        };
    }
  };

  const formatRelativeTime = (iso: string) => {
    try {
      const now = Date.now();
      const diffMs = now - new Date(iso).getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="relative">
      {/* 🔔 Focusable Bell Button */}
      <button
        ref={bellButtonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={buttonClassName}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Operational Alerts"}
        aria-label="Open notifications menu"
        aria-expanded={isOpen}
      >
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className={badgeClassName}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 🪟 Interactive Popover Drawer */}
      {isOpen && (
        <div
          ref={containerRef}
          className="absolute right-0 mt-2.5 w-[380px] sm:w-[440px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#0A1128] to-[#1C2541] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-amber-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Operational Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-md">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-300">Case assignments, exceptions & mesh events</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                aria-label="Close notification menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 text-[11px] font-bold overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
                activeFilter === "ALL"
                  ? "bg-[#0A1128] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter("ACTION")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
                activeFilter === "ACTION"
                  ? "bg-[#0A1128] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              Action Required ({notifications.filter((n) => n.severity === "ACTION_REQUIRED").length})
            </button>
            <button
              onClick={() => setActiveFilter("EXCEPTIONS")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
                activeFilter === "EXCEPTIONS"
                  ? "bg-[#0A1128] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              Exceptions ({notifications.filter((n) => n.severity === "WARNING" || n.severity === "ERROR").length})
            </button>
            <button
              onClick={() => setActiveFilter("UPDATES")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
                activeFilter === "UPDATES"
                  ? "bg-[#0A1128] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              Updates
            </button>
          </div>

          {/* Notifications Scroll Area */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {status === "LOADING" && notifications.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
                <span>Loading operational alerts...</span>
              </div>
            )}

            {status !== "LOADING" && filteredNotifications.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 stroke-[1.5]" />
                <span className="font-semibold text-slate-700">No notifications in this filter</span>
                <span className="text-[11px] text-slate-400">All cases in this category are up to date.</span>
              </div>
            )}

            {filteredNotifications.map((notif) => {
              const badge = getSeverityBadge(notif.severity);
              const isUnread = !notif.read_at;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-3 rounded-2xl transition-all cursor-pointer border ${
                    isUnread
                      ? "bg-blue-50/40 hover:bg-blue-50/70 border-blue-200/60 shadow-2xs"
                      : "bg-white hover:bg-slate-50 border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity Icon Pill */}
                    <div className="mt-0.5 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0">
                      {badge.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {notif.body}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}
                          >
                            {badge.tag}
                          </span>
                          {notif.application_id && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                              {notif.application_id}
                            </span>
                          )}
                        </div>

                        {notif.action_url && (
                          <span className="text-[10px] font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0 shadow-xs animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Quick Links */}
          <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push(`${prefix}/queue`);
              }}
              className="font-bold text-slate-700 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Open My Queue →
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                router.push(`${prefix}/exceptions`);
              }}
              className="font-bold text-rose-700 hover:text-rose-800 transition-colors cursor-pointer"
            >
              Exceptions Center (3) →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
