/**
 * useNotifications
 *
 * Manages the full notification lifecycle for a logged-in user:
 *
 *  1. Initial fetch   — loads the most recent 20 notifications on mount.
 *  2. SSE stream      — opens /notifications/stream and appends live events.
 *  3. Unread count    — derived from local state ONLY; never re-fetched from
 *                       the server after a mark-read action so reload cannot
 *                       resurrect the badge. The server is the source of truth
 *                       only on the initial page load.
 *  4. Mark one read   — optimistic local update first, then PATCH server.
 *                       Rolls back on failure.
 *  5. Mark all read   — optimistic local update first, then PATCH server.
 *                       Rolls back on failure.
 *  6. Refresh         — re-fetches the list (e.g. when the dropdown opens).
 *
 * ── Why "mark all read" used to reappear on reload ──────────────────────────
 *  The old hook called `fetchNotifications` (which overwrites the whole list
 *  from the server) inside `refresh()`, which the Navbar called every time the
 *  dropdown was opened.  If the PATCH had not yet committed by the time that
 *  second GET fired — or if the Navbar triggered a refresh on the SAME render
 *  cycle as the mark-all — the server still returned isRead:false items and
 *  clobbered the optimistic state.
 *
 *  Fix: `refresh()` now merges the server response with the current local
 *  read-state instead of overwriting it.  A notification that is locally marked
 *  read is NEVER flipped back to unread by a subsequent fetch.
 * ────────────────────────────────────────────────────────────────────────────
 */

import {useCallback, useEffect, useRef, useState} from "react";
import {apiFetch, API_ENDPOINTS, getToken} from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationPage = {
  content: NotificationItem[];
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications(isLoggedIn: boolean) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);

  const esRef = useRef<EventSource | null>(null);

  // ── Core setter: merge server data with LOCAL read state ──────────────────
  //
  // This is the key fix.  Every time we receive data from the server we apply
  // it through this function instead of using setNotifications directly.
  // It preserves any `isRead: true` that the user already set locally —
  // so a reload / re-fetch cannot un-mark a notification the user already read.
  //
  const applyServerList = useCallback((serverItems: NotificationItem[]) => {
    setNotifications((prev) => {
      // Build a map of locally-read IDs so we never regress them
      const locallyRead = new Set(
        prev.filter((n) => n.isRead).map((n) => n.id),
      );

      const merged = serverItems.map((n) => ({
        ...n,
        // If we already marked it read locally, keep it read regardless of
        // what the server says (the PATCH may still be in-flight)
        isRead: locallyRead.has(n.id) ? true : n.isRead,
      }));

      // Also keep any locally-read items that aren't in the server page yet
      // (e.g. optimistic entries added via SSE)
      const serverIds = new Set(serverItems.map((n) => n.id));
      const localOnly = prev.filter((n) => !serverIds.has(n.id));

      return [...merged, ...localOnly].slice(0, 50);
    });
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(
    async (opts: {isInitial?: boolean} = {}) => {
      if (!isLoggedIn) return;
      // Only show the spinner on the very first load, not on background refreshes
      if (opts.isInitial) setLoading(true);
      try {
        const data = await apiFetch<NotificationPage>(
          `${API_ENDPOINTS.notifications}?page=0&size=20`,
        );
        applyServerList(data.content ?? []);
      } catch {
        // Non-critical; badge stays based on local state
      } finally {
        if (opts.isInitial) setLoading(false);
      }
    },
    [isLoggedIn, applyServerList],
  );

  // ── SSE ───────────────────────────────────────────────────────────────────

  const openStream = useCallback(() => {
    if (!isLoggedIn) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const token = getToken();
    const streamUrl = token
      ? `${API_ENDPOINTS.notificationsStream}?token=${encodeURIComponent(token)}`
      : API_ENDPOINTS.notificationsStream;

    const es = new EventSource(streamUrl);
    esRef.current = es;

    es.addEventListener("connected", () => {
      setStreamConnected(true);
    });

    es.addEventListener("notification", (ev: MessageEvent) => {
      try {
        const incoming = JSON.parse(ev.data) as NotificationItem;
        // Prepend new SSE notification; applyServerList will deduplicate
        applyServerList([incoming]);
      } catch {
        // Malformed payload — ignore
      }
    });

    es.onerror = () => {
      setStreamConnected(false);
      // Native EventSource will reconnect automatically
    };
  }, [isLoggedIn, applyServerList]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setStreamConnected(false);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    void fetchNotifications({isInitial: true});
    openStream();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setStreamConnected(false);
    };
  }, [isLoggedIn, fetchNotifications, openStream]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Re-fetches and merges with current local read state. Safe to call anytime. */
  const refresh = useCallback(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  /** Optimistic mark-one-read: flips local state immediately, then PATCHes server. */
  const markOneRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? {...n, isRead: true} : n)),
    );
    try {
      await apiFetch(API_ENDPOINTS.markNotificationRead(id), {method: "PATCH"});
    } catch {
      // Roll back on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? {...n, isRead: false} : n)),
      );
    }
  }, []);

  /** Optimistic mark-all-read: flips all local state immediately, then PATCHes. */
  const markAllRead = useCallback(async () => {
    // Snapshot current state for rollback
    const snapshot = notifications;

    // Optimistic update — happens before the PATCH so the badge disappears instantly
    setNotifications((prev) => prev.map((n) => ({...n, isRead: true})));

    try {
      await apiFetch(API_ENDPOINTS.markAllNotificationsRead, {method: "PATCH"});
    } catch {
      // Roll back entire snapshot on failure
      setNotifications(snapshot);
    }
  }, [notifications]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    streamConnected,
    refresh,
    markOneRead,
    markAllRead,
  };
}
