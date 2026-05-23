import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronUp, ChevronDown, MessageSquare, Search, TrendingUp, Award, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import type { ThreadStatus } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "TechForum Pro — Developer Q&A" }] }),
  component: HomePage,
});

// ── Backend DTOs ───────────────────────────────────────────────────────────────
interface TagDTO { id: string; name: string }
interface ThreadDTO {
  id: string;
  authorName: string;
  title: string;
  body: string;
  status: ThreadStatus;
  numberComments: number;
  createdAt: string;
  tags: TagDTO[];
}
interface Page<T> { content: T[]; totalPages: number; totalElements: number; number: number }

type StatusFilter = "all" | ThreadStatus;
const PAGE_SIZE = 10;

function HomePage() {
  const { q } = Route.useSearch();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState(q ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(q ?? "");

  const [threadsPage, setThreadsPage] = useState<Page<ThreadDTO> | null>(null);
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
        sortBy: "latest",
      });
      if (statusFilter !== "all") params.set("status", statusFilter.toUpperCase());
      if (activeTags.length) activeTags.forEach((t) => params.append("tags", t));

      let url: string;
      if (debouncedSearch.trim()) {
        params.set("keyword", debouncedSearch.trim());
        url = `${API_ENDPOINTS.threadSearch}?${params}`;
      } else {
        url = `${API_ENDPOINTS.threads}?${params}`;
      }

      const data = await apiFetch<Page<ThreadDTO>>(url);
      setThreadsPage(data);
    } catch (err) {
      toast.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, activeTags, debouncedSearch]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const toggleTag = (name: string) => {
    setPage(0);
    setActiveTags((cur) => cur.includes(name) ? cur.filter((t) => t !== name) : [...cur, name]);
  };

  const threads = threadsPage?.content ?? [];
  const totalPages = threadsPage?.totalPages ?? 1;

  // Collect all visible tags for the sidebar filter
  const visibleTags = useMemo(() => {
    const set = new Set<string>();
    threads.forEach((t) => t.tags?.forEach((tg) => set.add(tg.name)));
    return Array.from(set);
  }, [threads]);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr_260px]">
      {/* Left sidebar — filters */}
      <aside className="space-y-6">
        <div>
          <h3 className="mb-2 font-code text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</h3>
          <div className="flex flex-col gap-1">
            {(["all", "open", "solved", "closed"] as StatusFilter[]).map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
                className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 font-code text-xs capitalize transition-colors ${
                  statusFilter === s ? "border-neon text-neon" : "border-border bg-surface text-muted-foreground hover:border-neon/40 hover:text-foreground"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {visibleTags.length > 0 && (
          <div>
            <h3 className="mb-2 font-code text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => {
                const active = activeTags.includes(tag);
                return (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className={`rounded-md border px-2 py-0.5 font-code text-[10px] transition-colors ${
                      active ? "border-neon bg-neon/10 text-neon" : "border-border bg-surface text-muted-foreground hover:border-neon/40 hover:text-foreground"
                    }`}>
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Main feed */}
      <section className="min-w-0">
        <div className="mb-6 rounded-xl border border-border bg-card/60 p-5">
          <h1 className="font-code text-lg font-bold text-foreground">
            <span className="text-muted-foreground">~/</span>question-feed
          </h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="search questions…"
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 font-code text-xs focus:border-neon focus:outline-none" />
          </div>
          {(activeTags.length > 0 || debouncedSearch) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 font-code text-[11px] text-muted-foreground">
              <span>filtered by:</span>
              {debouncedSearch && <span className="rounded bg-surface px-2 py-0.5">"{debouncedSearch}"</span>}
              {activeTags.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)} className="rounded bg-neon/10 px-2 py-0.5 text-neon hover:bg-neon/20">
                  #{tag} ✕
                </button>
              ))}
              <button onClick={() => { setActiveTags([]); setSearch(""); setDebouncedSearch(""); }}
                className="ml-auto text-destructive hover:underline">
                clear all
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 font-code text-sm text-muted-foreground">No threads found.</p>
          </div>
        ) : (
          // <div className="space-y-3">
          //   {threads.map((thread) => (
          //     <Link key={thread.id} to="/questions/$id" params={{ id: thread.id }}
          //       className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-neon/40">
          //       <div className="flex flex-col items-center gap-1 pt-1">
          //         <ChevronUp className="h-4 w-4 text-muted-foreground" />
          //         <span className="font-code text-sm font-bold text-foreground">0</span>
          //         <ChevronDown className="h-4 w-4 text-muted-foreground" />
          //       </div>
          //       <div className="min-w-0 flex-1">
          //         <div className="flex flex-wrap items-center gap-2">
          //           <StatusBadge status={thread.status} />
          //           {thread.tags?.slice(0, 4).map((tag) => (
          //             <span key={tag.id} className="rounded-md border border-border bg-surface px-2 py-0.5 font-code text-[10px] text-muted-foreground">
          //               {tag.name}
          //             </span>
          //           ))}
          //         </div>
          //         <h3 className="mt-2 line-clamp-1 text-base font-semibold text-foreground">{thread.title}</h3>
          //         <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{thread.body}</p>
          //         <div className="mt-3 flex items-center gap-3 font-code text-[11px]">
          //           <span className="text-neon">@{thread.authorName}</span>
          //           <span className="text-muted-foreground">•</span>
          //           <span className="text-muted-foreground">{new Date(thread.createdAt).toLocaleDateString()}</span>
          //           <span className="text-muted-foreground">•</span>
          //           <span className="text-muted-foreground">{thread.numberComments} comments</span>
          //         </div>
          //       </div>
          //     </Link>
          //   ))}
          // </div>
          <div className="space-y-2.5"> {/* Tighter spacing between cards */}
            {threads.map((thread) => (
              <Link key={thread.id} to="/questions/$id" params={{ id: thread.id }}
                // UX FIX: Changed p-5 to p-3 sm:p-4, reduced gap from 4 to 3
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 transition-colors hover:border-neon/40">

                {/* UX FIX: Tightened voting column spacing */}
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-code text-sm font-bold text-foreground">0</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={thread.status} />
                    {thread.tags?.slice(0, 4).map((tag) => (
                      // UX FIX: Made tag padding slightly tighter
                      <span key={tag.id} className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-code text-[10px] text-muted-foreground">
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  {/* UX FIX: Reduced top margin from mt-2 to mt-1.5 */}
                  <h3 className="mt-1.5 line-clamp-1 text-base font-semibold text-foreground leading-tight">
                    {thread.title}
                  </h3>

                  {/* UX FIX: Tightened body text spacing */}
                  <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {thread.body}
                  </p>

                  {/* UX FIX: Reduced top margin from mt-3 to mt-2 */}
                  <div className="mt-2 flex items-center gap-2.5 font-code text-[11px]">
                    <span className="text-neon">@{thread.authorName}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{new Date(thread.createdAt).toLocaleDateString()}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{thread.numberComments} comments</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2 font-code text-xs">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon">
              ← prev
            </button>
            <span className="text-muted-foreground">page {page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon">
              next →
            </button>
          </div>
        )}
      </section>

      {/* Right sidebar */}
      <aside className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-1.5 font-code text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Award className="h-3 w-3" /> Popular Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.slice(0, 12).map((tag) => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`rounded-md border px-2 py-0.5 font-code text-[10px] transition-colors ${
                  activeTags.includes(tag) ? "border-neon bg-neon/10 text-neon" : "border-border bg-surface text-muted-foreground hover:border-neon/40"
                }`}>
                {tag}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
