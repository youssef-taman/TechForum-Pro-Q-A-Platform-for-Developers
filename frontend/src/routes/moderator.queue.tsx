import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import type { ThreadStatus } from "@/types";

export const Route = createFileRoute("/moderator/queue")({
  head: () => ({ meta: [{ title: "Moderator Queue — TechForum Pro" }] }),
  component: ModQueue,
});

interface ThreadDTO {
  id: string; authorName: string; title: string; body: string;
  status: ThreadStatus; numberComments: number; createdAt: string;
  tags: { id: string; name: string }[];
}
interface Page<T> { content: T[]; totalPages: number }

function ModQueue() {
  const { user, isLoggedIn } = useAuth();
  const [threads, setThreads] = useState<ThreadDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const isMod = isLoggedIn && (user?.role?.toUpperCase() === "ADMIN" || user?.role?.toUpperCase() === "MODERATOR");

  useEffect(() => {
    if (!isMod) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        // Fetch closed/flagged threads — using status=CLOSED as the mod queue proxy
        const data = await apiFetch<Page<ThreadDTO>>(
          `${API_ENDPOINTS.threads}?status=CLOSED&size=20&sortBy=latest`
        );
        setThreads(data.content);
      } catch {
        toast.error("Failed to load moderation queue");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isMod]);

  const closeThread = async (id: string) => {
    try {
      await apiFetch(API_ENDPOINTS.threadById(id), {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED" }),
      });
      setThreads((prev) => prev.filter((t) => t.id !== id));
      toast.success("Thread closed");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
  };

  const deleteThread = async (id: string) => {
    try {
      await apiFetch(API_ENDPOINTS.threadById(id), { method: "DELETE" });
      setThreads((prev) => prev.filter((t) => t.id !== id));
      toast.success("Thread deleted");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
  };

  if (!isMod) {
    return (
      <div className="py-20 text-center font-code text-sm text-muted-foreground">
        Moderator access required. <Link to="/" className="text-neon hover:underline">Go home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-code text-2xl font-bold">
          <span className="text-muted-foreground">~/</span>moderator-queue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{threads.length} items in queue</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : threads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500/60" />
          <p className="mt-3 font-code text-sm text-muted-foreground">Queue is empty.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                  </div>
                  <Link to="/questions/$id" params={{ id: item.id }} className="mt-2 block">
                    <h3 className="text-base font-semibold hover:text-neon">{item.title}</h3>
                  </Link>
                  <p className="mt-1 line-clamp-2 font-code text-xs text-muted-foreground">{item.body}</p>
                  <div className="mt-2 font-code text-[11px] text-muted-foreground">
                    @{item.authorName} · {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button onClick={() => closeThread(item.id)}
                    className="rounded-md border border-destructive/40 px-3 py-1 font-code text-xs text-destructive hover:bg-destructive/10">
                    Close
                  </button>
                  <button onClick={() => deleteThread(item.id)}
                    className="rounded-md border border-border px-3 py-1 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
