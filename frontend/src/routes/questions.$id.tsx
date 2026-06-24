import {createFileRoute, Link} from "@tanstack/react-router";
import {
    ArrowLeft,
    ThumbsUp,
    ThumbsDown,
    Clock,
    User as UserIcon,
    Bookmark,
    Share2,
    Loader2,
    Send,
    MessageSquare,
    Tag,
    Pencil,
    Trash2,
    Bot,
    Sparkles,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import {useCallback, useEffect, useState} from "react";
import {toast} from "sonner";
import {StatusBadge} from "@/components/StatusBadge";
import {Markdown} from "@/components/Markdown";
import {decodeQuotedLiteral} from "@/lib/markdown";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {useAuth} from "@/lib/auth-context";
import type {Thread, Comment, Bookmark as BookmarkType, Page, VoteType} from "@/types";
import type {ThreadStatus} from "@/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {useNavigate} from "@tanstack/react-router";

export const Route = createFileRoute("/questions/$id")({
    validateSearch: (search: Record<string, unknown>): {author?: string} => ({
        author: typeof search.author === "string" ? search.author : undefined,
    }),
    head: () => ({meta: [{title: `Question — TechForum Pro`}]}),
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

type CommentNode = Comment & {replies: CommentNode[]};

const TECHFORUM_AI_USERNAME = "TechForumAI";

function buildVoteMap(nodes: CommentNode[]): Record<string, VoteType> {
    const votes: Record<string, VoteType> = {};

    const visit = (currentNodes: CommentNode[]) => {
        for (const node of currentNodes) {
            if (node.userVote) {
                votes[node.id] = node.userVote;
            }
            if (node.replies.length > 0) {
                visit(node.replies);
            }
        }
    };

    visit(nodes);
    return votes;
}

function extractAiComment(nodes: CommentNode[]): {
    nodes: CommentNode[];
    aiComment: CommentNode | null;
} {
    let aiComment: CommentNode | null = null;

    const nextNodes = nodes.flatMap((node) => {
        const nextRepliesResult = extractAiComment(node.replies);

        if (!aiComment && node.authorName === TECHFORUM_AI_USERNAME) {
            aiComment = {...node, replies: nextRepliesResult.nodes};
            return [];
        }

        if (nextRepliesResult.aiComment && !aiComment) {
            aiComment = nextRepliesResult.aiComment;
        }

        return [
            {
                ...node,
                replies: nextRepliesResult.nodes,
            },
        ];
    });

    return {nodes: nextNodes, aiComment};
}

function updateCommentTree(
    nodes: CommentNode[],
    commentId: string,
    updater: (comment: CommentNode) => CommentNode,
): CommentNode[] {
    return nodes.map((node) =>
        node.id === commentId
            ? updater(node)
            : {
                  ...node,
                  replies: updateCommentTree(node.replies, commentId, updater),
              },
    );
}

function findCommentNode(
    nodes: CommentNode[],
    commentId: string,
): CommentNode | null {
    for (const node of nodes) {
        if (node.id === commentId) return node;
        const child = findCommentNode(node.replies, commentId);
        if (child) return child;
    }
    return null;
}

function removeCommentFromTree(
    nodes: CommentNode[],
    commentId: string,
): CommentNode[] {
    return nodes
        .filter((node) => node.id !== commentId)
        .map((node) => ({
            ...node,
            replies: removeCommentFromTree(node.replies, commentId),
        }));
}

async function loadReplyTree(commentId: string): Promise<CommentNode[]> {
    const pageSize = 100;
    const firstPage = await apiFetch<Page<Comment>>(
    `${API_ENDPOINTS.commentReplies(commentId)}?page=0&size=${pageSize}&sortBy=latest`,
    );

    const allReplies: Comment[] = [...firstPage.content];
    for (let page = 1; page < firstPage.totalPages; page += 1) {
        const data = await apiFetch<Page<Comment>>(
            `${API_ENDPOINTS.commentReplies(commentId)}?page=${page}&size=${pageSize}&sortBy=latest`,
        );
        allReplies.push(...data.content);
    }

    return Promise.all(
        allReplies.map(async (reply) => ({
            ...reply,
            replies: await loadReplyTree(reply.id),
        })),
    );
}

async function loadCommentTree(
    threadId: string,
    page: number,
    sortBy: "latest" | "oldest" | "top" = "latest",
) {
    const pageSize = 10;
    const backendSort =
        sortBy === "oldest" ? "older" : sortBy === "top" ? "top score" : "latest";
    const data = await apiFetch<Page<Comment>>(
    `${API_ENDPOINTS.comments(threadId)}?page=${page}&size=${pageSize}&sortBy=${backendSort}`,
    );

    const tree = data.content.map((comment) => ({
        ...comment,
        replies: [],
    }));

    return {tree, totalPages: data.totalPages};
}

function updateAncestorCounts(
    nodes: CommentNode[],
    targetId: string,
    delta: number,
): CommentNode[] {
    let changed = false;
    const result = nodes.map((node) => {
        if (node.id === targetId) {
            changed = true;
            return {...node, totalReplies: (node.totalReplies ?? node.replyCount) + delta};
        }

        const updatedReplies = updateAncestorCounts(node.replies, targetId, delta);
        if (updatedReplies !== node.replies) {
            changed = true;
            return {...node, replies: updatedReplies, totalReplies: (node.totalReplies ?? node.replyCount) + delta};
        }

        return node;
    });
    return result;
}

function countDescendants(nodes: CommentNode[]): number {
    let total = 0;
    for (const n of nodes) {
        total += 1;
        if (n.replies && n.replies.length > 0) total += countDescendants(n.replies);
    }
    return total;
}

/* ─── Depth-aware reply node ─── */
interface CommentHandlers {
    votedComments: Record<string, "UPVOTE" | "DOWNVOTE">;
    votingComments: Record<string, boolean>;
    handleVote: (commentId: string, type: "UPVOTE" | "DOWNVOTE") => void;
    expandedReplies: Record<string, boolean>;
    loadingReplies: Record<string, boolean>;
    toggleReplies: (comment: CommentNode) => void;
    replyingTo: string | null;
    setReplyingTo: (id: string | null) => void;
    replyText: string;
    setReplyText: (t: string) => void;
    submitReply: (parentId: string) => void;
    editingCommentId: string | null;
    editingCommentContent: string;
    setEditingCommentContent: (c: string) => void;
    startEditingComment: (c: Comment) => void;
    setEditingCommentId: (id: string | null) => void;
    saveComment: () => void;
    savingComment: boolean;
    setCommentDeleteId: (id: string) => void;
    isLoggedIn: boolean;
    user: {username: string} | null;
    canEditComment: (c: Comment) => boolean;
    canDeleteComment: (c: Comment) => boolean;
    isAiComment: (c: Comment) => boolean;
}

const MAX_DEPTH = 4;

function CommentCard({
    comment,
    depth,
    handlers,
}: {
    comment: CommentNode;
    depth: number;
    handlers: CommentHandlers;
}) {
    const {
        votedComments,
        votingComments,
        handleVote,
        expandedReplies,
        loadingReplies,
        toggleReplies,
        replyingTo,
        setReplyingTo,
        replyText,
        setReplyText,
        submitReply,
        editingCommentId,
        editingCommentContent,
        setEditingCommentContent,
        startEditingComment,
        setEditingCommentId,
        saveComment,
        savingComment,
        setCommentDeleteId,
        isLoggedIn,
        user,
        canEditComment,
        canDeleteComment,
        isAiComment,
    } = handlers;

    const myVote = votedComments[comment.id];
    const isEditing = editingCommentId === comment.id;
    const aiComment = isAiComment(comment);
    const ownComment = !!user && comment.authorName === user.username;

    // Scale down size at deeper levels
    const avatarSize = depth === 0 ? "h-9 w-9" : "h-7 w-7";
    const voteIconSize = depth === 0 ? "h-3.5 w-3.5" : "h-3 w-3";
    const voteButtonSize = depth === 0 ? "h-7 w-7" : "h-6 w-6";
    const scoreClass = depth === 0 ? "text-sm" : "text-xs";
    const contentClass = depth === 0 ? "" : "";
    const cardPadding = depth === 0 ? "p-6" : "p-4";

    return (
        <div
            className={`rounded-xl shadow-sm transition-all ${cardPadding} ${
                aiComment
                    ? "border border-cyan-500/30 bg-linear-to-br from-cyan-500/10 via-card to-emerald-500/5 shadow-cyan-500/10"
                    : "border border-border bg-card"
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                {aiComment ? (
                    <div
                        className={`flex ${avatarSize} shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-500`}
                    >
                        <Bot
                            className={depth === 0 ? "h-4 w-4" : "h-3.5 w-3.5"}
                        />
                    </div>
                ) : (
                    <div
                        className={`flex ${avatarSize} shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground`}
                    >
                        <UserIcon
                            className={depth === 0 ? "h-4 w-4" : "h-3 w-3"}
                        />
                    </div>
                )}

                {/* Vote column */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                    <button
                        onClick={() => handleVote(comment.id, "UPVOTE")}
                        disabled={votingComments[comment.id] || ownComment}
                        title={
                            ownComment
                                ? "Cannot vote your own comment"
                                : "Upvote"
                        }
                        aria-pressed={myVote === "UPVOTE"}
                        aria-label="Upvote"
                        className={`flex ${voteButtonSize} items-center justify-center rounded-full border transition-colors ${
                            myVote === "UPVOTE"
                                ? "border-neon bg-neon/10 text-neon"
                                : "border-border text-muted-foreground hover:border-neon hover:text-neon"
                        } ${ownComment ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                        <ThumbsUp className={voteIconSize} />
                    </button>
                    <span
                        className={`font-code font-bold ${scoreClass} ${
                            comment.score > 0
                                ? "text-neon"
                                : comment.score < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                        }`}
                    >
                        {comment.score}
                    </span>
                    <button
                        onClick={() => handleVote(comment.id, "DOWNVOTE")}
                        disabled={votingComments[comment.id] || ownComment}
                        title={
                            ownComment
                                ? "Cannot vote your own comment"
                                : "Downvote"
                        }
                        aria-pressed={myVote === "DOWNVOTE"}
                        aria-label="Downvote"
                        className={`flex ${voteButtonSize} items-center justify-center rounded-full border transition-colors ${
                            myVote === "DOWNVOTE"
                                ? "border-destructive bg-destructive/10 text-destructive"
                                : "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                        } ${ownComment ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                        <ThumbsDown className={voteIconSize} />
                    </button>
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                    {/* Header row */}
                    <div className="flex flex-wrap items-center gap-1.5 font-code text-[11px]">
                        <span
                            className={`font-medium ${aiComment ? "text-cyan-500" : "text-neon"}`}
                        >
                            @{comment.authorName}
                        </span>
                        {aiComment && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-500">
                                <Sparkles className="h-2.5 w-2.5" />
                                TechForum AI
                            </span>
                        )}
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground">
                            {relativeTime(comment.createdAt)}
                        </span>
                        {((comment.totalReplies ?? comment.replyCount) > 0) && (
                            <span className="text-muted-foreground/60">
                                {comment.totalReplies ?? comment.replyCount} replies
                            </span>
                        )}
                        {comment.parentId && (
                            <span className="rounded bg-surface px-1.5 py-0.5 font-code text-[10px] text-muted-foreground">
                                reply
                            </span>
                        )}
                        {(canEditComment(comment) ||
                            canDeleteComment(comment)) && (
                            <span className="ml-auto flex items-center gap-1">
                                {canEditComment(comment) && (
                                    <button
                                        onClick={() =>
                                            startEditingComment(comment)
                                        }
                                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-neon hover:text-neon"
                                    >
                                        Edit
                                    </button>
                                )}
                                {canDeleteComment(comment) && (
                                    <button
                                        onClick={() =>
                                            setCommentDeleteId(comment.id)
                                        }
                                        className="rounded border border-destructive/30 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10"
                                    >
                                        Delete
                                    </button>
                                )}
                            </span>
                        )}
                    </div>

                    {/* Content or edit form */}
                    {isEditing ? (
                        <div className="mt-2 space-y-3">
                            <textarea
                                rows={4}
                                value={editingCommentContent}
                                onChange={(e) =>
                                    setEditingCommentContent(e.target.value)
                                }
                                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-code text-xs leading-relaxed focus:border-neon focus:outline-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentContent("");
                                    }}
                                    className="rounded-lg border border-border px-3 py-1.5 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveComment}
                                    disabled={savingComment}
                                    className="rounded-lg bg-primary px-3 py-1.5 font-code text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                                >
                                    {savingComment ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`mt-1.5 max-w-prose ${contentClass}`}>
                            <Markdown
                                content={comment.content}
                                compact={depth > 0}
                            />
                        </div>
                    )}

                    {/* Reply button */}
                    {isLoggedIn && depth < MAX_DEPTH && (
                        <button
                            onClick={() =>
                                setReplyingTo(
                                    replyingTo === comment.id
                                        ? null
                                        : comment.id,
                                )
                            }
                            className="mt-1.5 font-code text-[11px] text-muted-foreground hover:text-neon"
                        >
                            {replyingTo === comment.id ? "Cancel" : "↳ Reply"}
                        </button>
                    )}

                    {/* Inline reply input */}
                    {replyingTo === comment.id && (
                        <div className="mt-2 flex gap-2">
                            <input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a reply…"
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 font-code text-xs focus:border-neon focus:outline-none"
                            />
                            <button
                                onClick={() => submitReply(comment.id)}
                                className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
                            >
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Toggle + nested replies */}
                    {((comment.totalReplies ?? comment.replyCount) > 0) && (
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={() => toggleReplies(comment)}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 font-code text-[11px] text-muted-foreground transition-colors hover:border-neon/50 hover:text-neon"
                            >
                                {expandedReplies[comment.id] ? (
                                    <ChevronUp className="h-3 w-3" />
                                ) : (
                                    <ChevronDown className="h-3 w-3" />
                                )}
                                {expandedReplies[comment.id]
                                    ? `Hide replies`
                                    : `${comment.totalReplies ?? comment.replyCount} ${((comment.totalReplies ?? comment.replyCount) === 1) ? "reply" : "replies"}`}
                            </button>

                            {expandedReplies[comment.id] && (
                                <div className="mt-2 space-y-2">
                                    {loadingReplies[comment.id] ? (
                                        <div className="flex items-center gap-2 py-2 font-code text-[11px] text-muted-foreground">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Loading replies…
                                        </div>
                                    ) : comment.replies.length === 0 ? (
                                        <p className="font-code text-[11px] text-muted-foreground">
                                            No replies yet.
                                        </p>
                                    ) : (
                                        <div
                                            className={`space-y-3 border-l-2 pl-3 ${depth === 0 ? "border-neon/20 ml-1" : "border-border/40 ml-0.5"}`}
                                        >
                                            {comment.replies.map((reply) => (
                                                <CommentCard
                                                    key={reply.id}
                                                    comment={reply}
                                                    depth={Math.min(
                                                        depth + 1,
                                                        MAX_DEPTH,
                                                    )}
                                                    handlers={handlers}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AiCommentSkeleton() {
    return (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl border border-cyan-500/20 bg-cyan-500/10" />
                <div className="space-y-1">
                    <div className="h-3 w-28 rounded-full bg-cyan-500/15" />
                    <div className="h-2.5 w-20 rounded-full bg-cyan-500/10" />
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-code text-[10px] font-semibold text-cyan-500">
                    <Sparkles className="h-2.5 w-2.5" />
                    TechForum AI
                </span>
            </div>
            <div className="space-y-2">
                <div className="h-3 w-3/4 rounded-full bg-cyan-500/10" />
                <div className="h-3 w-5/6 rounded-full bg-cyan-500/10" />
                <div className="h-3 w-2/3 rounded-full bg-cyan-500/10" />
            </div>
        </div>
    );
}

/* ─── Main page ─── */
function QuestionDetail() {
    const {id} = Route.useParams();
    const {author} = Route.useSearch();
    const navigate = useNavigate();
    const {isLoggedIn, user} = useAuth();

    const [thread, setThread] = useState<Thread | null>(null);
    const [comments, setComments] = useState<CommentNode[]>([]);
    const [commentsPage, setCommentsPage] = useState(0);
    const [commentSort, setCommentSort] = useState<"latest" | "oldest" | "top">(
        "latest",
    );
    const [totalCommentPages, setTotalCommentPages] = useState(1);
    const [loadingThread, setLoadingThread] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [pollingForAiComment, setPollingForAiComment] = useState(false);
    const [pollingTimedOut, setPollingTimedOut] = useState(false);
    const [aiComment, setAiComment] = useState<CommentNode | null>(null);
    const [bookmarked, setBookmarked] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [votedComments, setVotedComments] = useState<
        Record<string, "UPVOTE" | "DOWNVOTE">
    >({});
    const [votingComments, setVotingComments] = useState<
        Record<string, boolean>
    >({});
    const [expandedReplies, setExpandedReplies] = useState<
        Record<string, boolean>
    >({});
    const [loadingReplies, setLoadingReplies] = useState<
        Record<string, boolean>
    >({});
    const [editingCommentId, setEditingCommentId] = useState<string | null>(
        null,
    );
    const [editingCommentContent, setEditingCommentContent] = useState("");
    const [commentDeleteId, setCommentDeleteId] = useState<string | null>(null);
    const [savingComment, setSavingComment] = useState(false);
    const [deletingComment, setDeletingComment] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editBody, setEditBody] = useState("");
    const [editStatus, setEditStatus] = useState<ThreadStatus>("OPEN");
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editTagInput, setEditTagInput] = useState("");
    const [savingThread, setSavingThread] = useState(false);
    const [deletingThread, setDeletingThread] = useState(false);

    const role = user?.role?.toUpperCase();
    const isPrivileged = role === "ADMIN" || role === "MODERATOR";
    const isThreadOwner = !!user && thread?.authorName === user.username;
    const canEditThread = isLoggedIn && isThreadOwner;
    const canDeleteThread = isLoggedIn && (isThreadOwner || isPrivileged);

    const canEditComment = (comment: Comment) =>
        isLoggedIn && !!user && comment.authorName === user.username;
    const canDeleteComment = (comment: Comment) =>
        isLoggedIn &&
        !!user &&
        (comment.authorName === user.username || isPrivileged);
    const isAiComment = (comment: Comment) =>
        comment.authorName === TECHFORUM_AI_USERNAME;

    const toggleReplies = async (comment: CommentNode) => {
        const nextExpanded = !(expandedReplies[comment.id] ?? false);
        setExpandedReplies((current) => ({
            ...current,
            [comment.id]: nextExpanded,
        }));

        if (
            !nextExpanded ||
            (comment.totalReplies ?? comment.replyCount) === 0 ||
            comment.replies.length > 0
        )
            return;

        setLoadingReplies((current) => ({...current, [comment.id]: true}));
        try {
            const replies = await loadReplyTree(comment.id);
            const replyVotes = buildVoteMap(replies);
                // compute total descendant reply count (include nested replies)
                const countDescendants = (nodes: CommentNode[]): number => {
                    let total = 0;
                    for (const n of nodes) {
                        total += 1; // this reply
                        if (n.replies && n.replies.length > 0) total += countDescendants(n.replies);
                    }
                    return total;
                };
                const totalReplies = countDescendants(replies);

                setComments((current) =>
                    updateCommentTree(current, comment.id, (node) => ({
                        ...node,
                        replies,
                        totalReplies: totalReplies,
                    })),
                );
            setVotedComments((current) => ({...current, ...replyVotes}));
        } catch {
            toast.error("Failed to load replies");
        } finally {
            setLoadingReplies((current) => ({...current, [comment.id]: false}));
        }
    };

    const openEditDialog = () => {
        if (!thread) return;
        setEditTitle(thread.title);
        setEditBody(thread.body);
        setEditStatus(thread.status);
        setEditTags(thread.tags?.map((tag) => tag.name) ?? []);
        setEditTagInput("");
        setEditOpen(true);
    };

    const addEditTag = () => {
        const nextTag = editTagInput.trim().toLowerCase();
        if (!nextTag || editTags.includes(nextTag)) return;
        setEditTags((current) => [...current, nextTag]);
        setEditTagInput("");
    };

    const removeEditTag = (tagName: string) => {
        setEditTags((current) => current.filter((tag) => tag !== tagName));
    };

    const saveThread = async () => {
        if (!thread || !canEditThread) return;
        if (editTitle.trim().length < 8) {
            toast.error("Title must be at least 8 characters");
            return;
        }
        if (editBody.trim().length < 30) {
            toast.error("Body must be at least 30 characters");
            return;
        }
        setSavingThread(true);
        try {
            const updated = await apiFetch<Thread>(
                API_ENDPOINTS.threadById(id),
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        title: editTitle.trim(),
                        body: editBody.trim(),
                        status: editStatus,
                        tags: editTags.map((name) => ({name})),
                    }),
                },
            );
            setThread(updated);
            setEditOpen(false);
            toast.success("Post updated");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to update post",
            );
        } finally {
            setSavingThread(false);
        }
    };

    const deleteThread = async () => {
        if (!thread || !canDeleteThread) return;
        setDeletingThread(true);
        try {
            await apiFetch(API_ENDPOINTS.threadById(id), {method: "DELETE"});
            toast.success("Post deleted");
            navigate({to: "/"});
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to delete post",
            );
        } finally {
            setDeletingThread(false);
        }
    };

    const startEditingComment = (comment: Comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentContent(decodeQuotedLiteral(comment.content));
    };

    const saveComment = async () => {
        if (!editingCommentId) return;
        const trimmed = editingCommentContent.trim();
        if (trimmed.length < 5) {
            toast.error("Comment too short");
            return;
        }
        setSavingComment(true);
        try {
            const updated = await apiFetch<Comment>(
                API_ENDPOINTS.commentById(editingCommentId),
                {
                    method: "PATCH",
                    body: JSON.stringify(trimmed),
                },
            );
            setComments((prev) =>
                updateCommentTree(prev, editingCommentId, (comment) => ({
                    ...comment,
                    ...updated,
                    replies: comment.replies,
                })),
            );
            setEditingCommentId(null);
            setEditingCommentContent("");
            toast.success("Comment updated");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to update comment",
            );
        } finally {
            setSavingComment(false);
        }
    };

    const deleteComment = async () => {
        if (!commentDeleteId) return;
        setDeletingComment(true);
        try {
            await apiFetch(API_ENDPOINTS.commentById(commentDeleteId), {
                method: "DELETE",
            });
            // compute deleted node descendant count to update ancestor counts and thread total
            const nodeToDelete = findCommentNode(comments, commentDeleteId);
            const removedCount = nodeToDelete ? 1 + countDescendants(nodeToDelete.replies) : 1;
            setComments((prev) => {
                const removed = removeCommentFromTree(prev, commentDeleteId);
                // decrement ancestor reply counts by removedCount
                return updateAncestorCounts(removed, commentDeleteId, -removedCount);
            });
            if (thread) setThread((t) => ({...(t as Thread), numberComments: t.numberComments - removedCount}));
            toast.success("Comment deleted");
            setCommentDeleteId(null);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to delete comment",
            );
        } finally {
            setDeletingComment(false);
        }
    };

    const reloadComments = useCallback(async (options?: {silent?: boolean}) => {
        const silent = options?.silent ?? false;
        if (!silent) setLoadingComments(true);
        try {
            const data = await loadCommentTree(id, commentsPage, commentSort);
            const {nodes, aiComment: nextAiComment} = extractAiComment(data.tree);
            setComments(nodes);
            setAiComment(nextAiComment);
            setVotedComments(buildVoteMap(data.tree));
            setTotalCommentPages(data.totalPages);
            return !!nextAiComment;
        } catch {
            if (!silent) toast.error("Failed to load comments");
            return false;
        } finally {
            if (!silent) setLoadingComments(false);
        }
    }, [id, commentsPage, commentSort]);

    useEffect(() => {
        let cancelled = false;
        let pollingInterval: ReturnType<typeof window.setInterval> | null = null;
        let timeoutId: ReturnType<typeof window.setTimeout> | null = null;
        let pollInFlight = false;

        const stopPolling = () => {
            if (pollingInterval !== null) {
                window.clearInterval(pollingInterval);
                pollingInterval = null;
            }
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
                timeoutId = null;
            }
        };

        const startPolling = async () => {
            setAiComment(null);
            setPollingTimedOut(false);
            setPollingForAiComment(false);

            const foundAiOnFirstLoad = await reloadComments();
            if (cancelled || foundAiOnFirstLoad) return;

            setPollingForAiComment(true);

            pollingInterval = window.setInterval(async () => {
                if (cancelled) return;
                if (pollInFlight) return;
                pollInFlight = true;
                const foundAi = await reloadComments({silent: true});
                pollInFlight = false;
                if (cancelled || !foundAi) return;
                setPollingForAiComment(false);
                stopPolling();
            }, 3000);

            timeoutId = window.setTimeout(() => {
                if (cancelled) return;
                setPollingForAiComment(false);
                setPollingTimedOut(true);
                stopPolling();
            }, 60000);
        };

        void startPolling();

        return () => {
            cancelled = true;
            stopPolling();
        };
    }, [id, commentsPage, commentSort, reloadComments]);

    useEffect(() => {
        const load = async () => {
            setLoadingThread(true);
            try {
                if (author) {
                    setThread(
                        await apiFetch<Thread>(
                            API_ENDPOINTS.threadExpand(author, id),
                        ),
                    );
                    return;
                }
                const searchPage = await apiFetch<Page<Thread>>(
                    `${API_ENDPOINTS.threadSearch}?keyword=${id}&size=5`,
                );
                const found = searchPage.content.find((t) => t.id === id);
                if (found) {
                    setThread(found);
                    return;
                }

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
    }, [id, author]);

    useEffect(() => {
        if (!isLoggedIn) return;
        let cancelled = false;
        const loadBookmarks = async () => {
            try {
                const pageSize = 100;
                let page = 0;
                while (!cancelled) {
                    const data = await apiFetch<Page<BookmarkType>>(
                        `${API_ENDPOINTS.bookmarks}?page=${page}&size=${pageSize}`,
                    );
                    if (data.content.some((b) => b.threadId === id)) {
                        if (!cancelled) setBookmarked(true);
                        return;
                    }
                    if (page >= data.totalPages - 1) break;
                    page += 1;
                }
                if (!cancelled) setBookmarked(false);
            } catch {
                if (!cancelled) setBookmarked(false);
            }
        };
        loadBookmarks();
        return () => {
            cancelled = true;
        };
    }, [id, isLoggedIn]);

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

    const submitComment = async () => {
        if (!isLoggedIn) {
            toast.error("Please log in to comment");
            return;
        }
        if (newComment.trim().length < 5) {
            toast.error("Comment too short");
            return;
        }
        // optimistic top-level comment: insert locally before server response
        const tempId = typeof globalThis.crypto?.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const tempComment: CommentNode = {
            id: tempId,
            parentId: null,
            threadId: id,
            authorName: user?.username ?? "You",
            content: newComment.trim(),
            replyCount: 0,
            totalReplies: 0,
            score: 0,
            createdAt: new Date().toISOString(),
            replies: [],
        };

        const prevComments = comments;
        const prevThread = thread;
        setComments((cur) => [tempComment, ...cur]);
        if (thread) setThread((t) => ({...(t as Thread), numberComments: t.numberComments + 1}));
        setNewComment("");
        setSubmitting(true);
        try {
            await apiFetch<Comment>(API_ENDPOINTS.commentsBase, {
                method: "POST",
                body: JSON.stringify({
                    threadId: id,
                    content: tempComment.content,
                    parentId: null,
                }),
            });
            toast.success("Comment posted");
            await reloadComments();
        } catch (err) {
            // rollback optimistic update
            setComments(prevComments);
            if (prevThread) setThread(prevThread);
            setNewComment(tempComment.content);
            toast.error(err instanceof Error ? err.message : "Failed");
        } finally {
            setSubmitting(false);
        }
    };

    const submitReply = async (parentId: string) => {
        if (!isLoggedIn) {
            toast.error("Please log in");
            return;
        }
        if (replyText.trim().length < 5) {
            toast.error("Reply too short");
            return;
        }
        // optimistic increment of ancestor reply counts and thread comment count
        const prevComments = comments;
        const prevThread = thread;
        setComments((cur) => updateAncestorCounts(cur, parentId, 1));
        if (thread) setThread((t) => ({...(t as Thread), numberComments: t.numberComments + 1}));

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
            await reloadComments();
        } catch (err) {
            // rollback optimistic update
            setComments(prevComments);
            if (prevThread) setThread(prevThread);
            toast.error(err instanceof Error ? err.message : "Failed");
        }
    };

   

    const handleVote = async (
        commentId: string,
        type: "UPVOTE" | "DOWNVOTE",
    ) => {
        const updateAiCommentScore = (delta: number) => {
            setAiComment((current: CommentNode | null) =>
                current && current.id === commentId
                    ? {...current, score: current.score + delta}
                    : current,
            );
        };

        if (!isLoggedIn) {
            toast.error("Please log in to vote");
            return;
        }
        if (votingComments[commentId]) return;

        const target = findCommentNode(comments, commentId);
        if (target && user && target.authorName === user.username) {
            toast.error("You cannot vote your own comment");
            return;
        }

        const prev = votedComments[commentId] ?? null;
        setVotingComments((current) => ({ ...current, [commentId]: true }));

        if (prev === type) {
            const revertDelta = type === "UPVOTE" ? -1 : 1;

            setVotedComments((current) => {
                const c = { ...current };
                delete c[commentId];
                return c;
            });
            setComments((current) =>
                updateCommentTree(current, commentId, (c) => ({
                    ...c,
                    score: c.score + revertDelta,
                }))
            );
            updateAiCommentScore(revertDelta);

            try {
                await apiFetch(API_ENDPOINTS.voteComment(commentId), {
                    method: "POST",
                    body: JSON.stringify({ type }),
                });
            } catch (err) {
                setVotedComments((current) => ({ ...current, [commentId]: prev }));
                setComments((current) =>
                    updateCommentTree(current, commentId, (c) => ({
                        ...c,
                        score: c.score - revertDelta,
                    }))
                );
                updateAiCommentScore(-revertDelta);
                toast.error(err instanceof Error ? err.message : "Vote failed");
            } finally {
                setVotingComments((current) => ({ ...current, [commentId]: false }));
            }
            return;
        }

        const oldContribution = prev === "UPVOTE" ? 1 : prev === "DOWNVOTE" ? -1 : 0;
        const newContribution = type === "UPVOTE" ? 1 : -1;
        const delta = newContribution - oldContribution;

        setVotedComments((current) => ({ ...current, [commentId]: type }));
        setComments((current) =>
            updateCommentTree(current, commentId, (c) => ({
                ...c,
                score: c.score + delta,
            }))
        );
        updateAiCommentScore(delta);

        try {
            await apiFetch(API_ENDPOINTS.voteComment(commentId), {
                method: "POST",
                body: JSON.stringify({ type }),
            });
        } catch (err) {
            if (prev === null) {
                setVotedComments((current) => {
                    const c = { ...current };
                    delete c[commentId];
                    return c;
                });
            } else {
                setVotedComments((current) => ({ ...current, [commentId]: prev }));
            }
            setComments((current) =>
                updateCommentTree(current, commentId, (c) => ({
                    ...c,
                    score: c.score - delta,
                }))
            );
            updateAiCommentScore(-delta);
            toast.error(err instanceof Error ? err.message : "Vote failed");
        } finally {
            setVotingComments((current) => ({ ...current, [commentId]: false }));
        }
    };

    const commentHandlers: CommentHandlers = {
        votedComments,
        votingComments,
        handleVote,
        expandedReplies,
        loadingReplies,
        toggleReplies,
        replyingTo,
        setReplyingTo,
        replyText,
        setReplyText,
        submitReply,
        editingCommentId,
        editingCommentContent,
        setEditingCommentContent,
        startEditingComment,
        setEditingCommentId,
        saveComment,
        savingComment,
        setCommentDeleteId,
        isLoggedIn,
        user,
        canEditComment,
        canDeleteComment,
        isAiComment,
    };

    const showAiSkeleton = pollingForAiComment && !aiComment && !pollingTimedOut;

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
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px]">
            <section className="min-w-0 space-y-6">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 font-code text-xs text-muted-foreground hover:text-neon"
                >
                    <ArrowLeft className="h-3 w-3" /> Back to feed
                </Link>

                {/* Thread card */}
                <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={thread.status} />
                        {thread.tags?.map((tag) => (
                            <Link
                                key={tag.name}
                                to="/tags/$tag"
                                params={{tag: tag.name}}
                                className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-code text-[10px] text-muted-foreground transition-colors hover:border-neon hover:text-neon"
                            >
                                <Tag className="h-2.5 w-2.5" />
                                {tag.name}
                            </Link>
                        ))}
                    </div>

                    <h1 className="mt-6 text-xl font-bold leading-snug text-foreground sm:text-2xl">
                        {thread.title}
                    </h1>

                    <div className="mt-6 prose prose-sm dark:prose-invert max-w-none">
                        <Markdown content={thread.body} />
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5 font-code text-sm">
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
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            {canEditThread && (
                                <button
                                    onClick={openEditDialog}
                                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-neon/40 hover:text-neon"
                                >
                                    <Pencil className="h-3 w-3" /> Edit
                                </button>
                            )}
                            {canDeleteThread && (
                                <button
                                    onClick={() => setDeleteOpen(true)}
                                    className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-all hover:bg-destructive/10"
                                >
                                    <Trash2 className="h-3 w-3" /> Delete
                                </button>
                            )}
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
                                <Share2 className="h-3 w-3" /> Share
                            </button>
                        </div>
                    </div>
                </div>

                {/* Edit + Delete dialogs */}
                <Dialog
                    open={editOpen}
                    onOpenChange={(open) => {
                        setEditOpen(open);
                        if (!open) setEditTagInput("");
                    }}
                >
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit post</DialogTitle>
                            <DialogDescription>
                                Update the title, body, status, and tags for
                                this thread.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-5">
                            <div>
                                <label className="mb-1.5 block font-code text-xs text-muted-foreground">
                                    title
                                </label>
                                <input
                                    value={editTitle}
                                    onChange={(e) =>
                                        setEditTitle(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block font-code text-xs text-muted-foreground">
                                    body
                                </label>
                                <textarea
                                    rows={10}
                                    value={editBody}
                                    onChange={(e) =>
                                        setEditBody(e.target.value)
                                    }
                                    className="w-full resize-y rounded-lg border border-border bg-background px-4 py-2.5 font-code text-sm leading-relaxed focus:border-neon focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block font-code text-xs text-muted-foreground">
                                    status
                                </label>
                                <Select
                                    value={editStatus}
                                    onValueChange={(value) =>
                                        setEditStatus(value as ThreadStatus)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OPEN">
                                            Open
                                        </SelectItem>
                                        <SelectItem value="RESOLVED">
                                            Resolved
                                        </SelectItem>
                                        <SelectItem value="CLOSED">
                                            Closed
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="mb-1.5 block font-code text-xs text-muted-foreground">
                                    tags
                                </label>
                                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background p-2">
                                    {editTags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="flex items-center gap-1 rounded-md border border-neon/30 bg-neon/10 px-2 py-0.5 font-code text-[11px] text-neon"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeEditTag(tag)
                                                }
                                                className="hover:text-destructive"
                                            >
                                                <span className="sr-only">
                                                    Remove tag
                                                </span>
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        value={editTagInput}
                                        onChange={(e) =>
                                            setEditTagInput(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" ||
                                                e.key === ","
                                            ) {
                                                e.preventDefault();
                                                addEditTag();
                                            }
                                        }}
                                        placeholder="add tag and press Enter…"
                                        className="min-w-35 flex-1 bg-transparent px-2 py-1 font-code text-xs focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setEditOpen(false)}
                                className="rounded-lg border border-border px-4 py-2 font-code text-sm text-muted-foreground hover:border-neon hover:text-neon"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveThread}
                                disabled={savingThread}
                                className="rounded-lg bg-primary px-4 py-2 font-code text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                            >
                                {savingThread ? "Saving…" : "Save changes"}
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete this post?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently remove the thread and all
                                of its comments.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingThread}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                disabled={deletingThread}
                                onClick={(event) => {
                                    event.preventDefault();
                                    deleteThread();
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {deletingThread ? "Deleting…" : "Delete post"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Comments section */}
                <div>
                    <div className="mb-3 flex items-start justify-between gap-4">
                        <h2 className="flex items-center gap-2 font-code text-sm font-semibold text-foreground">
                            <MessageSquare className="h-4 w-4 text-neon" />
                            <span className="text-muted-foreground">~/</span>
                            comments
                            <span className="rounded-full bg-surface px-2 py-0.5 font-code text-[11px] text-muted-foreground">
                                {thread.numberComments}
                            </span>
                        </h2>

                        <div className="w-40">
                            <Select
                                defaultValue={commentSort}
                                onValueChange={(v) => {
                                    const next = v as "latest" | "oldest" | "top";
                                    setCommentSort(next);
                                    setCommentsPage(0);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="latest">Latest</SelectItem>
                                    <SelectItem value="oldest">Oldest</SelectItem>
                                    <SelectItem value="top">Top</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {loadingComments ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-neon" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {aiComment ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 font-code text-[10px] uppercase tracking-[0.2em] text-cyan-500">
                                        <Sparkles className="h-3 w-3" />
                                        TechForum AI answer
                                    </div>
                                    <CommentCard
                                        key={aiComment.id}
                                        comment={aiComment}
                                        depth={0}
                                        handlers={commentHandlers}
                                    />
                                </div>
                            ) : showAiSkeleton ? (
                                <AiCommentSkeleton />
                            ) : null}

                            {comments.map((comment) => (
                                <CommentCard
                                    key={comment.id}
                                    comment={comment}
                                    depth={0}
                                    handlers={commentHandlers}
                                />
                            ))}
                        </div>
                    )}

                    {/* Comment delete dialog */}
                    <AlertDialog
                        open={commentDeleteId !== null}
                        onOpenChange={(open) => {
                            if (!open) setCommentDeleteId(null);
                        }}
                    >
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Delete this comment?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently remove the comment and
                                    cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={deletingComment}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={deletingComment}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        deleteComment();
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {deletingComment
                                        ? "Deleting…"
                                        : "Delete comment"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Pagination */}
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

                    {/* Add comment */}
                    <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
                                        <Link
                                            key={tag.name}
                                            to="/tags/$tag"
                                            params={{tag: tag.name}}
                                            className="rounded border border-border bg-surface px-1.5 py-0.5 font-code text-[10px] text-muted-foreground transition-colors hover:border-neon hover:text-neon"
                                        >
                                            {tag.name}
                                        </Link>
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
