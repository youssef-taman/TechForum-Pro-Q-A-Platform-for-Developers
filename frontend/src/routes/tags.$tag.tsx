import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { Markdown } from "@/components/Markdown";
import { Tag as Tag2 } from "@/components/Tag";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import type { Page, Thread } from "@/types";

export const Route = createFileRoute("/tags/$tag")({
  head: ({ params }) => ({ meta: [{ title: `#${params.tag} — TechForum Pro` }] }),
  component: TagDetail,
});

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TagDetail() {
  const { tag } = Route.useParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: "0",
          size: "50",
          sortBy: "latest",
        });
        params.append("tags", tag);
        const data = await apiFetch<Page<Thread>>(
          `${API_ENDPOINTS.threadSearch}?${params}`,
        );
        setThreads(data.content);
      } catch {
        toast.error("Failed to load tagged threads");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tag]);

  const displayTag = useMemo(() => tag.trim(), [tag]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-code text-xl font-bold">
              <span className="text-muted-foreground">#</span>
              {displayTag}
            </h1>
            <p className="font-code text-xs text-muted-foreground">
              {loading
                ? "Loading threads…"
                : `${threads.length} thread${threads.length !== 1 ? "s" : ""} with this tag`}
            </p>
          </div>
        </div>
        <Link
          to="/tags"
          className="font-code text-xs text-neon hover:underline"
        >
          ← All tags
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-neon" />
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center font-code text-sm text-muted-foreground">
          No threads tagged with #{displayTag} yet.
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              to="/questions/$id"
              params={{ id: thread.id }}
              search={{ author: thread.authorName }}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all hover:border-neon/40 hover:shadow-md"
            >
              <div className="flex min-w-13 flex-col items-center gap-1 pt-0.5">
                <span className="font-code text-xs font-semibold text-muted-foreground">
                  {thread.numberComments}
                </span>
                <Tag className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={thread.status} />
                  {thread.tags?.slice(0, 3).map((threadTag) => (
                    <Tag2 key={threadTag.name} name={threadTag.name} compact />
                  ))}
                </div>
                <h3 className="mt-1.5 line-clamp-1 font-semibold text-foreground leading-snug group-hover:text-neon transition-colors">
                  {thread.title}
                </h3>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  <Markdown content={thread.body} compact />
                </div>
                <div className="mt-2 flex items-center gap-2 font-code text-[11px] text-muted-foreground">
                  <span className="text-neon">@{thread.authorName}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{relativeTime(thread.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
