"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getNotificationsAction, markNotificationReadAction, markAllNotificationsReadAction, acceptWorkspaceInviteAction, declineWorkspaceInviteAction } from "@/app/actions-notifications";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Check,
  X,
  Clock,
  UserPlus,
  ListTodo,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { DbNotification } from "@/lib/db/schema";

interface InviteData {
  workspaceId?: string;
  workspaceName?: string;
  inviterName?: string;
  role?: string;
  status?: "pending" | "accepted" | "declined";
}

function parseInviteData(item: DbNotification): InviteData | null {
  if (item.type !== "invite") return null;
  try {
    if (item.data) return JSON.parse(item.data);
  } catch {}
  return { status: "pending" };
}

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
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [activeReminder, setActiveReminder] = useState<DbNotification | null>(null);
  const [isPulsingBell, setIsPulsingBell] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const reminderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

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
      if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
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
      setIsPulsingBell(false);
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

  const handleAcceptInvite = async (e: React.MouseEvent, item: DbNotification) => {
    e.stopPropagation();
    setActionPendingId(item.id);

    const oldData = parseInviteData(item) || {};
    const optimisticData = { ...oldData, status: "accepted" as const };

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === item.id
          ? { ...n, isRead: true, data: JSON.stringify(optimisticData) }
          : n
      )
    );

    try {
      const res = await acceptWorkspaceInviteAction(item.id);
      if (res.success) {
        showToast(`Invitation accepted! You joined ${res.workspaceName || "the workspace"}.`);
        router.refresh();
      } else {
        showToast(res.error || "Failed to accept invitation.");
        fetchNotifications();
      }
    } catch {
      showToast("Failed to accept invitation.");
      fetchNotifications();
    } finally {
      setActionPendingId(null);
    }
  };

  const handleDeclineInvite = async (e: React.MouseEvent, item: DbNotification) => {
    e.stopPropagation();
    setActionPendingId(item.id);

    const oldData = parseInviteData(item) || {};
    const optimisticData = { ...oldData, status: "declined" as const };

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === item.id
          ? { ...n, isRead: true, data: JSON.stringify(optimisticData) }
          : n
      )
    );

    try {
      const res = await declineWorkspaceInviteAction(item.id);
      if (res.success) {
        showToast("Workspace invitation declined.");
        router.refresh();
      } else {
        showToast(res.error || "Failed to decline invitation.");
        fetchNotifications();
      }
    } catch {
      showToast("Failed to decline invitation.");
      fetchNotifications();
    } finally {
      setActionPendingId(null);
    }
  };

  const handleNotifyLater = (e: React.MouseEvent, item: DbNotification) => {
    e.stopPropagation();
    setIsOpen(false);
    showToast("Reminder scheduled: You will be notified again in 10 seconds.");

    if (reminderTimerRef.current) {
      clearTimeout(reminderTimerRef.current);
    }

    reminderTimerRef.current = setTimeout(() => {
      setActiveReminder(item);
      setIsPulsingBell(true);
    }, 10000);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Toast banner */}
      {toastMessage && (
        <Card
          data-testid="notification-toast"
          className="fixed top-4 right-4 sm:right-6 z-50 px-4 py-2.5 shadow-xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md border-border/80"
        >
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-muted-foreground hover:text-foreground text-xs"
          >
            <X className="size-3" />
          </button>
        </Card>
      )}

      {/* Floating 10-Second Reminder Card */}
      {activeReminder && (
        <Card
          data-testid="invite-reminder-banner"
          className="fixed top-16 right-4 sm:right-6 z-50 p-4 max-w-sm w-full border-primary/40 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 animate-pulse">
              <Bell className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-semibold text-foreground">
                  Reminder: Workspace Invitation
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setActiveReminder(null);
                    setIsPulsingBell(false);
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs p-1"
                  title="Dismiss reminder"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {activeReminder.message}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  data-testid="reminder-accept-btn"
                  onClick={(e) => {
                    handleAcceptInvite(e, activeReminder);
                    setActiveReminder(null);
                    setIsPulsingBell(false);
                  }}
                  className="h-7 px-2.5 text-[11px] font-mono font-medium"
                >
                  <Check className="size-3 mr-1" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="reminder-decline-btn"
                  onClick={(e) => {
                    handleDeclineInvite(e, activeReminder);
                    setActiveReminder(null);
                    setIsPulsingBell(false);
                  }}
                  className="h-7 px-2.5 text-[11px] font-mono text-destructive hover:bg-destructive/10"
                >
                  <X className="size-3 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Bell Button */}
      <button
        type="button"
        data-testid="notification-bell-btn"
        onClick={handleToggle}
        title="Notifications"
        aria-label={`Notifications, ${unreadCount} unread`}
        className={`relative p-2 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none select-none cursor-pointer ${
          isPulsingBell ? "animate-pulse ring-2 ring-primary bg-primary/20 text-primary" : ""
        } ${
          isOpen
            ? "bg-accent text-primary ring-1 ring-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
        }`}
      >
        <Bell className="size-4" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground font-mono text-[9px] font-bold shadow-xs animate-in zoom-in"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Popover */}
      {isOpen && (
        <Card
          data-testid="notification-popover"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 border-border/80"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-foreground">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                data-testid="mark-all-read-btn"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[11px] font-mono text-primary hover:underline transition-colors disabled:opacity-50 cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-border/40 text-xs bg-muted/10">
            <button
              type="button"
              data-testid="tab-all-notifications"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                activeTab === "all"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              data-testid="tab-unread-notifications"
              onClick={() => setActiveTab("unread")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                activeTab === "unread"
                  ? "bg-background text-primary font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-border/40">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <CheckCircle2 className="size-5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  {activeTab === "unread"
                    ? "You are completely caught up with all workspace updates."
                    : "When you receive invitations or task assignments, they will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const inviteData = parseInviteData(item);
                const isInvite = item.type === "invite";
                const isPendingInvite =
                  isInvite && (!inviteData?.status || inviteData?.status === "pending");

                return (
                  <div
                    key={item.id}
                    data-testid={`notification-item-${item.id}`}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3 flex items-start gap-3 hover:bg-muted/30 transition cursor-pointer select-none ${
                      !item.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* Category icon */}
                    <div
                      className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === "invite"
                          ? "bg-primary/15 text-primary"
                          : item.type === "task_assigned"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.type === "invite" ? (
                        <UserPlus className="size-3.5" />
                      ) : item.type === "task_assigned" ? (
                        <ListTodo className="size-3.5" />
                      ) : (
                        <Info className="size-3.5" />
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {item.title}
                        </p>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.message}
                      </p>

                      {/* Interactive Invite Actions */}
                      {isInvite && (
                        <div className="mt-2.5">
                          {isPendingInvite ? (
                            <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                              <Button
                                size="sm"
                                data-testid={`accept-invite-btn-${item.id}`}
                                onClick={(e) => handleAcceptInvite(e, item)}
                                disabled={actionPendingId === item.id}
                                className="h-6 px-2 text-[10px] font-mono"
                              >
                                <Check className="size-2.5 mr-1" />
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`decline-invite-btn-${item.id}`}
                                onClick={(e) => handleDeclineInvite(e, item)}
                                disabled={actionPendingId === item.id}
                                className="h-6 px-2 text-[10px] font-mono text-destructive hover:bg-destructive/10"
                              >
                                <X className="size-2.5 mr-1" />
                                Decline
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`notify-later-btn-${item.id}`}
                                onClick={(e) => handleNotifyLater(e, item)}
                                disabled={actionPendingId === item.id}
                                className="h-6 px-1.5 text-[10px] font-mono text-muted-foreground"
                              >
                                <Clock className="size-2.5 mr-1" />
                                Later (10s)
                              </Button>
                            </div>
                          ) : inviteData?.status === "accepted" ? (
                            <div className="pt-1.5 border-t border-border/40 flex items-center gap-1 text-[11px] font-mono text-emerald-500">
                              <Check className="size-3" />
                              <span>Invitation Accepted</span>
                            </div>
                          ) : (
                            <div className="pt-1.5 border-t border-border/40 flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                              <X className="size-3" />
                              <span>Invitation Declined</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Unread indicator dot */}
                    {!item.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
