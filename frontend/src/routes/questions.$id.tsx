import {createFileRoute, Link} from "@tanstack/react-router";
import {
    ArrowLeft,
    ChevronUp,
    ChevronDown,
    Clock,
    User as UserIcon,
    Bookmark,
    Share2,
    Loader2,
    Send,
    MessageSquare,
    Tag,
} from "lucide-react";
import {useEffect, useState} from "react";
import {toast} from "sonner";
import {StatusBadge} from "@/components/StatusBadge";
import {Markdown} from "@/components/Markdown";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {useAuth} from "@/lib/auth-context";
import type {Thread, Comment, Bookmark as BookmarkType, Page} from "@/types";

export const Route = createFileRoute("/questions/$id")({
    head: ({params}) => ({meta: [{title: `Question — TechForum Pro`}]}),
    component: QuestionDetail,
});

function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function QuestionDetail() {
    const {id} = Route.useParams();
    const {isLoggedIn, user} = useAuth();

    const [thread, setThread] = useState<Thread | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsPage, setCommentsPage] = useState(0);
    const [totalCommentPages, setTotalCommentPages] = useState(1);
    const [loadingThread, setLoadingThread] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [votedComments, setVotedComments] = useState<
        Record<string, "UPVOTE" | "DOWNVOTE">
    >({});

    // FIX: use threadExpand if authorName is passed via router state,
    // otherwise search. This is the correct pattern until backend adds GET /threads/{id}.
    useEffect(() => {
        const load = async () => {
            setLoadingThread(true);
            try {
                // Try search endpoint first (UUID in keyword)
                const searchPage = await apiFetch<Page<Thread>>(
                    `${API_ENDPOINTS.threadSearch}?keyword=${id}&size=5`,
                );
                const found = searchPage.content.find((t) => t.id === id);
                if (found) {
                    setThread(found);
                    return;
                }

                // Fallback: scan first 2 pages of latest threads
                for (const p of [0, 1]) {
                    const pg = await apiFetch<Page<Thread>>(
                        `${API_ENDPOINTS.threads}?page=${p}&size=50&sortBy=latest`,
                    );
                    const match = pg.content.find((t) => t.id === id);
                    if (match) {
                        setThread(match);
                        return;
                    }
                    if (p === 0 && pg.totalPages <= 1) break;
                }
                toast.error("Thread not found");
            } catch {
                toast.error("Failed to load thread");
            } finally {
                setLoadingThread(false);
            }
        };
        load();
    }, [id]);

    // FIX: initialise bookmark state from server
    useEffect(() => {
        if (!isLoggedIn) return;
        apiFetch<Page<BookmarkType>>(
            `${API_ENDPOINTS.bookmarks}?page=0&size=100`,
        )
            .then((data) =>
                setBookmarked(data.content.some((b) => b.threadId === id)),
            )
            .catch(() => {});
    }, [id, isLoggedIn]);

    useEffect(() => {
        const load = async () => {
            setLoadingComments(true);
            try {
                const data = await apiFetch<Page<Comment>>(
                    `${API_ENDPOINTS.comments(id)}?page=${commentsPage}&size=10&sortBy=latest`,
                );
                setComments(data.content);
                setTotalCommentPages(data.totalPages);
            } catch {
                toast.error("Failed to load comments");
            } finally {
                setLoadingComments(false);
            }
        };
        load();
    }, [id, commentsPage]);

    const handleBookmark = async () => {
        if (!isLoggedIn) {
            toast.error("Please log in to bookmark");
            return;
        }
        try {
            if (bookmarked) {
                await apiFetch(API_ENDPOINTS.bookmarkThread(id), {
                    method: "DELETE",
                });
                setBookmarked(false);
                toast.success("Bookmark removed");
            } else {
                await apiFetch(API_ENDPOINTS.bookmarkThread(id), {
                    method: "POST",
                });
                setBookmarked(true);
                toast.success("Bookmarked!");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Action failed");
        }
    };

    // FIX: use API_ENDPOINTS.commentsBase (not hardcoded URL)
    const submitComment = async () => {
        if (!isLoggedIn) {
            toast.error("Please log in to comment");
            return;
        }
        if (newComment.trim().length < 5) {
            toast.error("Comment too short");
            return;
        }
        setSubmitting(true);
        try {
            const created = await apiFetch<Comment>(
                API_ENDPOINTS.commentsBase,
                {
                    method: "POST",
                    body: JSON.stringify({
                        threadId: id,
                        content: newComment.trim(),
                        parentId: null,
                    }),
                },
            );
            setComments((prev) => [created, ...prev]);
            setNewComment("");
            toast.success("Comment posted");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
        } finally {
            setSubmitting(false);
        }
    };

    // FIX: use API_ENDPOINTS.commentsBase (not hardcoded URL)
    const submitReply = async (parentId: string) => {
        if (!isLoggedIn) {
            toast.error("Please log in");
            return;
        }
        if (replyText.trim().length < 5) {
            toast.error("Reply too short");
            return;
        }
        try {
            await apiFetch<Comment>(API_ENDPOINTS.commentsBase, {
                method: "POST",
                body: JSON.stringify({
                    threadId: id,
                    content: replyText.trim(),
                    parentId,
                }),
            });
            setReplyingTo(null);
            setReplyText("");
            toast.success("Reply posted");
            const data = await apiFetch<Page<Comment>>(
                `${API_ENDPOINTS.comments(id)}?page=${commentsPage}&size=10&sortBy=latest`,
            );
            setComments(data.content);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
        }
    };

    // FIX: both UPVOTE and DOWNVOTE wired, with optimistic score update
    const handleVote = async (
        commentId: string,
        type: "UPVOTE" | "DOWNVOTE",
    ) => {
        if (!isLoggedIn) {
            toast.error("Please log in to vote");
            return;
        }
        const prev = votedComments[commentId];
        if (prev === type) return; // already voted this way
        try {
            await apiFetch(API_ENDPOINTS.voteComment(commentId), {
                method: "POST",
                body: JSON.stringify({type}),
            });
            setVotedComments((v) => ({...v, [commentId]: type}));
            setComments((cs) =>
                cs.map((c) => {
                    if (c.id !== commentId) return c;
                    const delta = type === "UPVOTE" ? 1 : -1;
                    const undoPrev = prev ? (prev === "UPVOTE" ? -1 : 1) : 0;
                    return {...c, score: c.score + delta + undoPrev};
                }),
            );
        } catch {
            toast.error("Vote failed");
        }
    };

    if (loadingThread) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-neon" />
                    <span className="font-code text-xs text-muted-foreground">
                        Loading thread…
                    </span>
                </div>
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="py-20 text-center font-code text-sm text-muted-foreground">
                Thread not found.{" "}
                <Link to="/" className="text-neon hover:underline">
                    ← Back to feed
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_280px]">
            <section className="min-w-0 space-y-5">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 font-code text-xs text-muted-foreground hover:text-neon"
                >
                    <ArrowLeft className="h-3 w-3" /> Back to feed
                </Link>

                {/* Thread card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={thread.status} />
                        {thread.tags?.map((tag) => (
                            <span
                                key={tag.id}
                                className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-code text-[10px] text-muted-foreground"
                            >
                                <Tag className="h-2.5 w-2.5" />
                                {tag.name}
                            </span>
                        ))}
                    </div>

                    <h1 className="mt-4 text-xl font-bold leading-snug text-foreground sm:text-2xl">
                        {thread.title}
                    </h1>

                    <div className="mt-5 prose prose-sm dark:prose-invert max-w-none">
                        <Markdown content={thread.body} />
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4 font-code text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <UserIcon className="h-3 w-3" />
                            <span className="text-neon font-medium">
                                @{thread.authorName}
                            </span>
                        </div>
                        <span className="text-muted-foreground/40">·</span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{relativeTime(thread.createdAt)}</span>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={handleBookmark}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                                    bookmarked
                                        ? "border-neon/40 bg-neon/10 text-neon"
                                        : "border-border text-muted-foreground hover:border-neon/40 hover:text-neon"
                                }`}
                            >
                                <Bookmark className="h-3 w-3" />
                                {bookmarked ? "Saved" : "Bookmark"}
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(
                                        window.location.href,
                                    );
                                    toast.success("Link copied");
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-neon/40 hover:text-neon"
                            >
                                <Share2 className="h-3 w-3" />
                                Share
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comments */}
                <div>
                    <h2 className="mb-3 flex items-center gap-2 font-code text-sm font-semibold text-foreground">
                        <MessageSquare className="h-4 w-4 text-neon" />
                        <span className="text-muted-foreground">~/</span>
                        comments
                        <span className="rounded-full bg-surface px-2 py-0.5 font-code text-[11px] text-muted-foreground">
                            {thread.numberComments}
                        </span>
                    </h2>

                    {loadingComments ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-neon" />
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {comments.map((comment) => {
                                const myVote = votedComments[comment.id];
                                return (
                                    <div
                                        key={comment.id}
                                        className="rounded-xl border border-border bg-card p-4 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* FIX: Both upvote AND downvote wired */}
                                            <div className="flex flex-col items-center gap-1 pt-0.5">
                                                <button
                                                    onClick={() =>
                                                        handleVote(
                                                            comment.id,
                                                            "UPVOTE",
                                                        )
                                                    }
                                                    className={`rounded p-0.5 transition-colors ${myVote === "UPVOTE" ? "text-neon" : "text-muted-foreground hover:text-neon"}`}
                                                    aria-label="Upvote"
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </button>
                                                <span
                                                    className={`font-code text-xs font-bold ${comment.score > 0 ? "text-neon" : comment.score < 0 ? "text-destructive" : "text-muted-foreground"}`}
                                                >
                                                    {comment.score}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        handleVote(
                                                            comment.id,
                                                            "DOWNVOTE",
                                                        )
                                                    }
                                                    className={`rounded p-0.5 transition-colors ${myVote === "DOWNVOTE" ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                                                    aria-label="Downvote"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 font-code text-[11px]">
                                                    <span className="font-medium text-neon">
                                                        @{comment.authorName}
                                                    </span>
                                                    <span className="text-muted-foreground/40">
                                                        ·
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {relativeTime(
                                                            comment.createdAt,
                                                        )}
                                                    </span>
                                                    {comment.replyCount > 0 && (
                                                        <span className="text-muted-foreground/60">
                                                            {comment.replyCount}{" "}
                                                            replies
                                                        </span>
                                                    )}
                                                    {comment.parentId && (
                                                        <span className="rounded bg-surface px-1.5 py-0.5 font-code text-[10px] text-muted-foreground">
                                                            reply
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                                                    {comment.content}
                                                </p>
                                                {isLoggedIn && (
                                                    <button
                                                        onClick={() =>
                                                            setReplyingTo(
                                                                replyingTo ===
                                                                    comment.id
                                                                    ? null
                                                                    : comment.id,
                                                            )
                                                        }
                                                        className="mt-2 font-code text-[11px] text-muted-foreground hover:text-neon"
                                                    >
                                                        {replyingTo ===
                                                        comment.id
                                                            ? "Cancel"
                                                            : "↳ Reply"}
                                                    </button>
                                                )}
                                                {replyingTo === comment.id && (
                                                    <div className="mt-2 flex gap-2">
                                                        <input
                                                            value={replyText}
                                                            onChange={(e) =>
                                                                setReplyText(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Write a reply…"
                                                            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 font-code text-xs focus:border-neon focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() =>
                                                                submitReply(
                                                                    comment.id,
                                                                )
                                                            }
                                                            className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
                                                        >
                                                            <Send className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {totalCommentPages > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-2 font-code text-xs">
                            <button
                                disabled={commentsPage === 0}
                                onClick={() => setCommentsPage((p) => p - 1)}
                                className="rounded-lg border border-border px-4 py-1.5 disabled:opacity-40 hover:border-neon"
                            >
                                ← Prev
                            </button>
                            <span className="text-muted-foreground">
                                {commentsPage + 1} / {totalCommentPages}
                            </span>
                            <button
                                disabled={commentsPage >= totalCommentPages - 1}
                                onClick={() => setCommentsPage((p) => p + 1)}
                                className="rounded-lg border border-border px-4 py-1.5 disabled:opacity-40 hover:border-neon"
                            >
                                Next →
                            </button>
                        </div>
                    )}

                    {/* Add comment box */}
                    <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <h3 className="mb-3 font-code text-sm font-semibold text-foreground">
                            {isLoggedIn
                                ? `Comment as @${user?.username}`
                                : "Add a comment"}
                        </h3>
                        {isLoggedIn ? (
                            <>
                                <textarea
                                    rows={4}
                                    value={newComment}
                                    onChange={(e) =>
                                        setNewComment(e.target.value)
                                    }
                                    placeholder="Share your thoughts, solution, or follow-up question…"
                                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 font-code text-sm leading-relaxed focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/10"
                                />
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="font-code text-[11px] text-muted-foreground">
                                        {newComment.length} chars{" "}
                                        {newComment.length < 5 &&
                                            newComment.length > 0 &&
                                            "· min 5"}
                                    </span>
                                    <button
                                        onClick={submitComment}
                                        disabled={
                                            submitting ||
                                            newComment.trim().length < 5
                                        }
                                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-40"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        {submitting
                                            ? "Posting…"
                                            : "Post comment"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="font-code text-xs text-muted-foreground">
                                <Link
                                    to="/login"
                                    className="text-neon hover:underline"
                                >
                                    Log in
                                </Link>{" "}
                                to post a comment.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Sidebar */}
            <aside className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <h3 className="mb-3 font-code text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Thread Info
                    </h3>
                    <dl className="space-y-3 font-code text-xs">
                        <div>
                            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                Status
                            </dt>
                            <dd className="mt-1">
                                <StatusBadge status={thread.status} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                Author
                            </dt>
                            <dd className="mt-1 font-medium text-neon">
                                @{thread.authorName}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                Posted
                            </dt>
                            <dd className="mt-1 text-muted-foreground">
                                {relativeTime(thread.createdAt)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                Comments
                            </dt>
                            <dd className="mt-1 text-muted-foreground">
                                {thread.numberComments}
                            </dd>
                        </div>
                        {thread.tags?.length > 0 && (
                            <div>
                                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                    Tags
                                </dt>
                                <dd className="mt-1.5 flex flex-wrap gap-1">
                                    {thread.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="rounded border border-border bg-surface px-1.5 py-0.5 font-code text-[10px] text-muted-foreground"
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            </aside>
        </div>
    );
}
