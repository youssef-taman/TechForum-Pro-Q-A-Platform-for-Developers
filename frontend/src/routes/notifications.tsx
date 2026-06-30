import {createFileRoute, Link} from "@tanstack/react-router";
import type {Page} from "@/types";
import {useEffect, useState} from "react";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {toast} from "sonner";
import {Bell, BellOff, CheckCheck, ExternalLink, Loader2} from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notificationIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "reply":
    case "comment":
      return "💬";
    case "mention":
      return "@";
    case "upvote":
    case "vote":
      return "▲";
    case "answer":
    case "accepted":
      return "✓";
    default:
      return "•";
  }
}

export const Route = createFileRoute("/notifications")({
  head: () => ({meta: [{title: "Notifications — TechForum Pro"}]}),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<Page<NotificationItem>>(
          `${API_ENDPOINTS.notifications}?page=0&size=50`,
        );
        setNotifications(data.content);
      } catch {
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const markOne = async (id: string) => {
    try {
      await apiFetch(API_ENDPOINTS.markNotificationRead(id), {method: "PATCH"});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? {...n, isRead: true} : n)),
      );
    } catch {
      // silent — not critical
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await apiFetch(API_ENDPOINTS.markAllNotificationsRead, {method: "PATCH"});
      setNotifications((prev) => prev.map((n) => ({...n, isRead: true})));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-code text-xl font-bold">
              <span className="text-muted-foreground">~/</span>notifications
            </h1>
            <p className="font-code text-xs text-muted-foreground">
              {loading
                ? "Loading…"
                : unreadCount > 0
                  ? `${unreadCount} unread`
                  : "All caught up"}
            </p>
          </div>
        </div>
        {!loading && notifications.length > 0 && unreadCount > 0 && (
          <button
            type="button"
            onClick={markAll}
            disabled={markingAll}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon disabled:opacity-50 transition-colors"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-neon" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <BellOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-code text-sm font-medium text-foreground">
            No notifications yet
          </p>
          <p className="mt-1 font-code text-xs text-muted-foreground">
            Activity on your questions and replies will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => {
            const inner = (
              <div
                className={`group relative flex items-start gap-3.5 rounded-xl border bg-card px-4 py-3.5 shadow-sm transition-all ${
                  n.isRead
                    ? "border-border opacity-70 hover:opacity-100"
                    : "border-neon/30 hover:border-neon/60 hover:shadow-md"
                }`}
              >
                {/* Unread dot */}
                {!n.isRead && (
                  <span className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-neon" />
                )}

                {/* Type icon badge */}
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-code text-xs font-bold ${
                    n.isRead
                      ? "bg-surface text-muted-foreground"
                      : "bg-neon/15 text-neon"
                  }`}
                >
                  {notificationIcon(n.type)}
                </div>

                <div className="min-w-0 flex-1 pr-4">
                  <p
                    className={`text-sm leading-snug ${n.isRead ? "text-muted-foreground" : "font-medium text-foreground"}`}
                  >
                    {n.message}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 font-code text-[11px] text-muted-foreground">
                    <span>{relativeTime(n.createdAt)}</span>
                    {n.type && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="capitalize">{n.type}</span>
                      </>
                    )}
                  </div>
                </div>

                {n.link && (
                  <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-neon transition-colors" />
                )}
              </div>
            );

            return n.link ? (
              <Link
                key={n.id}
                to={n.link as never}
                onClick={() => {
                  if (!n.isRead) void markOne(n.id);
                }}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) void markOne(n.id);
                }}
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
