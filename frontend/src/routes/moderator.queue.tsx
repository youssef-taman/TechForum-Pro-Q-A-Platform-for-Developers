import {createFileRoute, Link} from "@tanstack/react-router";
import {useEffect, useState} from "react";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {toast} from "sonner";
import {
    CheckCircle2,
    Loader2,
    ShieldCheck,
    Trash2,
    XCircle,
} from "lucide-react";
import {useAuth} from "@/lib/auth-context";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {StatusBadge} from "@/components/StatusBadge";
import {Markdown} from "@/components/Markdown";
import {Tag} from "@/components/Tag";
import type {Thread, Page} from "@/types";

export const Route = createFileRoute("/moderator/queue")({
    head: () => ({meta: [{title: "Moderator Queue — TechForum Pro"}]}),
    component: ModQueue,
});

function ModQueue() {
    const {user, isLoggedIn} = useAuth();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    type ThreadSort = "latest" | "oldest" | "most_commented";
    const [threadSort, setThreadSort] = useState<ThreadSort>("latest");

    const isMod =
        isLoggedIn &&
        (user?.role?.toUpperCase() === "ADMIN" ||
            user?.role?.toUpperCase() === "MODERATOR");

    useEffect(() => {
        if (!isMod) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const fetchAndMaybeSort = async () => {
            try {
                const sortParam = threadSort === "oldest" ? "older" : "latest";
                const data = await apiFetch<Page<Thread>>(
                    `${API_ENDPOINTS.threads}?status=OPEN&size=50&sortBy=${sortParam}`,
                );
                let items = data.content;
                if (threadSort === "most_commented") {
                    items = items.sort((a, b) => (b.numberComments ?? 0) - (a.numberComments ?? 0));
                }
                setThreads(items);
            } catch {
                toast.error("Failed to load queue");
            } finally {
                setLoading(false);
            }
        };
        void fetchAndMaybeSort();
    }, [isMod, threadSort]);

    const act = async (id: string, fn: () => Promise<void>) => {
        setActionId(id);
        try {
            await fn();
        } finally {
            setActionId(null);
        }
    };

    const closeThread = (id: string) =>
        act(id, async () => {
            await apiFetch(API_ENDPOINTS.threadById(id), {
                method: "PATCH",
                body: JSON.stringify({status: "CLOSED"}),
            });
            setThreads((prev) => prev.filter((t) => t.id !== id));
            toast.success("Thread closed");
        });

    const deleteThread = (id: string) => {
        if (!confirm("Delete this thread permanently?")) return;
        act(id, async () => {
            await apiFetch(API_ENDPOINTS.threadById(id), {method: "DELETE"});
            setThreads((prev) => prev.filter((t) => t.id !== id));
            toast.success("Thread deleted");
        });
    };

    if (!isMod) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <XCircle className="h-10 w-10 text-destructive/60" />
                <p className="mt-3 font-code text-sm text-muted-foreground">
                    Moderator access required.
                </p>
                <Link
                    to="/"
                    className="mt-2 font-code text-xs text-neon hover:underline"
                >
                    ← Go home
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                    <h1 className="font-code text-xl font-bold">
                        <span className="text-muted-foreground">~/</span>
                        mod-queue
                    </h1>
                    <p className="font-code text-xs text-muted-foreground">
                        {threads.length === 0 && loading ? "Loading…" : `${threads.length} items`}
                        {loading && threads.length > 0 && (
                            <Loader2 className="ml-2 inline-block h-4 w-4 animate-spin text-neon" />
                        )}
                    </p>
                </div>
                <div className="ml-auto w-48">
                    <Select defaultValue={threadSort} onValueChange={(v) => setThreadSort(v as ThreadSort)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="latest">Latest</SelectItem>
                            <SelectItem value="oldest">Oldest</SelectItem>
                            <SelectItem value="most_commented">Most commented</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading && threads.length === 0 ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-neon" />
                </div>
            ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500/50" />
                    <p className="mt-3 font-code text-sm font-medium text-muted-foreground">
                        Queue is clear
                    </p>
                    <p className="mt-1 font-code text-xs text-muted-foreground/60">
                        No closed threads to review
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {threads.map((item) => {
                        const busy = actionId === item.id;
                        return (
                            <div
                                key={item.id}
                                className="rounded-xl border border-border bg-card p-5 shadow-sm transform-gpu transition-transform duration-150 ease-out hover:-translate-y-1 hover:shadow-md"
                                style={{willChange: "transform"}}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge status={item.status} />
                                            {item.tags?.map((tag) => (
                                                <Tag key={tag.id} name={tag.name} compact />
                                            ))}
                                        </div>
                                        <Link
                                            to="/questions/$id"
                                            params={{id: item.id}}
                                            search={{author: item.authorName}}
                                            className="mt-2 block"
                                        >
                                            <h3 className="line-clamp-1 text-sm font-semibold text-foreground hover:text-neon">
                                                {item.title}
                                            </h3>
                                        </Link>
                                        <div className="mt-1 line-clamp-2 font-code text-xs text-muted-foreground">
                                            <Markdown content={item.body} compact />
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 font-code text-[11px] text-muted-foreground">
                                            <span className="text-neon">
                                                @{item.authorName}
                                            </span>
                                            <span className="text-muted-foreground/40">
                                                ·
                                            </span>
                                            <span>
                                                {new Date(
                                                    item.createdAt,
                                                ).toLocaleDateString()}
                                            </span>
                                            <span className="text-muted-foreground/40">
                                                ·
                                            </span>
                                            <span>
                                                {item.numberComments} comments
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-1.5">
                                        {busy ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        closeThread(item.id)
                                                    }
                                                    className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 font-code text-xs text-destructive hover:bg-destructive/10"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />{" "}
                                                    Close
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        deleteThread(item.id)
                                                    }
                                                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-code text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />{" "}
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
