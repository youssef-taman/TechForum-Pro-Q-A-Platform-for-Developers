import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, MessageSquare, ChevronUp, ChevronDown, Clock,
  User as UserIcon, CheckCircle2, Bookmark, Share2, Lock, Loader2, Send,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { Markdown } from "@/components/Markdown";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ThreadStatus } from "@/types";

export const Route = createFileRoute("/questions/$id")({
  head: ({ params }) => ({ meta: [{ title: `Question #${params.id} — TechForum Pro` }] }),
  component: QuestionDetail,
});

// ── DTOs ──────────────────────────────────────────────────────────────────────
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
interface CommentDTO {
  id: string;
  parentId: string | null;
  threadId: string;
  authorName: string;
  content: string;
  replyCount: number;
  score: number;
  createdAt: string;
}
interface Page<T> { content: T[]; totalPages: number; number: number }

function QuestionDetail() {
  const { id } = Route.useParams();
  const { isLoggedIn } = useAuth();

  const [thread, setThread] = useState<ThreadDTO | null>(null);
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [commentsPage, setCommentsPage] = useState(0);
  const [totalCommentPages, setTotalCommentPages] = useState(1);
  const [loadingThread, setLoadingThread] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Fetch thread — uses GET /threads/{username}/{id} but we don't know username yet,
  // so fall back to listing and finding, or use a direct ID approach via search
  // The backend exposes GET /threads/{username}/{threadId}; we fetch the thread list
  // and find by id, or use expandThread with a workaround.
  // Since we only have the UUID, we'll hit GET /threads?keyword=... but that's imprecise.
  // Best approach: use the timeline endpoint and filter, or provide a dedicated endpoint.
  // For now we fetch timeline and search for the thread id among results — this is a
  // temporary workaround until the backend adds GET /threads/{id}.
  // Actually the real endpoint is GET /threads/{username}/{threadId} — we call it with
  // a placeholder username first and rely on backend to resolve by threadId alone,
  // OR we cache the authorName from the feed. We'll try direct expand after finding author.
  // Simple approach: call GET /threads with a large page and search until we match.
  // BETTER: the backend has no GET /threads/:id shortcut so we search by keyword=id (UUID).
  // We'll use the search endpoint with the UUID as keyword; if that returns nothing, show error.

  useEffect(() => {
    const loadThread = async () => {
      setLoadingThread(true);
      try {
        // Try to get the thread via search — the backend search may support UUID keywords
        // If your backend exposes GET /threads/{username}/{threadId}, you can use that.
        // Here we fetch a page of threads and find the matching one.
        const page = await apiFetch<Page<ThreadDTO>>(
          `${API_ENDPOINTS.threads}?size=100&sortBy=latest`
        );
        const found = page.content.find((t) => t.id === id);
        if (found) {
          setThread(found);
        } else {
          toast.error("Thread not found");
        }
      } catch {
        toast.error("Failed to load thread");
      } finally {
        setLoadingThread(false);
      }
    };
    loadThread();
  }, [id]);

  useEffect(() => {
    const loadComments = async () => {
      setLoadingComments(true);
      try {
        const data = await apiFetch<Page<CommentDTO>>(
          `${API_ENDPOINTS.comments(id)}?page=${commentsPage}&size=10&sortBy=latest`
        );
        setComments(data.content);
        setTotalCommentPages(data.totalPages);
      } catch {
        toast.error("Failed to load comments");
      } finally {
        setLoadingComments(false);
      }
    };
    loadComments();
  }, [id, commentsPage]);

  const handleBookmark = async () => {
    if (!isLoggedIn) { toast.error("Please log in to bookmark"); return; }
    try {
      if (bookmarked) {
        await apiFetch(API_ENDPOINTS.bookmarkThread(id), { method: "DELETE" });
        setBookmarked(false);
        toast.success("Bookmark removed");
      } else {
        await apiFetch(API_ENDPOINTS.bookmarkThread(id), { method: "POST" });
        setBookmarked(true);
        toast.success("Bookmarked!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  const submitComment = async () => {
    if (!isLoggedIn) { toast.error("Please log in to comment"); return; }
    if (newComment.trim().length < 5) { toast.error("Comment too short"); return; }
    setSubmitting(true);
    try {
      const created = await apiFetch<CommentDTO>(
        `${import.meta.env.VITE_SPRING_BOOT_API_URL ?? "/api"}/comments`,
        { method: "POST", body: JSON.stringify({ threadId: id, content: newComment.trim(), parentId: null }) }
      );
      setComments((prev) => [created, ...prev]);
      setNewComment("");
      toast.success("Comment posted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!isLoggedIn) { toast.error("Please log in"); return; }
    if (replyText.trim().length < 5) { toast.error("Reply too short"); return; }
    try {
      await apiFetch(
        `${import.meta.env.VITE_SPRING_BOOT_API_URL ?? "/api"}/comments`,
        { method: "POST", body: JSON.stringify({ threadId: id, content: replyText.trim(), parentId }) }
      );
      setReplyingTo(null);
      setReplyText("");
      toast.success("Reply posted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post reply");
    }
  };

  if (loadingThread) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="py-20 text-center font-code text-sm text-muted-foreground">
        Thread not found. <Link to="/" className="text-neon hover:underline">Go home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5">
        <Link to="/" className="inline-flex items-center gap-1.5 font-code text-xs text-muted-foreground hover:text-neon">
          <ArrowLeft className="h-3 w-3" /> back to feed
        </Link>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1 pt-1">
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
              <span className="font-code text-lg font-bold">—</span>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={thread.status} />
                {thread.tags?.map((tag) => (
                  <span key={tag.id} className="rounded-md border border-border bg-surface px-2 py-0.5 font-code text-[10px] text-muted-foreground">
                    {tag.name}
                  </span>
                ))}
              </div>
              <h1 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">{thread.title}</h1>
              <div className="mt-4"><Markdown content={thread.body} /></div>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 font-code text-xs">
                <div className="flex items-center gap-1.5">
                  <UserIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-neon">@{thread.authorName}</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{new Date(thread.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={handleBookmark}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 transition-colors ${
                      bookmarked ? "border-neon text-neon" : "border-border text-muted-foreground hover:border-neon hover:text-neon"
                    }`}>
                    <Bookmark className="h-3 w-3" /> {bookmarked ? "Saved" : "Bookmark"}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-neon hover:text-neon">
                    <Share2 className="h-3 w-3" /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div>
          <h2 className="mb-4 font-code text-base font-semibold">
            <span className="text-muted-foreground">~/</span>comments
            <span className="ml-2 text-xs text-muted-foreground">({thread.numberComments})</span>
          </h2>

          {loadingComments ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <button onClick={async () => {
                        if (!isLoggedIn) { toast.error("Please log in"); return; }
                        try {
                          await apiFetch(API_ENDPOINTS.voteComment(comment.id), { method: "POST", body: JSON.stringify({ type: "UPVOTE" }) });
                          toast.success("Voted");
                        } catch (e) { toast.error("Vote failed"); }
                      }} className="text-muted-foreground hover:text-neon">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <span className="font-code text-xs font-bold">{comment.score}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-code text-[11px] text-muted-foreground">
                        <span className="text-neon">@{comment.authorName}</span>
                        <span>•</span>
                        <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        {comment.replyCount > 0 && <span>• {comment.replyCount} replies</span>}
                      </div>
                      <p className="mt-1 text-sm text-foreground">{comment.content}</p>
                      {isLoggedIn && (
                        <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="mt-2 font-code text-[11px] text-muted-foreground hover:text-neon">
                          {replyingTo === comment.id ? "Cancel" : "Reply"}
                        </button>
                      )}
                      {replyingTo === comment.id && (
                        <div className="mt-2 flex gap-2">
                          <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply…"
                            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 font-code text-xs focus:border-neon focus:outline-none" />
                          <button onClick={() => submitReply(comment.id)}
                            className="rounded-lg bg-primary px-3 py-1.5 font-code text-xs text-primary-foreground hover:opacity-90">
                            <Send className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalCommentPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 font-code text-xs">
              <button disabled={commentsPage === 0} onClick={() => setCommentsPage((p) => p - 1)}
                className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon">← prev</button>
              <span className="text-muted-foreground">page {commentsPage + 1} / {totalCommentPages}</span>
              <button disabled={commentsPage >= totalCommentPages - 1} onClick={() => setCommentsPage((p) => p + 1)}
                className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon">next →</button>
            </div>
          )}

          {/* Add comment */}
          <div className="mt-5 rounded-xl border border-border bg-card p-5">
            <h3 className="font-code text-sm font-semibold text-foreground">Add a comment</h3>
            {isLoggedIn ? (
              <>
                <textarea rows={4} value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts or answer…"
                  className="mt-3 w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none" />
                <button onClick={submitComment} disabled={submitting}
                  className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" /> {submitting ? "Posting…" : "Post comment"}
                </button>
              </>
            ) : (
              <p className="mt-3 font-code text-xs text-muted-foreground">
                <Link to="/login" className="text-neon hover:underline">Log in</Link> to comment.
              </p>
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-code text-sm font-semibold text-foreground">Thread Info</h3>
          <dl className="mt-3 space-y-2 font-code text-xs text-muted-foreground">
            <div><dt className="text-[10px] uppercase tracking-wider">Status</dt><dd className="mt-0.5"><StatusBadge status={thread.status} /></dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider">Author</dt><dd className="mt-0.5 text-neon">@{thread.authorName}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider">Posted</dt><dd className="mt-0.5">{new Date(thread.createdAt).toLocaleDateString()}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider">Comments</dt><dd className="mt-0.5">{thread.numberComments}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
