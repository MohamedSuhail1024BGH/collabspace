"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions";
import type { DbNotification } from "@/lib/db/schema";

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

export function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await getNotificationsAction();
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch {
      // Silently ignore network / non-critical load issues
    }
  };

  useEffect(() => {
    let isMounted = true;
    getNotificationsAction().then((res) => {
      if (isMounted && res.success && res.notifications) {
        setNotifications(res.notifications);
      }
    }).catch(() => {});

    // Poll periodically every 30s
    const interval = setInterval(() => {
      getNotificationsAction().then((res) => {
        if (isMounted && res.success && res.notifications) {
          setNotifications(res.notifications);
        }
      }).catch(() => {});
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle outside click & Escape key to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleNotificationClick = (item: DbNotification) => {
    if (!item.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      startTransition(async () => {
        await markNotificationReadAction(item.id);
      });
    }

    if (item.link) {
      setIsOpen(false);
      router.push(item.link);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Button */}
      <button
        type="button"
        data-testid="notification-bell-btn"
        onClick={handleToggle}
        title="Notifications"
        aria-label={`Notifications, ${unreadCount} unread`}
        className={`relative p-2 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none select-none ${
          isOpen
            ? "bg-surface-container-high text-primary ring-1 ring-primary/30"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
        }`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-on-primary font-mono text-[9px] font-bold shadow-xs animate-in zoom-in"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Popover */}
      {isOpen && (
        <div
          data-testid="notification-popover"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-surface-container-high border border-outline/20 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-outline/15 bg-surface-container-low">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-on-surface font-headline-sm">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                data-testid="mark-all-read-btn"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[11px] font-mono text-primary hover:text-primary-container transition-colors disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-outline/10 text-xs">
            <button
              type="button"
              data-testid="tab-all-notifications"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                activeTab === "all"
                  ? "bg-surface-container-highest text-on-surface font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              data-testid="tab-unread-notifications"
              onClick={() => setActiveTab("unread")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                activeTab === "unread"
                  ? "bg-surface-container-highest text-primary font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-outline/10 scrollbar-thin">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant/70">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-xs font-medium text-on-surface">
                  {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-[11px] text-on-surface-variant font-body-sm max-w-xs mx-auto">
                  {activeTab === "unread"
                    ? "You are completely caught up with all workspace updates."
                    : "When you receive invitations or task assignments, they will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  data-testid={`notification-item-${item.id}`}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 flex items-start gap-3 hover:bg-surface-container transition cursor-pointer select-none ${
                    !item.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Category icon */}
                  <div
                    className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === "invite"
                        ? "bg-primary/20 text-primary"
                        : item.type === "task_assigned"
                        ? "bg-secondary/20 text-secondary"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {item.type === "invite" ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    ) : item.type === "task_assigned" ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-semibold text-on-surface truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] font-mono text-on-surface-variant/80 shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">
                      {item.message}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!item.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
