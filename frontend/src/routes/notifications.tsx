import {createFileRoute} from "@tanstack/react-router";
import type {Page} from "@/types";
import {useEffect, useState} from "react";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {toast} from "sonner";

// type NotificationItem = {
//   id: string | number;
//   content: string;
//   createdAt: string;
//   isRead?: boolean;
// };

// type NotificationPage = {
//   content?: NotificationItem[];
// };

type NotificationItem = {
  id: string;
  type: string; // Matches backend DTO
  message: string; // Matches backend DTO (was 'content')
  link: string; // Matches backend DTO
  isRead: boolean;
  createdAt: string;
};

export const Route = createFileRoute("/notifications")({
  head: () => ({meta: [{title: "Notifications — TechForum Pro"}]}),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // const data = (await apiFetch(
        //   `${API_ENDPOINTS.notifications}?page=0&size=50`,
        // )) as NotificationPage;
        // setNotifications(data.content ?? []);
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

  const markAll = async () => {
    try {
      await apiFetch(API_ENDPOINTS.markAllNotificationsRead, {method: "PATCH"});
      setNotifications((prev) => prev.map((n) => ({...n, isRead: true})));
      toast.success("Marked all as read");
    } catch {
      toast.error("Failed to mark all read");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-code text-2xl font-bold">Notifications</h1>
        <button onClick={markAll} className="rounded border px-3 py-1 text-sm">
          Mark all read
        </button>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="text-muted-foreground">No notifications</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded p-3 ${n.isRead ? "bg-background/60" : "bg-surface"}`}
            >
              {/* <div className="text-sm font-medium">{n.content}</div> */}
              <div className="text-sm font-medium">{n.message}</div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
