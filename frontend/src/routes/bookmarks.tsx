import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({ meta: [{ title: "My Bookmarks — TechForum Pro" }] }),
  component: BookmarksPage,
});

interface BookmarkDTO { id: string; threadId: string; threadTitle: string; createdAt: string }
interface Page<T> { content: T[]; totalPages: number; number: number }

function BookmarksPage() {
  const { isLoggedIn } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<Page<BookmarkDTO>>(
          `${API_ENDPOINTS.bookmarks}?page=${page}&size=10`
        );
        setBookmarks(data.content);
        setTotalPages(data.totalPages);
      } catch {
        toast.error("Failed to load bookmarks");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isLoggedIn, page]);

  const removeBookmark = async (threadId: string) => {
    try {
      await apiFetch(API_ENDPOINTS.bookmarkThread(threadId), { method: "DELETE" });
      setBookmarks((prev) => prev.filter((b) => b.threadId !== threadId));
      toast.success("Bookmark removed");
    } catch {
      toast.error("Failed to remove bookmark");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-code text-2xl font-bold">
        <span className="text-muted-foreground">~/</span>bookmarks
      </h1>

      {!isLoggedIn ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-code text-sm text-muted-foreground">
            <Link to="/login" className="text-neon hover:underline">Log in</Link> to see your bookmarks.
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : bookmarks.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-code text-sm text-muted-foreground">No bookmarks yet.</p>
          <Link to="/" className="mt-4 inline-block font-code text-xs text-neon hover:underline">← Browse questions</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {bookmarks.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <Link to="/questions/$id" params={{ id: b.threadId }}
                    className="font-semibold text-foreground hover:text-neon">
                    {b.threadTitle}
                  </Link>
                  <p className="mt-0.5 font-code text-[11px] text-muted-foreground">
                    Saved {new Date(b.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => removeBookmark(b.threadId)}
                  className="rounded-md border border-destructive/40 px-3 py-1 font-code text-xs text-destructive hover:bg-destructive/10">
                  Remove
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 font-code text-xs">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon">← prev</button>
              <span className="text-muted-foreground">page {page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon">next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
