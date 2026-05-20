"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, AlertTriangle, Info, Check, Loader2, Clock, LogIn, ShieldAlert } from "lucide-react";

interface Notification {
  id: string;
  title?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const FALLBACK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "New Interment",
    message:
      "Project 'broken-sass' has been interred by @deadbeef. One more soul for the mausoleum.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    title: "Ritual Complete",
    message:
      "Your ritual 'compile-failure-2024' has been resurrected and catalogued.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "3",
    title: "Rate Limit Warning",
    message:
      "Necromancer rate limit approaching. 2 of 5 rituals remaining for this cycle.",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "4",
    title: "Repository Scan",
    message:
      "Scan complete: 17 new failed projects found across your tracked orgs.",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Not-logged-in gate
// ---------------------------------------------------------------------------
function NotLoggedIn() {
  return (
    <div className="max-w-2xl mx-auto p-8 py-16">
      <div className="text-center max-w-sm mx-auto">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 border-2 border-ossuary-border flex items-center justify-center">
            <ShieldAlert size={36} className="text-ossuary-greyDark" />
          </div>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-ossuary-white mb-3">
          ACCESS_DENIED
        </h2>
        <p className="text-[11px] text-ossuary-grey tracking-wider mb-8 leading-relaxed">
          AUTHENTICATION REQUIRED TO VIEW SYSTEM ALERTS. ESTABLISH
          A SESSION TO RECEIVE NOTIFICATIONS.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-ossuary-yellow text-ossuary-black text-[11px] font-bold tracking-wider px-8 py-3 hover:bg-yellow-400 transition-colors uppercase"
        >
          <LogIn size={14} />
          INITIALIZE_SESSION
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const loggedIn = status === "authenticated" && !!userId;

  const [notifications, setNotifications] = useState<Notification[]>(FALLBACK_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setNotifications(data);
        } else {
          setNotifications(FALLBACK_NOTIFICATIONS);
        }
      } else {
        setNotifications(FALLBACK_NOTIFICATIONS);
      }
    } catch {
      setNotifications(FALLBACK_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (loggedIn) fetchNotifications();
  }, [loggedIn, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      setMarkingId(id);
      const res = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, read: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch {
      // Silently handle error
    } finally {
      setMarkingId(null);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  }, [notifications, markAsRead]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const base = "PROJECT_GRAVEYARD.SYS - Digital Ossuary";
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${base}`;
    } else {
      document.title = base;
    }
  }, [unreadCount]);

  // Auth gate — keep AFTER all hooks
  if (!loggedIn) return <NotLoggedIn />;

  const getTypeIcon = (notification: Notification) => {
    const title = notification.title?.toLowerCase() || "";
    if (title.includes("warning") || title.includes("limit")) {
      return <AlertTriangle size={16} className="text-ossuary-yellow" />;
    }
    if (title.includes("interment") || title.includes("alert")) {
      return <AlertTriangle size={16} className="text-red-400" />;
    }
    return <Info size={16} className="text-ossuary-grey" />;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "UNKNOWN";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-8 animate-fade-in">
      {/* Page title */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-ossuary-yellow font-bold text-lg tracking-widest uppercase flex items-center gap-2">
            <Bell size={18} />
            SYSTEM_ALERTS
          </h1>
          <div className="mt-2 h-px bg-ossuary-border" />
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => {
              markAllAsRead();
            }}
            className="text-[10px] text-ossuary-grey hover:text-ossuary-yellow tracking-wider uppercase transition-colors flex items-center gap-1"
          >
            <Check size={12} />
            MARK_ALL_READ
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-ossuary-grey py-8 justify-center">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[11px] tracking-wider">FETCHING_ALERTS...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div className="border border-ossuary-border bg-ossuary-panel p-12 text-center">
          <Bell size={32} className="text-ossuary-border mx-auto mb-4" />
          <p className="text-ossuary-grey text-sm tracking-wider">
            NO_ALERTS_DETECTED
          </p>
          <p className="text-ossuary-grey-dark text-[10px] mt-2 tracking-wider">
            The system is quiet. All remains are accounted for.
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border transition-colors ${
                notification.read
                  ? "border-ossuary-border bg-transparent"
                  : "border-ossuary-yellow/30 bg-ossuary-yellow/5"
              } p-4 flex items-start gap-3`}
            >
              <div className="mt-0.5">{getTypeIcon(notification)}</div>
              <div className="flex-1 min-w-0">
                {notification.title && (
                  <p className="text-[10px] text-ossuary-yellow tracking-wider uppercase mb-1">
                    {notification.title}
                  </p>
                )}
                <p
                  className={`text-[12px] tracking-wider leading-relaxed ${
                    notification.read
                      ? "text-ossuary-grey"
                      : "text-ossuary-white"
                  }`}
                >
                  {notification.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={10} className="text-ossuary-grey-dark" />
                  <span className="text-[9px] text-ossuary-grey-dark tracking-wider uppercase">
                    {formatDate(notification.createdAt)}
                  </span>
                  {!notification.read && (
                    <span className="text-[9px] text-ossuary-yellow tracking-wider uppercase ml-2">
                      [UNREAD]
                    </span>
                  )}
                </div>
              </div>
              {!notification.read && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  disabled={markingId === notification.id}
                  className="text-[9px] text-ossuary-grey hover:text-ossuary-yellow transition-colors tracking-wider uppercase flex-shrink-0 self-center"
                >
                  {markingId === notification.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "ACKNOWLEDGE"
                  )}
                </button>
              )}
            </div>
          ))}

          {/* Summary */}
          <div className="pt-4 border-t border-ossuary-border flex items-center justify-between">
            <span className="text-[10px] text-ossuary-grey-dark tracking-wider uppercase">
              {unreadCount} of {notifications.length} unread
            </span>
            <span className="text-[10px] text-ossuary-grey-dark tracking-wider uppercase">
              {unreadCount === 0
                ? "ALL_CLEAR"
                : `${unreadCount} PENDING_ACKNOWLEDGMENT`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
