import {createFileRoute, Link} from "@tanstack/react-router";
import {
    MessageSquare,
    Search,
    Award,
    Loader2,
    TrendingUp,
    Clock,
    Filter,
    X,
    ChevronDown,
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

type StatusFilter = "all" | ThreadStatus;
const STATUS_OPTIONS: {value: StatusFilter; label: string; dot: string}[] = [
    {value: "all", label: "All", dot: "bg-muted-foreground"},
    {value: "OPEN", label: "Open", dot: "bg-emerald-500"},
    {value: "RESOLVED", label: "Resolved", dot: "bg-blue-500"},
    {value: "CLOSED", label: "Closed", dot: "bg-zinc-400"},
];

const PAGE_SIZE = 10;

function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function HomePage() {
    const {q} = Route.useSearch();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState(q ?? "");
    const [debouncedSearch, setDebounced] = useState(q ?? "");
    const [sortBy, setSortBy] = useState("latest");
    const [authorFilter, setAuthorFilter] = useState("");
    const [minComments, setMinComments] = useState("");
    const [maxComments, setMaxComments] = useState("");
    const [fromFilter, setFromFilter] = useState("");
    const [toFilter, setToFilter] = useState("");
    const [semanticAiSearch, setSemantic] = useState(false);
    const [threadsPage, setThreadsPage] = useState<Page<Thread> | null>(null);
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 380);
        return () => clearTimeout(t);
    }, [search]);

    // Sync route `q` param into local search state so external navigation updates results
    useEffect(() => {
        setSearch(q ?? "");
        setDebounced(q ?? "");
        setPage(0);
    }, [q]);

    const activeFilterCount = useMemo(
        () =>
            (statusFilter !== "all" ? 1 : 0) +
            activeTags.length +
            (authorFilter.trim() ? 1 : 0) +
            (minComments.trim() ? 1 : 0) +
            (maxComments.trim() ? 1 : 0) +
            (fromFilter.trim() ? 1 : 0) +
            (toFilter.trim() ? 1 : 0) +
            (semanticAiSearch ? 1 : 0),
        [
            statusFilter,
            activeTags,
            authorFilter,
            minComments,
            maxComments,
            fromFilter,
            toFilter,
            semanticAiSearch,
        ],
    );

    const fetchThreads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                size: String(PAGE_SIZE),
                sortBy,
            });
            if (statusFilter !== "all") params.set("status", statusFilter);
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
            if (debouncedSearch.trim())
                params.set("keyword", debouncedSearch.trim());
            setThreadsPage(
                await apiFetch<Page<Thread>>(
                    `${API_ENDPOINTS.threadSearch}?${params}`,
                ),
            );
        } catch {
            toast.error("Failed to load threads");
        } finally {
            setLoading(false);
        }
    }, [
        page,
        statusFilter,
        activeTags,
        debouncedSearch,
        sortBy,
        authorFilter,
        minComments,
        maxComments,
        fromFilter,
        toFilter,
        semanticAiSearch,
    ]);

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    const resetFilters = () => {
        setStatusFilter("all");
        setActiveTags([]);
        setSortBy("latest");
        setAuthorFilter("");
        setMinComments("");
        setMaxComments("");
        setFromFilter("");
        setToFilter("");
        setSemantic(false);
        setSearch("");
        setDebounced("");
        setPage(0);
    };

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
        <div className="space-y-5">
            {/* ── Hero ── */}
            <section className="hero-sheen glass-panel rounded-2xl border border-border/60 p-6 shadow-sm sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <div>
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/8 px-3 py-1 font-code text-[11px] font-medium text-neon">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
                            Developer Q&A, designed for speed
                        </p>
                        <h1 className="max-w-lg text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
                            Find answers faster.
                            <br />
                            Ask better questions.
                        </h1>
                        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                            Search by topic, author, tags or date. Built for
                            developers who want fast, clean answers.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2.5">
                            <Link
                                to="/ask"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-code text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Ask a question
                            </Link>
                            <Link
                                to="/tags"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/70 px-4 py-2 font-code text-sm font-medium text-muted-foreground hover:border-neon hover:text-neon transition-colors"
                            >
                                <Award className="h-4 w-4" />
                                Explore tags
                            </Link>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                        {[
                            {
                                label: "Threads",
                                value: totalElements.toLocaleString(),
                            },
                            {
                                label: "Active filters",
                                value: String(activeFilterCount),
                            },
                            {
                                label: "Visible tags",
                                value: String(visibleTags.length),
                            },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-xl border border-border/60 bg-background/60 p-3"
                            >
                                <p className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                                    {stat.label}
                                </p>
                                <p className="mt-1 text-xl font-bold text-foreground">
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[184px_1fr_224px]">
                {/* ── Left sidebar ── */}
                <aside className="space-y-4">
                    {/* Status */}
                    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                        <p className="mb-2 px-1 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Status
                        </p>
                        <div className="flex flex-col gap-0.5">
                            {STATUS_OPTIONS.map(({value, label, dot}) => (
                                <button
                                    key={value}
                                    onClick={() => {
                                        setStatusFilter(value);
                                        setPage(0);
                                    }}
                                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 font-code text-xs transition-all ${
                                        statusFilter === value
                                            ? "bg-primary/8 text-primary font-medium"
                                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`}
                                    />
                                    {label}
                                    {statusFilter === value && (
                                        <span className="ml-auto h-1 w-1 rounded-full bg-neon" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active tag filters */}
                    {activeTags.length > 0 && (
                        <div className="rounded-xl border border-neon/20 bg-neon/5 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="font-code text-[10px] font-semibold uppercase tracking-widest text-neon">
                                    Active Tags
                                </p>
                                <button
                                    onClick={() => setActiveTags([])}
                                    className="font-code text-[10px] text-muted-foreground hover:text-destructive"
                                >
                                    clear
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {activeTags.map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className="flex items-center gap-1 rounded-md border border-neon/30 bg-neon/10 px-2 py-0.5 font-code text-[10px] text-neon hover:bg-neon/20"
                                    >
                                        {tag} <X className="h-2.5 w-2.5" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tag cloud */}
                    {visibleTags.length > 0 && (
                        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                            <p className="mb-2 px-1 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                                                : "border-border text-muted-foreground hover:border-neon/30 hover:text-foreground"
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
                <section className="min-w-0 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-code text-base font-bold text-foreground">
                                <span className="text-muted-foreground">
                                    ~/
                                </span>
                                feed
                            </h2>
                            {!loading && (
                                <p className="font-code text-[11px] text-muted-foreground">
                                    {totalElements.toLocaleString()} threads
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFiltersOpen((o) => !o)}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-code text-xs transition-colors ${
                                    filtersOpen || activeFilterCount > 0
                                        ? "border-neon/40 bg-neon/8 text-neon"
                                        : "border-border text-muted-foreground hover:border-neon/40 hover:text-foreground"
                                }`}
                            >
                                <Filter className="h-3 w-3" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neon text-[9px] font-bold text-black">
                                        {activeFilterCount}
                                    </span>
                                )}
                                <ChevronDown
                                    className={`h-3 w-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            <Link
                                to="/ask"
                                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-code text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90"
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                                Ask
                            </Link>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                        <input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            placeholder="Search questions…"
                            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 font-code text-sm shadow-sm focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/10 transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setDebounced("");
                                    setPage(0);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Collapsible filters panel */}
                    {filtersOpen && (
                        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="space-y-1">
                                    <label className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Sort
                                    </label>
                                    <Select
                                        value={sortBy}
                                        onValueChange={(v) => {
                                            setSortBy(v);
                                            setPage(0);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 text-xs font-code">
                                            <SelectValue placeholder="Sort" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="latest">
                                                Latest
                                            </SelectItem>
                                            <SelectItem value="top">
                                                Most commented
                                            </SelectItem>
                                            <SelectItem value="older">
                                                Oldest
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Author
                                    </label>
                                    <input
                                        value={authorFilter}
                                        onChange={(e) => {
                                            setAuthorFilter(e.target.value);
                                            setPage(0);
                                        }}
                                        placeholder="username"
                                        className="h-8 w-full rounded-md border border-border bg-background px-3 font-code text-xs focus:border-neon focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
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
                                        className="h-8 w-full rounded-md border border-border bg-background px-3 font-code text-xs focus:border-neon focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
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
                                        className="h-8 w-full rounded-md border border-border bg-background px-3 font-code text-xs focus:border-neon focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
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
                                        className="h-8 w-full rounded-md border border-border bg-background px-3 font-code text-xs focus:border-neon focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
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
                                        className="h-8 w-full rounded-md border border-border bg-background px-3 font-code text-xs focus:border-neon focus:outline-none"
                                    />
                                </div>
                                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-code text-xs text-muted-foreground">
                                    <Checkbox
                                        checked={semanticAiSearch}
                                        onCheckedChange={(c) => {
                                            setSemantic(Boolean(c));
                                            setPage(0);
                                        }}
                                    />
                                    Semantic AI search
                                </label>
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={resetFilters}
                                        className="flex items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 py-2 font-code text-xs text-destructive hover:bg-destructive/5"
                                    >
                                        <X className="h-3 w-3" /> Reset all
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Thread list */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-20">
                            <Loader2 className="h-5 w-5 animate-spin text-neon" />
                            <span className="font-code text-xs text-muted-foreground">
                                Loading threads…
                            </span>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                            <p className="mt-3 font-code text-sm font-medium text-muted-foreground">
                                No threads found
                            </p>
                            <p className="mt-1 font-code text-xs text-muted-foreground/60">
                                Try adjusting your filters
                            </p>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={resetFilters}
                                    className="mt-3 rounded-lg border border-border px-4 py-1.5 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon"
                                >
                                    Reset filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {threads.map((thread) => (
                                <Link
                                    key={thread.id}
                                    to="/questions/$id"
                                    params={{id: thread.id}}
                                    search={{author: thread.authorName}}
                                    className="thread-card group flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm hover:border-neon/35"
                                >
                                    {/* Comment count column */}
                                    <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-0.5">
                                        <span
                                            className={`font-code text-sm font-semibold leading-none ${thread.numberComments > 0 ? "text-foreground" : "text-muted-foreground/50"}`}
                                        >
                                            {thread.numberComments}
                                        </span>
                                        <MessageSquare className="h-3 w-3 text-muted-foreground/40" />
                                    </div>

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <StatusBadge
                                                status={thread.status}
                                            />
                                            {thread.tags
                                                ?.slice(0, 3)
                                                .map((tag) => (
                                                    <Tag
                                                        key={tag.name}
                                                        name={tag.name}
                                                        compact
                                                    />
                                                ))}
                                            {(thread.tags?.length ?? 0) > 3 && (
                                                <span className="font-code text-[10px] text-muted-foreground">
                                                    +{thread.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold leading-snug text-foreground group-hover:text-neon transition-colors">
                                            {thread.title}
                                        </h3>
                                        <div className="prose-feed mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                            <Markdown
                                                content={thread.body}
                                                compact
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center gap-1.5 font-code text-[11px] text-muted-foreground">
                                            <span className="text-neon font-medium">
                                                @{thread.authorName}
                                            </span>
                                            <span className="text-muted-foreground/30">
                                                ·
                                            </span>
                                            <Clock className="h-3 w-3 shrink-0" />
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
                        <div className="flex items-center justify-center gap-2 font-code text-xs pt-1">
                            <button
                                disabled={page === 0}
                                onClick={() =>
                                    setPage((p) => Math.max(0, p - 1))
                                }
                                className="rounded-lg border border-border px-4 py-1.5 disabled:opacity-40 hover:border-neon hover:text-neon transition-colors"
                            >
                                ← Prev
                            </button>
                            <span className="text-muted-foreground px-2">
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-lg border border-border px-4 py-1.5 disabled:opacity-40 hover:border-neon hover:text-neon transition-colors"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </section>

                {/* ── Right sidebar ── */}
                <aside className="space-y-3">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-1.5 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            <Award className="h-3 w-3" /> Popular Tags
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleTags.slice(0, 15).map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`rounded-md border px-2 py-0.5 font-code text-[10px] transition-all ${
                                        activeTags.includes(tag)
                                            ? "border-neon/40 bg-neon/10 text-neon"
                                            : "border-border text-muted-foreground hover:border-neon/30 hover:text-foreground"
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                            {visibleTags.length === 0 && (
                                <p className="font-code text-[11px] text-muted-foreground/50">
                                    Tags appear here
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-1.5 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            <TrendingUp className="h-3 w-3" /> Quick Stats
                        </h3>
                        <div className="space-y-1.5">
                            {STATUS_OPTIONS.filter(
                                (s) => s.value !== "all",
                            ).map(({value, label, dot}) => (
                                <button
                                    key={value}
                                    onClick={() => {
                                        setStatusFilter(value);
                                        setPage(0);
                                    }}
                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-code text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${dot}`}
                                        />
                                        {label}
                                    </span>
                                    <span className="text-neon text-[10px]">
                                        Filter →
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
