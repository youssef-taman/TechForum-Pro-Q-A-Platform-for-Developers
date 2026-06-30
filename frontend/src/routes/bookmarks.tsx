import {createFileRoute, Link} from "@tanstack/react-router";
import {
  Bookmark,
  Loader2,
  Search,
  ArrowUpDown,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import {useEffect, useState, useRef} from "react";
import {toast} from "sonner";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import type {Thread, Page} from "@/types";
import {RUNTIME_CONFIG} from "@/lib/runtimeConfig";
import {Markdown} from "@/components/Markdown";
import {useAuth} from "@/lib/auth-context";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({meta: [{title: "My Bookmarks — TechForum Pro"}]}),
  component: BookmarksPage,
});

interface BookmarkDTO {
  id: string;
  threadId: string;
  threadTitle: string;
  threadBody: string;
  createdAt: string;
}
// interface Page<T> {
//   content: T[];
//   totalPages: number;
//   number: number;
// }

type SortOrder = "newest" | "oldest" | "az" | "za";

function BookmarksPage() {
  const {isLoggedIn} = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  //   const [threadBodies, setThreadBodies] = useState<Map<string, string>>(
  //     new Map(),
  //   );

  // Search / sort / multi-select
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removingBulk, setRemovingBulk] = useState(false);

  //   const PREFETCH_AHEAD = RUNTIME_CONFIG.PREFETCH_AHEAD;
  //   const THREAD_BODY_CACHE_LIMIT = RUNTIME_CONFIG.THREAD_BODY_CACHE_LIMIT;

  //   const addThreadBody = useRef((id: string, body: string) => {
  //     setThreadBodies((prev) => {
  //       const next = new Map(prev);
  //       next.set(id, body);
  //       while (next.size > THREAD_BODY_CACHE_LIMIT) {
  //         const oldest = next.keys().next().value as string;
  //         next.delete(oldest);
  //       }
  //       return next;
  //     });
  //   }).current;

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<Page<BookmarkDTO>>(
          `${API_ENDPOINTS.bookmarks}?page=${page}&size=10`,
        );
        setBookmarks(data.content);
        setTotalPages(data.totalPages);
        setSelected(new Set());
      } catch {
        toast.error("Failed to load bookmarks");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isLoggedIn, page]);

  // Fetch thread bodies

  //   useEffect(() => {
  //     if (!bookmarks.length) return;
  //     const idsToFetch = bookmarks.map((b) => b.threadId);
  //     Promise.all(
  //       idsToFetch.map((id) =>
  //         apiFetch<Thread>(API_ENDPOINTS.threadById(id))
  //           .then((t) => ({id, body: (t as Thread)?.body ?? ""}))
  //           .catch(() => ({id, body: ""})),
  //       ),
  //     ).then((results) => {
  //       results.forEach((r) => addThreadBody(r.id, r.body ?? ""));
  //     });
  //   }, [bookmarks, addThreadBody]);

  // Prefetch next pages

  //   useEffect(() => {
  //     if (!isLoggedIn) return;
  //     const nextPage = page + 1;
  //     if (nextPage >= totalPages) return;

  //     let cancelled = false;
  //     (async () => {
  //       try {
  //         const data = await apiFetch<Page<BookmarkDTO>>(
  //           `${API_ENDPOINTS.bookmarks}?page=${nextPage}&size=10`,
  //         );
  //         if (cancelled) return;
  //         const ids = data.content.map((b) => b.threadId);
  //         const results = await Promise.all(
  //           ids.map((id) =>
  //             apiFetch<Thread>(API_ENDPOINTS.threadById(id))
  //               .then((t) => ({
  //                 id,
  //                 body: (t as Thread)?.body ?? "",
  //               }))
  //               .catch(() => ({id, body: ""})),
  //           ),
  //         );
  //         if (cancelled) return;
  //         results.forEach((r) => addThreadBody(r.id, r.body ?? ""));

  //         for (let i = 2; i <= PREFETCH_AHEAD; i++) {
  //           const p = nextPage + (i - 1);
  //           if (p >= totalPages) break;
  //           try {
  //             const d = await apiFetch<Page<BookmarkDTO>>(
  //               `${API_ENDPOINTS.bookmarks}?page=${p}&size=10`,
  //             );
  //             const ids2 = d.content.map((b) => b.threadId);
  //             const r2 = await Promise.all(
  //               ids2.map((id) =>
  //                 apiFetch<Thread>(API_ENDPOINTS.threadById(id))
  //                   .then((t) => ({
  //                     id,
  //                     body: (t as Thread)?.body ?? "",
  //                   }))
  //                   .catch(() => ({id, body: ""})),
  //               ),
  //             );
  //             if (cancelled) break;
  //             r2.forEach((x) => addThreadBody(x.id, x.body ?? ""));
  //           } catch {
  //             /* ignore */
  //           }
  //         }
  //       } catch {
  //         /* ignore */
  //       }
  //     })();

  //     return () => {
  //       cancelled = true;
  //     };
  //   }, [page, totalPages, isLoggedIn, PREFETCH_AHEAD, addThreadBody]);

  const removeBookmark = async (threadId: string) => {
    try {
      await apiFetch(API_ENDPOINTS.bookmarkThread(threadId), {
        method: "DELETE",
      });
      setBookmarks((prev) => prev.filter((b) => b.threadId !== threadId));
      setSelected((prev) => {
        const s = new Set(prev);
        s.delete(threadId);
        return s;
      });
      toast.success("Bookmark removed");
    } catch {
      toast.error("Failed to remove bookmark");
    }
  };

  const removeBulk = async () => {
    if (selected.size === 0) return;
    setRemovingBulk(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          apiFetch(API_ENDPOINTS.bookmarkThread(id), {
            method: "DELETE",
          }),
        ),
      );
      setBookmarks((prev) => prev.filter((b) => !selected.has(b.threadId)));
      toast.success(
        `Removed ${selected.size} bookmark${selected.size > 1 ? "s" : ""}`,
      );
      setSelected(new Set());
    } catch {
      toast.error("Failed to remove some bookmarks");
    } finally {
      setRemovingBulk(false);
    }
  };

  const toggleSelect = (threadId: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(threadId)) {
        s.delete(threadId);
      } else {
        s.add(threadId);
      }
      // s.has(threadId) ? s.delete(threadId) : s.add(threadId);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((b) => b.threadId)));
    }
  };

  // Filter + sort derived list
  const filtered = bookmarks
    .filter((b) => b.threadTitle.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === "newest")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sort === "oldest")
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (sort === "az") return a.threadTitle.localeCompare(b.threadTitle);
      if (sort === "za") return b.threadTitle.localeCompare(a.threadTitle);
      return 0;
    });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-code text-2xl font-bold">
          <span className="text-muted-foreground">~/</span>bookmarks
        </h1>
        {bookmarks.length > 0 && (
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-code text-[11px] text-muted-foreground">
            {bookmarks.length} saved
          </span>
        )}
      </div>

      {!isLoggedIn ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-code text-sm text-muted-foreground">
            <Link to="/login" className="text-neon hover:underline">
              Log in
            </Link>{" "}
            to see your bookmarks.
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-code text-sm text-muted-foreground">
            No bookmarks yet.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block font-code text-xs text-neon hover:underline"
          >
            ← Browse questions
          </Link>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter bookmarks…"
                className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-3 font-code text-xs focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/20"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOrder)}
                className="h-9 appearance-none rounded-full border border-border bg-surface pl-9 pr-4 font-code text-xs text-foreground focus:border-neon focus:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>
            </div>

            {/* Select all + bulk remove */}
            <button
              onClick={toggleSelectAll}
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 font-code text-xs text-muted-foreground transition-colors hover:border-neon/40 hover:text-foreground"
            >
              {allSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-neon" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {allSelected ? "Deselect all" : "Select all"}
            </button>

            {selected.size > 0 && (
              <button
                onClick={removeBulk}
                disabled={removingBulk}
                className="flex h-9 items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/5 px-3 font-code text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                {removingBulk ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remove {selected.size} selected
              </button>
            )}
          </div>

          {/* Results count */}
          {query && (
            <p className="mt-2 font-code text-[11px] text-muted-foreground">
              {filtered.length} result
              {filtered.length !== 1 ? "s" : ""} for "{query}"
            </p>
          )}

          {/* Bookmark list */}
          {filtered.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="font-code text-sm text-muted-foreground">
                No bookmarks match your search.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {filtered.map((b) => {
                const isSelected = selected.has(b.threadId);
                return (
                  <div
                    key={b.id}
                    className={`flex items-start gap-3 rounded-xl border bg-card p-4 transition-all ${
                      isSelected
                        ? "border-neon/40 bg-neon/5"
                        : "border-border hover:border-neon/20"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(b.threadId)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-neon"
                      aria-label={isSelected ? "Deselect" : "Select"}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-neon" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/questions/$id"
                        params={{id: b.threadId}}
                        className="font-semibold text-sm text-foreground hover:text-neon transition-colors line-clamp-1"
                      >
                        {b.threadTitle}
                      </Link>
                      <p className="mt-0.5 font-code text-[11px] text-muted-foreground">
                        Saved {new Date(b.createdAt).toLocaleDateString()}
                      </p>
                      {/* {threadBodies.get(b.threadId) ? (
                        <div className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          <Markdown
                            content={threadBodies.get(b.threadId)!}
                            compact
                          />
                        </div>
                      ) : null} */}
                      {b.threadBody ? (
                        <div className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          <Markdown content={b.threadBody} compact />
                        </div>
                      ) : null}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeBookmark(b.threadId)}
                      title="Remove bookmark"
                      className="shrink-0 rounded-lg border border-destructive/30 p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 font-code text-xs">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon"
              >
                ← prev
              </button>
              <span className="text-muted-foreground">
                page {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon"
              >
                next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
