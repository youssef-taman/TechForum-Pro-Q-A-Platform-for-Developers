import {createFileRoute, Link} from "@tanstack/react-router";
import {
    MessageSquare,
    Search,
    Award,
    Loader2,
    TrendingUp,
    Clock,
} from "lucide-react";
import {useEffect, useState, useMemo, useCallback} from "react";
import {StatusBadge} from "@/components/StatusBadge";
import {Markdown} from "@/components/Markdown";
import {Tag} from "@/components/Tag";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import type {Thread, ThreadStatus, Page} from "@/types";
import {toast} from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";

export const Route = createFileRoute("/")({
    validateSearch: (search: Record<string, unknown>): {q?: string} => ({
        q: typeof search.q === "string" ? search.q : undefined,
    }),
    head: () => ({meta: [{title: "TechForum Pro — Developer Q&A"}]}),
    component: HomePage,
});

// FIX: Status options aligned with backend ThreadStatus enum
type StatusFilter = "all" | ThreadStatus;
const STATUS_OPTIONS: {value: StatusFilter; label: string}[] = [
    {value: "all", label: "All"},
    {value: "OPEN", label: "Open"},
    {value: "RESOLVED", label: "Resolved"},
    {value: "CLOSED", label: "Closed"},
];

const PAGE_SIZE = 10;

function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function HomePage() {
    const {q} = Route.useSearch();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState(q ?? "");
    const [debouncedSearch, setDebouncedSearch] = useState(q ?? "");
    const [sortBy, setSortBy] = useState("latest");
    const [authorFilter, setAuthorFilter] = useState("");
    const [minComments, setMinComments] = useState("");
    const [maxComments, setMaxComments] = useState("");
    const [fromFilter, setFromFilter] = useState("");
    const [toFilter, setToFilter] = useState("");
    const [semanticAiSearch, setSemanticAiSearch] = useState(false);
    const [threadsPage, setThreadsPage] = useState<Page<Thread> | null>(null);
    const [loading, setLoading] = useState(true);

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
                sortBy,
            });
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (activeTags.length)
                activeTags.forEach((t) => params.append("tags", t));
            if (authorFilter.trim()) params.set("author", authorFilter.trim());
            if (minComments.trim())
                params.set("minCommentsNumber", minComments.trim());
            if (maxComments.trim())
                params.set("maxCommentsNumber", maxComments.trim());
            if (fromFilter.trim())
                params.set("from", new Date(fromFilter).toISOString());
            if (toFilter.trim())
                params.set("to", new Date(toFilter).toISOString());
            if (semanticAiSearch) params.set("semanticAiSearch", "true");

            if (debouncedSearch.trim()) {
                params.set("keyword", debouncedSearch.trim());
            }

            const url = `${API_ENDPOINTS.threadSearch}?${params}`;

            setThreadsPage(await apiFetch<Page<Thread>>(url));
        } catch {
            toast.error("Failed to load threads");
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, activeTags, debouncedSearch, sortBy, authorFilter, minComments, maxComments, fromFilter, toFilter, semanticAiSearch]);

    const resetFilters = () => {
        setStatusFilter("all");
        setActiveTags([]);
        setSortBy("latest");
        setAuthorFilter("");
        setMinComments("");
        setMaxComments("");
        setFromFilter("");
        setToFilter("");
        setSemanticAiSearch(false);
        setSearch("");
        setDebouncedSearch("");
        setPage(0);
    };

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    const toggleTag = (name: string) => {
        setPage(0);
        setActiveTags((cur) =>
            cur.includes(name) ? cur.filter((t) => t !== name) : [...cur, name],
        );
    };

    const threads = useMemo(() => threadsPage?.content ?? [], [threadsPage]);
    const totalPages = threadsPage?.totalPages ?? 1;
    const totalElements = threadsPage?.totalElements ?? 0;

    const visibleTags = useMemo(() => {
        const set = new Set<string>();
        threads.forEach((t) => t.tags?.forEach((tg) => set.add(tg.name)));
        return Array.from(set);
    }, [threads]);

    return (
        <div className="space-y-6">
            <section className="hero-sheen glass-panel rounded-3xl p-6 shadow-sm sm:p-8">
                <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                    <div className="relative">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/10 px-3 py-1 font-code text-[11px] font-medium text-neon">
                            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
                            Developer Q&A, designed for speed
                        </p>
                        <h1 className="max-w-2xl text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
                            Find answers faster. Ask better questions. Share knowledge with clarity.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                            Search by topic, author, tags, dates, or engagement signals. The feed is tuned for people who want a clean, fast, and professional developer workspace.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                to="/ask"
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-code text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Ask a question
                            </Link>
                            <Link
                                to="/tags"
                                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 font-code text-sm font-medium text-muted-foreground transition-colors hover:border-neon hover:text-neon"
                            >
                                <Award className="h-4 w-4" />
                                Explore tags
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        {[
                            {label: "Threads", value: totalElements.toLocaleString()},
                            {label: "Active filters", value: String((statusFilter !== "all" ? 1 : 0) + activeTags.length + (authorFilter.trim() ? 1 : 0) + (minComments.trim() ? 1 : 0) + (maxComments.trim() ? 1 : 0) + (fromFilter.trim() ? 1 : 0) + (toFilter.trim() ? 1 : 0) + (semanticAiSearch ? 1 : 0))},
                            {label: "Popular tags", value: String(visibleTags.slice(0, 15).length)},
                        ].map((stat) => (
                            <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/70 p-4 backdrop-blur-sm">
                                <p className="font-code text-[11px] uppercase tracking-widest text-muted-foreground">
                                    {stat.label}
                                </p>
                                <p className="mt-2 text-2xl font-bold text-foreground">
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[200px_1fr_240px]">
            {/* ── Left sidebar ── */}
            <aside className="space-y-5">
                {/* Status filter */}
                <div>
                    <p className="mb-2 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Status
                    </p>
                    <div className="flex flex-col gap-0.5">
                        {STATUS_OPTIONS.map(({value, label}) => (
                            <button
                                key={value}
                                onClick={() => {
                                    setStatusFilter(value);
                                    setPage(0);
                                }}
                                className={`flex items-center justify-between rounded-md px-3 py-2 font-code text-xs transition-all ${
                                    statusFilter === value
                                        ? "bg-primary/10 font-medium text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                            >
                                <span>{label}</span>
                                {statusFilter === value && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-neon" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active tag filters */}
                {activeTags.length > 0 && (
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <p className="font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Active Filters
                            </p>
                            <button
                                onClick={() => setActiveTags([])}
                                className="font-code text-[10px] text-destructive hover:underline"
                            >
                                clear
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {activeTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className="flex items-center gap-1 rounded-md border border-neon/30 bg-neon/10 px-2 py-0.5 font-code text-[10px] text-neon"
                                >
                                    #{tag} ✕
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tag cloud */}
                {visibleTags.length > 0 && (
                    <div>
                        <p className="mb-2 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Tags
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {visibleTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`rounded-md border px-2 py-0.5 font-code text-[10px] transition-all ${
                                        activeTags.includes(tag)
                                            ? "border-neon/40 bg-neon/10 text-neon"
                                            : "border-border bg-surface text-muted-foreground hover:border-border hover:text-foreground"
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </aside>

            {/* ── Main feed ── */}
            <section className="min-w-0">
                {/* Header bar */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="font-code text-lg font-bold text-foreground">
                            <span className="text-muted-foreground">~/</span>
                            feed
                        </h1>
                        {!loading && (
                            <p className="font-code text-[11px] text-muted-foreground">
                                {totalElements.toLocaleString()} threads
                            </p>
                        )}
                    </div>
                    <Link
                        to="/ask"
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-code text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90"
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Ask Question
                    </Link>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(0);
                        }}
                        placeholder="Search questions…"
                        className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 font-code text-sm shadow-sm transition-colors focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/10"
                    />
                </div>

                <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1.5">
                        <label className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                            Sort
                        </label>
                        <Select
                            value={sortBy}
                            onValueChange={(value) => {
                                setSortBy(value);
                                setPage(0);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sort threads" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="latest">Latest</SelectItem>
                                <SelectItem value="top">Most commented</SelectItem>
                                <SelectItem value="older">Oldest</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                            Author
                        </label>
                        <input
                            value={authorFilter}
                            onChange={(e) => {
                                setAuthorFilter(e.target.value);
                                setPage(0);
                            }}
                            placeholder="Filter by username"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 font-code text-sm shadow-sm focus:border-neon focus:outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                            Min comments
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={minComments}
                            onChange={(e) => {
                                setMinComments(e.target.value);
                                setPage(0);
                            }}
                            placeholder="0"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 font-code text-sm shadow-sm focus:border-neon focus:outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                            Max comments
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={maxComments}
                            onChange={(e) => {
                                setMaxComments(e.target.value);
                                setPage(0);
                            }}
                            placeholder="Any"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 font-code text-sm shadow-sm focus:border-neon focus:outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                            From
                        </label>
                        <input
                            type="datetime-local"
                            value={fromFilter}
                            onChange={(e) => {
                                setFromFilter(e.target.value);
                                setPage(0);
                            }}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 font-code text-xs shadow-sm focus:border-neon focus:outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                            To
                        </label>
                        <input
                            type="datetime-local"
                            value={toFilter}
                            onChange={(e) => {
                                setToFilter(e.target.value);
                                setPage(0);
                            }}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 font-code text-xs shadow-sm focus:border-neon focus:outline-none"
                        />
                    </div>

                    <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 font-code text-xs text-muted-foreground shadow-sm">
                        <Checkbox
                            checked={semanticAiSearch}
                            onCheckedChange={(checked) => {
                                setSemanticAiSearch(Boolean(checked));
                                setPage(0);
                            }}
                        />
                        Semantic AI search
                    </label>
                </div>

                {(statusFilter !== "all" || activeTags.length > 0 || sortBy !== "latest" || authorFilter.trim() || minComments.trim() || maxComments.trim() || fromFilter.trim() || toFilter.trim() || semanticAiSearch || search.trim()) && (
                    <div className="mb-4 flex flex-wrap items-center gap-2 font-code text-[11px] text-muted-foreground">
                        <span>Active filters</span>
                        <button
                            onClick={resetFilters}
                            className="rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:border-neon hover:text-neon"
                        >
                            Reset all
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-neon" />
                            <span className="font-code text-xs text-muted-foreground">
                                Loading threads…
                            </span>
                        </div>
                    </div>
                ) : threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                        <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                        <p className="mt-3 font-code text-sm font-medium text-muted-foreground">
                            No threads found
                        </p>
                        <p className="mt-1 font-code text-xs text-muted-foreground/60">
                            Try adjusting your filters
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {threads.map((thread) => (
                            <Link
                                key={thread.id}
                                to="/questions/$id"
                                params={{id: thread.id}}
                                search={{author: thread.authorName}}
                                className="group flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all hover:border-neon/40 hover:shadow-md"
                            >
                                {/* Meta column */}
                                <div className="flex min-w-13 flex-col items-center gap-1 pt-0.5">
                                    <span className="font-code text-xs font-semibold text-muted-foreground">
                                        {thread.numberComments}
                                    </span>
                                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50" />
                                </div>

                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <StatusBadge status={thread.status} />
                                        {thread.tags?.slice(0, 3).map((tag) => (
                                            <Tag key={tag.id} name={tag.name} to="/tags/$tag" params={{tag: tag.name}} compact />
                                        ))}
                                        {(thread.tags?.length ?? 0) > 3 && (
                                            <span className="font-code text-[10px] text-muted-foreground">
                                                +{thread.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="mt-1.5 line-clamp-1 font-semibold text-foreground leading-snug group-hover:text-neon transition-colors">
                                        {thread.title}
                                    </h3>
                                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                        <Markdown content={thread.body} compact />
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 font-code text-[11px] text-muted-foreground">
                                        <span className="text-neon">
                                            @{thread.authorName}
                                        </span>
                                        <span className="text-muted-foreground/40">
                                            ·
                                        </span>
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {relativeTime(thread.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2 font-code text-xs">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            className="rounded-lg border border-border px-4 py-1.5 transition-colors disabled:opacity-40 hover:border-neon hover:text-neon"
                        >
                            ← Prev
                        </button>
                        <span className="text-muted-foreground">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-lg border border-border px-4 py-1.5 transition-colors disabled:opacity-40 hover:border-neon hover:text-neon"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </section>

            {/* ── Right sidebar ── */}
            <aside className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-1.5 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        <Award className="h-3 w-3" /> Popular Tags
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        {visibleTags.slice(0, 15).map((tag) => (
                            <Link
                                key={tag}
                                to="/tags/$tag"
                                params={{tag}}
                                className={`rounded-md border px-2 py-0.5 font-code text-[10px] transition-all ${
                                    activeTags.includes(tag)
                                        ? "border-neon/40 bg-neon/10 text-neon"
                                        : "border-border bg-surface text-muted-foreground hover:border-neon/30 hover:text-foreground"
                                }`}
                            >
                                {tag}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-1.5 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        <TrendingUp className="h-3 w-3" /> Quick Stats
                    </h3>
                    <div className="space-y-2 font-code text-xs">
                        {STATUS_OPTIONS.filter((s) => s.value !== "all").map(
                            ({value, label}) => (
                                <div
                                    key={value}
                                    className="flex items-center justify-between text-muted-foreground"
                                >
                                    <span>{label}</span>
                                    <button
                                        onClick={() => {
                                            setStatusFilter(value);
                                            setPage(0);
                                        }}
                                        className="text-neon hover:underline"
                                    >
                                        Filter →
                                    </button>
                                </div>
                            ),
                        )}
                    </div>
                </div>
            </aside>
            </div>
        </div>
    );
}
