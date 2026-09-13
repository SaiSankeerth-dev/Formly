"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  RotateCw,
  X,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";

export interface CitizenNotification {
  id: string;
  application_id?: string | null;
  recipient_type: "CITIZEN" | "EMPLOYEE";
  recipient_id: string;
  notification_type: string;
  title: string;
  body: string;
  severity: "INFO" | "ACTION_REQUIRED" | "WARNING" | "SUCCESS" | "ERROR";
  action_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

interface NotificationPopoverProps {
  buttonClassName?: string;
  badgeClassName?: string;
  iconClassName?: string;
}

export function NotificationPopover({
  buttonClassName = "relative p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#2F27CE]/30",
  badgeClassName = "absolute -top-1 -right-1 min-w-[18px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs",
  iconClassName = "w-4 h-4",
}: NotificationPopoverProps) {
  const router = useRouter();
  const { user } = useSevaSaarthi();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "READY" | "EMPTY" | "ERROR">("LOADING");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  const broadcastSync = (count: number) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("SEVA_NOTIFICATIONS_SYNC", { detail: { unreadCount: count } }));
    }
  };

  // Fetch real notifications for the authenticated citizen user
  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setStatus("EMPTY");
      return;
    }

    if (showLoading) {
      setStatus("LOADING");
    }

    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        throw new Error(`Failed to load notifications: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        const count = typeof data.unreadCount === "number"
          ? data.unreadCount
          : data.notifications.filter((n: CitizenNotification) => !n.read_at).length;
        setUnreadCount(count);
        setStatus(data.notifications.length === 0 ? "EMPTY" : "READY");
      } else {
        setStatus("ERROR");
      }
    } catch (err) {
      console.error("[NotificationPopover] Error fetching notifications:", err);
      setStatus("ERROR");
    }
  }, [user?.id]);

  // Initial fetch when user logs in or mounts
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(true);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setStatus("EMPTY");
    }
  }, [user?.id, fetchNotifications]);

  // Refresh whenever popover opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotifications(false);
    }
  }, [isOpen, user?.id, fetchNotifications]);

  // Listen for cross-instance notification updates (e.g. mobile vs desktop header)
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ unreadCount?: number }>;
      if (typeof customEvent.detail?.unreadCount === "number") {
        setUnreadCount(customEvent.detail.unreadCount);
      }
    };
    window.addEventListener("SEVA_NOTIFICATIONS_SYNC", handleSync);
    return () => window.removeEventListener("SEVA_NOTIFICATIONS_SYNC", handleSync);
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        bellButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read and handle navigation
  const handleNotificationClick = async (notif: CitizenNotification) => {
    // Optimistically mark as read
    if (!notif.read_at) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      const nextCount = Math.max(0, unreadCount - 1);
      setUnreadCount(nextCount);
      broadcastSync(nextCount);

      // Persist to backend
      try {
        await fetch(`/api/notifications/${notif.id}`, { method: "PATCH" });
      } catch (err) {
        console.error("[NotificationPopover] Failed to mark as read:", err);
      }
    }

    // Navigate to destination if available
    if (notif.action_url) {
      setIsOpen(false);
      if (notif.action_url.startsWith("http://") || notif.action_url.startsWith("https://")) {
        window.location.href = notif.action_url;
      } else {
        router.push(notif.action_url);
      }
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount === 0 || isMarkingAll) return;

    setIsMarkingAll(true);
    const nowIso = new Date().toISOString();

    // Optimistically mark all in state
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || nowIso })));
    setUnreadCount(0);
    broadcastSync(0);

    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (!res.ok) {
        console.warn("[NotificationPopover] Failed to mark all as read on server");
      }
    } catch (err) {
      console.error("[NotificationPopover] Error marking all as read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "SUCCESS":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "ACTION_REQUIRED":
      case "WARNING":
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case "ERROR":
        return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* 🔔 Focusable Bell Button */}
      <button
        ref={bellButtonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={
          unreadCount > 0
            ? `${unreadCount} new notification${unreadCount > 1 ? "s" : ""}`
            : "Notifications"
        }
        className={buttonClassName}
      >
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className={badgeClassName}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* 📋 Popover Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications popover"
          className="fixed sm:absolute right-4 sm:right-0 top-14 sm:top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Popover Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 tracking-tight uppercase">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="text-[11px] font-bold text-[#2F27CE] hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all as read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors sm:hidden"
                aria-label="Close notifications"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Popover Content States */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100/80">
            {/* 1. LOADING STATE */}
            {status === "LOADING" && (
              <div className="p-8 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-[#2F27CE] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-500">Loading notifications...</p>
              </div>
            )}

            {/* 2. ERROR STATE */}
            {status === "ERROR" && (
              <div className="p-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Couldn&apos;t load notifications.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Please check your connection and try again.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchNotifications(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#2F27CE] bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Try Again</span>
                </button>
              </div>
            )}

            {/* 3. EMPTY STATE */}
            {status === "EMPTY" && (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">No new notifications</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  We&apos;ll notify you here when your application status or verified document changes.
                </p>
              </div>
            )}

            {/* 4. READY STATE (Actual Real Notifications) */}
            {status === "READY" && notifications.length > 0 && (
              notifications.map((n) => {
                const isRead = Boolean(n.read_at);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 text-left group ${
                      isRead
                        ? "bg-white hover:bg-slate-50 text-slate-600"
                        : "bg-indigo-50/30 hover:bg-indigo-50/60 text-slate-900"
                    }`}
                  >
                    <div className="mt-0.5">{getSeverityIcon(n.severity)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-xs truncate ${
                            isRead ? "font-semibold text-slate-700" : "font-bold text-slate-900"
                          }`}
                        >
                          {n.title}
                        </span>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#2F27CE] shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(n.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {n.action_url && (
                          <span className="inline-flex items-center gap-1 font-bold text-[#2F27CE] group-hover:underline">
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Action button matching specification */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/80">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll || unreadCount === 0}
                className="w-full py-2 px-3 text-xs font-bold text-[#2F27CE] hover:text-indigo-800 bg-white hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Mark all notifications as read"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all as read</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
