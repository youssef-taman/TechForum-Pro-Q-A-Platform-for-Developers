import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Save,
  SearchX,
  Send,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "../components/Markdown";
import {
  API_ENDPOINTS,
  apiFetch,
  clearAuth,
  getToken,
} from "../lib/api";
import { useAuth } from "../lib/auth-context";

export const Route = createFileRoute("/ask" as never)({
  head: () => ({ meta: [{ title: "Ask a Question — TechForum Pro" }] }),
  component: AskPage,
});

const TITLE_MAX = 150;
const TITLE_MIN = 8;
const BODY_MIN = 30;

type DuplicateSuggestion = {
  threadId: string;
  authorUsername: string;
  title: string;
  cosineSimilarityScore: number;
  createdAt: string;
};

type ThreadRequestResult = {
  status: number;
  payload: unknown;
};

function getSimilarityLabel(score: number): { label: string; color: string; bg: string; border: string; bar: string } {
  if (score >= 0.8) return { label: "Very similar", color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", bar: "bg-red-500" };
  if (score >= 0.5) return { label: "Possibly related", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30", bar: "bg-amber-500" };
  return { label: "Loosely related", color: "text-green-400", bg: "bg-green-500/15", border: "border-green-500/30", bar: "bg-green-500" };
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

function resolveThreadId(payload: unknown) {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    const threadId = candidate.id ?? candidate.threadId ?? candidate.threadID;
    if (typeof threadId === "string" && threadId.trim()) return threadId.trim();
  }
  return null;
}

function getRequestHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getRequestHeaders(),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
  if (response.status === 401 || response.status === 403) {
    clearAuth();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }
  return response;
}

async function parseResponseBody(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try { return JSON.parse(text); } catch { return text; }
  }
  try { return JSON.parse(text); } catch { return text; }
}

function normalizeDuplicateSuggestions(payload: unknown): DuplicateSuggestion[] {
  const rawList = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).similarThreads ??
        (payload as Record<string, unknown>).duplicates ??
        (payload as Record<string, unknown>).matches ??
        (payload as Record<string, unknown>).threads ??
        [])
      : [];
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      const threadId = candidate.threadId ?? candidate.id ?? candidate.threadID;
      const title = candidate.title ?? candidate.threadTitle ?? candidate.subject ?? candidate.name;
      if (typeof threadId !== "string" || !threadId.trim() || typeof title !== "string" || !title.trim()) return null;
      const author = candidate.author;
      const authorUsername =
        typeof candidate.authorUsername === "string"
          ? candidate.authorUsername
          : author && typeof author === "object" && typeof (author as Record<string, unknown>).username === "string"
          ? String((author as Record<string, unknown>).username)
          : typeof candidate.username === "string"
          ? candidate.username
          : "unknown";
      const cosineSimilarityScore =
        typeof candidate.cosineSimilarityScore === "number"
          ? candidate.cosineSimilarityScore
          : typeof candidate.score === "number"
          ? candidate.score
          : 0;
      const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : "";
      return { threadId: threadId.trim(), authorUsername, title: title.trim(), cosineSimilarityScore, createdAt } satisfies DuplicateSuggestion;
    })
    .filter((item): item is DuplicateSuggestion => Boolean(item));
}

async function postThread(
  payload: { title: string; body: string; tags: { name: string }[] },
  ignoreDuplicates = false,
): Promise<ThreadRequestResult> {
  const queryParams = ignoreDuplicates ? "?ignoreDuplicates=true" : "";
  const response = await fetchWithAuth(`${API_ENDPOINTS.threads}${queryParams}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { status: response.status, payload: await parseResponseBody(response) };
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const DRAFT_KEY = "techforum-ask-draft";

function getSavedDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Field validation helpers ────────────────────────────────────────────────

function TitleCounter({ length }: { length: number }) {
  const pct = Math.min((length / TITLE_MAX) * 100, 100);
  const color =
    length < TITLE_MIN && length > 0
      ? "bg-destructive"
      : length >= TITLE_MAX - 10
      ? "bg-amber-500"
      : "bg-neon";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-code text-[11px] tabular-nums text-muted-foreground">
        {length}/{TITLE_MAX}
      </span>
    </div>
  );
}

function BodyCounter({ length }: { length: number }) {
  const met = length >= BODY_MIN;
  return (
    <span className={`font-code text-[11px] tabular-nums transition-colors ${met ? "text-neon" : "text-muted-foreground"}`}>
      {met ? `${length} chars ✓` : `${length}/${BODY_MIN} min`}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

function AskPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const initialDraft = getSavedDraft();

  const [step, setStep] = useState<1 | 2>(initialDraft?.step ?? 1);
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialDraft?.tags ?? []);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>(initialDraft?.tagSuggestions ?? []);
  const [duplicateSuggestions, setDuplicateSuggestions] = useState<DuplicateSuggestion[]>(initialDraft?.duplicateSuggestions ?? []);
  const [reviewDone, setReviewDone] = useState(initialDraft?.reviewDone ?? false);
  const [duplicateCheckFailed, setDuplicateCheckFailed] = useState(initialDraft?.duplicateCheckFailed ?? false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(Boolean(initialDraft));

  const threadPayload = {
    title: title.trim(),
    body: body.trim(),
    tags: tags.map((name) => ({ name })),
  };

  const titleValid = title.trim().length >= TITLE_MIN && title.trim().length <= TITLE_MAX;
  const bodyValid = body.trim().length >= BODY_MIN;
  const canAnalyze = titleValid && bodyValid;
  const canPost = reviewDone && !reviewLoading && !submitting;

  const addTagFromInput = () => {
    const nextTag = normalizeTag(tagInput);
    if (!nextTag || tags.includes(nextTag)) return;
    setTags((c) => [...c, nextTag]);
    setTagInput("");
  };

  const addTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized || tags.includes(normalized)) return;
    setTags((c) => [...c, normalized]);
  };

  const removeTag = (tagToRemove: string) => {
    setTags((c) => c.filter((t) => t !== tagToRemove));
  };

  const fetchTagRecommendations = async () => {
    if (!canAnalyze) return;
    setLoadingTags(true);
    try {
      const suggestions = (await apiFetch(API_ENDPOINTS.threadTagRecommendations, {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      })) as string[];
      const normalized = Array.from(
        new Set((suggestions ?? []).map((t: string) => normalizeTag(t)).filter(Boolean)),
      );
      if (normalized.length === 0) {
        toast.error("No tag suggestions available right now.");
        return;
      }
      setTagSuggestions(normalized);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tag recommendations");
    } finally {
      setLoadingTags(false);
    }
  };

  const checkDuplicateThreads = async () => {
    if (!canAnalyze || reviewLoading) return;
    setReviewLoading(true);
    setReviewDone(false);
    setDuplicateCheckFailed(false);
    setDuplicateSuggestions([]);
    try {
      const [threadResult, suggestionsResult] = await Promise.allSettled([
        apiFetch(API_ENDPOINTS.threadDuplicateCheck, {
          method: "POST",
          body: JSON.stringify({ title: title.trim(), body: body.trim(), tags: tags.map((name) => ({ name })) }),
        }),
        apiFetch<string[]>(API_ENDPOINTS.threadTagRecommendations, {
          method: "POST",
          body: JSON.stringify({ title: title.trim(), body: body.trim() }),
        }),
      ]);
      if (suggestionsResult.status === "fulfilled") {
        const normalized = Array.from(
          new Set((suggestionsResult.value as string[]).map((t: string) => normalizeTag(t)).filter(Boolean)),
        );
        setTagSuggestions(normalized);
      }
      if (threadResult.status === "fulfilled") {
        const conflicts = normalizeDuplicateSuggestions(threadResult.value);
        setDuplicateSuggestions(conflicts);
        setReviewDone(true);
        if (conflicts.length > 0) {
          toast.warning(`${conflicts.length} similar question${conflicts.length > 1 ? "s" : ""} found — review before posting.`);
        } else {
          toast.success("No duplicates found — ready to post.");
        }
      } else {
        setDuplicateCheckFailed(true);
        setReviewDone(true);
        toast.warning("Duplicate check unavailable. You can still post.");
      }
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check duplicates");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleStepOneSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void checkDuplicateThreads();
  };

  const handlePostAnyway = async () => {
    if (!canPost) return;
    setSubmitting(true);
    try {
      const shouldIgnoreDuplicates = duplicateCheckFailed || duplicateSuggestions.length > 0;
      const result = await postThread(threadPayload, shouldIgnoreDuplicates);
      if (result.status !== 201) throw new Error(`Unexpected response status: ${result.status}`);
      const threadId = resolveThreadId(result.payload);
      if (!threadId) throw new Error("Question was created, but the response did not include a thread ID.");
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      toast.success("Question posted!");
      navigate({ to: "/questions/$id", params: { id: threadId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post question");
    } finally {
      setSubmitting(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle("");
    setBody("");
    setTags([]);
    setTagSuggestions([]);
    setDuplicateSuggestions([]);
    setReviewDone(false);
    setDuplicateCheckFailed(false);
    setStep(1);
    setHasDraft(false);
  };

  // Reset review state when content changes
  useEffect(() => {
    setTagSuggestions([]);
    setDuplicateSuggestions([]);
    setReviewDone(false);
    setDuplicateCheckFailed(false);
  }, [title, body]);

  // Persist draft
  useEffect(() => {
    if (title.trim() || body.trim() || tags.length > 0) {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ step, title: title.trim(), body: body.trim(), tags, tagSuggestions, duplicateSuggestions, reviewDone, duplicateCheckFailed }),
      );
      setHasDraft(true);
    }
  }, [step, title, body, tags, tagSuggestions, duplicateSuggestions, reviewDone, duplicateCheckFailed]);

  // ── Unauthenticated guard ─────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
        <p className="font-semibold text-foreground">Sign in to ask a question</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your question reaches the whole community.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Sign in
        </Link>
      </div>
    );
  }

  // ── Step indicator pills ─────────────────────────────────────────────────
  const steps = [
    { id: 1, label: "Write", done: step > 1 },
    { id: 2, label: "Review & post", done: false },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">

      {/* ── Page header + stepper ── */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-code text-xs text-muted-foreground">~/ask-question</p>
            <p className="mt-0.5 font-code text-sm font-semibold text-foreground">
              {step === 1
                ? "Write your question clearly and completely."
                : reviewLoading
                ? "Scanning for similar questions…"
                : duplicateSuggestions.length > 0
                ? "Similar questions found — review before posting."
                : duplicateCheckFailed
                ? "Duplicate check unavailable — review your draft."
                : "Looks great — ready to post."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 font-code text-xs">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors ${
                    step === s.id
                      ? "border-neon/50 bg-neon/10 text-neon"
                      : s.done
                      ? "border-green-500/40 bg-green-500/10 text-green-400"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {s.done ? <Check className="h-3 w-3" /> : <span>{s.id}</span>}
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Draft indicator */}
        {hasDraft && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface/60 px-3 py-2">
            <div className="flex items-center gap-2 font-code text-xs text-muted-foreground">
              <Save className="h-3.5 w-3.5 text-neon" />
              Draft saved automatically
            </div>
            <button
              type="button"
              onClick={clearDraft}
              className="font-code text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Discard draft
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={handleStepOneSubmit}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"
      >
        {/* ── Main composer ── */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-6">

            {/* ── Title ── */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="question-title" className="font-code text-sm font-medium text-foreground">
                  Question title
                </label>
                <TitleCounter length={title.length} />
              </div>
              <input
                id="question-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder="e.g. How do I optimize a recursive function in TypeScript?"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/50 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
                aria-invalid={!titleValid && title.length > 0}
                aria-describedby={!titleValid && title.length > 0 ? "title-error" : undefined}
              />
              {!titleValid && title.length > 0 && (
                <p id="title-error" className="mt-1.5 flex items-center gap-1.5 font-code text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {title.length < TITLE_MIN
                    ? `At least ${TITLE_MIN} characters — be specific`
                    : `Max ${TITLE_MAX} characters`}
                </p>
              )}
              {titleValid && (
                <p className="mt-1.5 flex items-center gap-1.5 font-code text-xs text-neon">
                  <Check className="h-3 w-3 shrink-0" />
                  Title looks good
                </p>
              )}
            </div>

            {/* ── Body ── */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="question-body" className="font-code text-sm font-medium text-foreground">
                  Details
                  <span className="ml-1.5 font-normal text-muted-foreground">(markdown supported)</span>
                </label>
                <div className="flex items-center gap-2.5">
                  <BodyCounter length={body.length} />
                  <button
                    type="button"
                    onClick={() => setShowPreview((c) => !c)}
                    aria-pressed={showPreview}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon transition-colors"
                  >
                    {showPreview ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPreview ? "Edit" : "Preview"}
                  </button>
                </div>
              </div>

              {/* Markdown toolbar */}
              {!showPreview && (
                <div className="mb-1.5 flex items-center gap-1 rounded-t-lg border border-b-0 border-border bg-surface/60 px-2 py-1.5">
                  {[
                    { label: "Bold", syntax: "**bold**" },
                    { label: "Code", syntax: "`code`" },
                    { label: "Block", syntax: "```\ncode block\n```" },
                    { label: "Link", syntax: "[text](url)" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      title={`Insert ${item.label}`}
                      onClick={() => setBody((b) => b + (b.endsWith("\n") || b === "" ? "" : "\n") + item.syntax)}
                      className="rounded px-2 py-0.5 font-code text-[11px] text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
                    >
                      {item.label === "Block" ? <Code2 className="h-3.5 w-3.5" /> : item.label}
                    </button>
                  ))}
                </div>
              )}

              {showPreview ? (
                <div className="min-h-48 rounded-lg border border-border bg-background p-4">
                  {body ? (
                    <Markdown content={body} />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nothing to preview yet…</p>
                  )}
                </div>
              ) : (
                <textarea
                  id="question-body"
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={"Describe your problem in detail.\n\n• What have you tried?\n• What did you expect to happen?\n• What actually happened?\n\nUse ``` for code blocks."}
                  className="w-full resize-y rounded-b-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/50 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
                  aria-invalid={!bodyValid && body.length > 0}
                  aria-describedby={!bodyValid && body.length > 0 ? "body-error" : undefined}
                />
              )}

              {!bodyValid && body.length > 0 && (
                <p id="body-error" className="mt-1.5 flex items-center gap-1.5 font-code text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Add at least {BODY_MIN - body.trim().length} more characters
                </p>
              )}
            </div>

            {/* ── Tags ── */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="tag-input" className="font-code text-sm font-medium text-foreground">
                  Tags
                  <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={fetchTagRecommendations}
                  disabled={loadingTags || !canAnalyze}
                  title="Get AI-powered tag suggestions"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  {loadingTags ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {loadingTags ? "Suggesting…" : "Suggest tags"}
                </button>
              </div>

              <div className="rounded-lg border border-input bg-background p-2 focus-within:border-neon focus-within:ring-2 focus-within:ring-neon/20 transition-colors">
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-md border border-neon/30 bg-neon/10 px-2 py-0.5 font-code text-xs text-neon"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive transition-colors"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addTagFromInput(); }
                      if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                        removeTag(tags[tags.length - 1]);
                      }
                    }}
                    placeholder={tags.length === 0 ? "Type a tag and press Enter…" : ""}
                    className="min-w-32 flex-1 bg-transparent px-2 py-1 font-code text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Tag suggestions */}
              {tagSuggestions.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 font-code text-[11px] text-muted-foreground">AI suggestions — click to add:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        disabled={tags.includes(tag)}
                        className="inline-flex items-center gap-1 rounded-full border border-neon/30 bg-neon/5 px-2.5 py-0.5 font-code text-xs text-neon transition-all hover:bg-neon/15 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="h-3 w-3" />
                        {tag}
                        {tags.includes(tag) && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer actions ── */}
            {step === 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <div className="flex items-center gap-1.5 font-code text-xs text-muted-foreground">
                  {canAnalyze ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-neon" />
                      Ready to scan for duplicates
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" />
                      Fill in title and details first
                    </>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!canAnalyze || reviewLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-all active:scale-[0.98]"
                >
                  {reviewLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SearchX className="h-3.5 w-3.5" />
                  )}
                  {reviewLoading ? "Scanning…" : "Check for duplicates"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-border px-4 py-2.5 font-code text-sm text-muted-foreground hover:border-neon hover:text-neon transition-colors"
                >
                  ← Edit question
                </button>

                {reviewDone ? (
                  <button
                    type="button"
                    onClick={handlePostAnyway}
                    disabled={!canPost}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-all active:scale-[0.98]"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {submitting
                      ? "Posting…"
                      : duplicateSuggestions.length > 0
                      ? "Post anyway"
                      : "Post question"}
                  </button>
                ) : (
                  <span className="font-code text-xs text-muted-foreground">
                    Completing review…
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Sidebar ── */}
        <aside className="space-y-4">

          {/* ── Writing tips ── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-code text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Writing tips
            </h3>
            <ul className="mt-3 space-y-2.5">
              {[
                { tip: "Be specific", detail: "\"React useEffect loop on mount\" beats \"React is broken\"" },
                { tip: "Show your work", detail: "Include what you tried and what you expected" },
                { tip: "Use code blocks", detail: "Wrap code in ``` for syntax highlighting" },
                { tip: "Tag well", detail: "Tags help the right people find your question" },
              ].map(({ tip, detail }) => (
                <li key={tip} className="flex gap-2 text-xs">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neon" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{tip} — </span>
                    {detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Duplicate review ── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-code text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Duplicate check
            </h3>

            {reviewLoading ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background p-3 font-code text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-neon shrink-0" />
                Scanning similar questions…
              </div>
            ) : step === 2 && reviewDone ? (
              <>
                {duplicateCheckFailed && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 font-code text-xs">
                    <div className="flex items-start gap-2 text-amber-600 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Duplicate scanner unavailable. Proceed with care.</span>
                    </div>
                  </div>
                )}

                {!duplicateCheckFailed && duplicateSuggestions.length === 0 && (
                  <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 font-code text-xs">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-300">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      No similar questions found. Go ahead and post!
                    </div>
                  </div>
                )}

                {duplicateSuggestions.length > 0 && (
                  <div className="mt-3 space-y-2.5">
                    <p className="font-code text-xs text-muted-foreground">
                      {duplicateSuggestions.length} potentially similar question{duplicateSuggestions.length > 1 ? "s" : ""}:
                    </p>
                    {duplicateSuggestions.map((dup) => {
                      const sim = getSimilarityLabel(dup.cosineSimilarityScore);
                      return (
                        <Link
                          key={dup.threadId}
                          to="/questions/$id"
                          params={{ id: dup.threadId }}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block rounded-lg border p-3 transition-all hover:shadow-sm ${sim.bg} ${sim.border}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-xs font-medium text-foreground leading-snug">
                              {dup.title}
                            </p>
                            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span className={`font-code text-[10px] ${sim.color}`}>{sim.label}</span>
                            <span className="font-code text-[10px] text-muted-foreground">
                              {formatRelativeTime(dup.createdAt)}
                            </span>
                          </div>
                          {/* Similarity bar */}
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/60">
                            <div
                              className={`h-full rounded-full transition-all ${sim.bar}`}
                              style={{ width: `${Math.round((dup.cosineSimilarityScore ?? 0) * 100)}%` }}
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-border bg-background/50 p-4 text-center font-code text-xs text-muted-foreground">
                {step === 1
                  ? "Complete your question, then click \"Check for duplicates\"."
                  : "Completing duplicate scan…"}
              </div>
            )}
          </div>

          {/* ── Format reference ── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-code text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Markdown quick ref
            </h3>
            <table className="mt-3 w-full font-code text-[11px] text-muted-foreground">
              <tbody className="divide-y divide-border">
                {[
                  ["**bold**", "bold"],
                  ["`inline code`", "code"],
                  ["# Heading", "h1"],
                  ["- item", "list"],
                  ["[text](url)", "link"],
                ].map(([syntax, result]) => (
                  <tr key={syntax}>
                    <td className="py-1 pr-3 text-neon">{syntax}</td>
                    <td className="py-1 text-foreground/60">{result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      </form>
    </div>
  );
}
