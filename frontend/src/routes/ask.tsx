import {Link, createFileRoute, useNavigate} from "@tanstack/react-router";
import {type FormEvent, useEffect, useState} from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Pencil,
  SearchX,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {toast} from "sonner";
import {Markdown} from "../components/Markdown";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  apiFetch,
  clearAuth,
  getToken,
} from "../lib/api";
import {useAuth} from "../lib/auth-context";

export const Route = createFileRoute("/ask" as never)({
  head: () => ({meta: [{title: "Ask a Question — TechForum Pro"}]}),
  component: AskPage,
});

const TITLE_MAX = 150;
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

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

function resolveThreadId(payload: unknown) {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    const threadId = candidate.id ?? candidate.threadId ?? candidate.threadID;

    if (typeof threadId === "string" && threadId.trim()) {
      return threadId.trim();
    }
  }

  return null;
}

function getRequestHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
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
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }
  }

  return response;
}

async function parseResponseBody(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text.trim()) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeDuplicateSuggestions(
  payload: unknown,
): DuplicateSuggestion[] {
  const rawList = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).similarThreads ??
        (payload as Record<string, unknown>).duplicates ??
        (payload as Record<string, unknown>).matches ??
        (payload as Record<string, unknown>).threads ??
        [])
      : [];

  if (!Array.isArray(rawList)) {
    return [];
  }

  return rawList
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const threadId = candidate.threadId ?? candidate.id ?? candidate.threadID;
      const title =
        candidate.title ??
        candidate.threadTitle ??
        candidate.subject ??
        candidate.name;

      if (
        typeof threadId !== "string" ||
        !threadId.trim() ||
        typeof title !== "string" ||
        !title.trim()
      ) {
        return null;
      }

      const author = candidate.author;
      const authorUsername =
        typeof candidate.authorUsername === "string"
          ? candidate.authorUsername
          : author &&
              typeof author === "object" &&
              typeof (author as Record<string, unknown>).username === "string"
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

      const createdAt =
        typeof candidate.createdAt === "string" ? candidate.createdAt : "";

      return {
        threadId: threadId.trim(),
        authorUsername,
        title: title.trim(),
        cosineSimilarityScore,
        createdAt,
      } satisfies DuplicateSuggestion;
    })
    .filter((item): item is DuplicateSuggestion => Boolean(item));
}

// async function postThread(
//   payload: { title: string; body: string; tags: { name: string }[] },
// ): Promise<ThreadRequestResult> {
//   const response = await fetchWithAuth(`${API_ENDPOINTS.threads}`, {
//     method: "POST",
//     body: JSON.stringify(payload),
//   });

//   return {
//     status: response.status,
//     payload: await parseResponseBody(response),
//   };
// }

async function postThread(
  payload: {title: string; body: string; tags: {name: string}[]},
  ignoreDuplicates: boolean = false,
): Promise<ThreadRequestResult> {
  const queryParams = ignoreDuplicates ? "?ignoreDuplicates=true" : "";
  const response = await fetchWithAuth(
    `${API_ENDPOINTS.threads}${queryParams}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return {
    status: response.status,
    payload: await parseResponseBody(response),
  };
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

function AskPage() {
  const navigate = useNavigate();
  const {isLoggedIn} = useAuth();

  const initialDraft = getSavedDraft();

  const [step, setStep] = useState<1 | 2>(initialDraft?.step ?? 1);
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialDraft?.tags ?? []);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>(
    initialDraft?.tagSuggestions ?? [],
  );
  const [duplicateSuggestions, setDuplicateSuggestions] = useState<
    DuplicateSuggestion[]
  >(initialDraft?.duplicateSuggestions ?? []);
  const [duplicateConflict, setDuplicateConflict] = useState(
    initialDraft?.duplicateConflict ?? false,
  );
  const [loadingTags, setLoadingTags] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const threadPayload = {
    title: title.trim(),
    body: body.trim(),
    tags: tags.map((name) => ({name})),
  };

  const titleValid =
    title.trim().length >= 8 && title.trim().length <= TITLE_MAX;
  const bodyValid = body.trim().length >= BODY_MIN;
  const canAnalyze = titleValid && bodyValid;
  const canPostAnyway = duplicateConflict && !reviewLoading && !submitting;

  const addTag = () => {
    const nextTag = normalizeTag(tagInput);
    if (!nextTag || tags.includes(nextTag)) {
      return;
    }

    setTags((current) => [...current, nextTag]);
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  };

  const appendRecommendedTags = (recommendedTags: string[]) => {
    if (recommendedTags.length === 0) {
      return;
    }

    setTags((current) => {
      const next = [...current];

      for (const tag of recommendedTags) {
        const normalized = normalizeTag(tag);
        if (normalized && !next.includes(normalized)) {
          next.push(normalized);
        }
      }

      return next;
    });
  };

  const fetchTagRecommendations = async () => {
    if (!canAnalyze) {
      toast.error(
        "Add a title and body before requesting tag recommendations.",
      );
      return;
    }

    setLoadingTags(true);
    try {
      const suggestions = (await apiFetch(
        API_ENDPOINTS.threadTagRecommendations,
        {
          method: "POST",
          body: JSON.stringify({title: title.trim(), body: body.trim()}),
        },
      )) as string[];

      const normalizedSuggestions = Array.from(
        new Set(
          (suggestions ?? [])
            .map((tag: string) => normalizeTag(tag))
            .filter((tag): tag is string => Boolean(tag)),
        ),
      );

      setTagSuggestions(normalizedSuggestions);
      appendRecommendedTags(normalizedSuggestions);
      toast.success("Tag recommendations ready.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load tag recommendations",
      );
    } finally {
      setLoadingTags(false);
    }
  };

  const checkDuplicateThreads = async () => {
    if (!canAnalyze || reviewLoading) {
      if (!canAnalyze) {
        toast.error("Add a title and body before checking duplicates.");
      }
      return;
    }

    setReviewLoading(true);
    setDuplicateConflict(false);
    setDuplicateSuggestions([]);

    try {
      const [threadResult, suggestionsResult] = await Promise.allSettled([
        // apiFetch(API_ENDPOINTS.threadDuplicateCheck, {
        //   method: "POST",
        //   body: JSON.stringify({title: title.trim(), body: body.trim()}),
        // }),
        apiFetch(API_ENDPOINTS.threadDuplicateCheck, {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            tags: tags.map((name) => ({name})),
          }),
        }),
        apiFetch<string[]>(API_ENDPOINTS.threadTagRecommendations, {
          method: "POST",
          body: JSON.stringify({title: title.trim(), body: body.trim()}),
        }),
      ]);

      if (suggestionsResult.status === "fulfilled") {
        const rawSuggestions = suggestionsResult.value as string[];
        const normalizedSuggestions: string[] = Array.from(
          new Set(
            rawSuggestions
              .map((tag: string) => normalizeTag(tag))
              .filter((tag: string) => Boolean(tag)),
          ),
        );

        setTagSuggestions(normalizedSuggestions);
        appendRecommendedTags(normalizedSuggestions);
      } else {
        toast.error(
          suggestionsResult.reason instanceof Error
            ? suggestionsResult.reason.message
            : "Failed to load tag suggestions",
        );
      }

      if (threadResult.status === "rejected") {
        throw threadResult.reason;
      }

      const conflicts = normalizeDuplicateSuggestions(threadResult.value);
      setDuplicateSuggestions(conflicts);
      setDuplicateConflict(true);

      if (conflicts.length > 0) {
        toast.warning(
          "Potential duplicates found. Review them before posting.",
        );
      } else {
        toast.success("No duplicates found! Ready to post.");
      }

      setStep(2);
      return;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to check duplicates",
      );
    } finally {
      setReviewLoading(false);
    }
  };

  const handleStepOneSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void checkDuplicateThreads();
  };

  const handlePostAnyway = async () => {
    if (!canPostAnyway) {
      return;
    }

    setSubmitting(true);
    try {
      // const result = await postThread(threadPayload);
      const result = await postThread(threadPayload, true);
      if (result.status !== 201) {
        throw new Error(`Unexpected response status: ${result.status}`);
      }

      const threadId = resolveThreadId(result.payload);
      if (!threadId) {
        throw new Error(
          "Question was created, but the response did not include a thread id.",
        );
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success("Question posted!");

      navigate({to: "/questions/$id", params: {id: threadId}});
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to post question",
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setTagSuggestions([]);
    setDuplicateSuggestions([]);
    setDuplicateConflict(false);
  }, [title, body]);

  useEffect(() => {
    if (title.trim() || body.trim() || tags.length > 0) {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          step,
          title: title.trim(),
          body: body.trim(),
          tags,
          tagSuggestions,
          duplicateSuggestions,
          duplicateConflict,
        }),
      );
    }
  }, [step, title, body, tags, tagSuggestions, duplicateSuggestions, duplicateConflict]);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-code text-sm text-muted-foreground">
          You must{" "}
          <Link to="/login" className="text-neon hover:underline">
            log in
          </Link>{" "}
          to ask a question.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-xl border border-border bg-card px-4 py-3 font-code text-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-muted-foreground">~/ask-question</p>
            <p className="mt-1 text-foreground">
              {step === 1
                ? "Step 1 of 2 · Write Question"
                : "Step 2 of 2 · Review Duplicates"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span
              className={`rounded-full border px-2 py-0.5 ${step === 1 ? "border-neon/40 text-neon" : "border-border"}`}
            >
              Write
            </span>
            <span className="text-border">→</span>
            <span
              className={`rounded-full border px-2 py-0.5 ${step === 2 ? "border-neon/40 text-neon" : "border-border"}`}
            >
              Review
            </span>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleStepOneSubmit}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-background/60 px-4 py-3 font-code text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="uppercase tracking-wide text-muted-foreground">
                    composer
                  </p>
                  <p className="mt-1 text-foreground">
                    {step === 1
                      ? "Write the question before duplicate review."
                      : "Duplicates found. Review the matches and adjust tags if needed."}
                  </p>
                </div>
                <div className="text-right">
                  <p>{titleValid ? "title ready" : "title pending"}</p>
                  <p>{bodyValid ? "body ready" : "body pending"}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-code text-xs text-muted-foreground">
                  title
                </label>
                <span className="font-code text-[11px] text-muted-foreground">
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder="How do I optimize a recursive function in TypeScript?"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
              />
              {!titleValid && title.length > 0 && (
                <p className="mt-1 font-code text-[11px] text-destructive">
                  Title must be at least 8 characters
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-code text-xs text-muted-foreground">
                  body (markdown)
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-code text-[11px] text-muted-foreground">
                    {body.length} chars
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPreview((current) => !current)}
                    className="flex items-center gap-1 rounded border border-border px-2 py-0.5 font-code text-[11px] text-muted-foreground hover:border-neon hover:text-neon"
                  >
                    {showPreview ? (
                      <Pencil className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                    {showPreview ? "Edit" : "Preview"}
                  </button>
                </div>
              </div>
              {showPreview ? (
                <div className="min-h-60 rounded-lg border border-border bg-background p-4">
                  {body ? (
                    <Markdown content={body} />
                  ) : (
                    <p className="font-code text-xs text-muted-foreground">
                      Nothing to preview yet…
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe your problem in detail. Use markdown for code blocks…"
                  className="w-full resize-y rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
                />
              )}
              {!bodyValid && body.length > 0 && (
                <p className="mt-1 font-code text-[11px] text-destructive">
                  Body must be at least {BODY_MIN} characters
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="font-code text-xs text-muted-foreground">
                  tags
                </label>
                <button
                  type="button"
                  onClick={fetchTagRecommendations}
                  disabled={loadingTags || !canAnalyze}
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 font-code text-[11px] text-muted-foreground hover:border-neon hover:text-neon disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingTags ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {loadingTags ? "Loading..." : "Recommend Tags"}
                </button>
              </div>

              <div className="rounded-lg border border-input bg-background p-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-md border border-neon/30 bg-neon/10 px-2 py-0.5 font-code text-[11px] text-neon"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="add tag and press Enter…"
                    className="min-w-35 flex-1 bg-transparent px-2 py-1 font-code text-xs focus:outline-none"
                  />
                </div>
              </div>

              {tagSuggestions.length > 0 && (
                <p className="mt-1 font-code text-[11px] text-muted-foreground">
                  AI tags appended: {tagSuggestions.join(", ")}
                </p>
              )}
            </div>

            {step === 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <span className="font-code text-[11px] text-muted-foreground">
                  Add the details, then check for duplicates before posting.
                </span>
                <button
                  type="submit"
                  disabled={!canAnalyze || reviewLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {reviewLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SearchX className="h-3.5 w-3.5" />
                  )}
                  Check Duplicates
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-border px-4 py-2 font-code text-sm text-muted-foreground hover:border-neon hover:text-neon"
                >
                  Back
                </button>

                {duplicateConflict ? (
                  <button
                    type="button"
                    onClick={handlePostAnyway}
                    disabled={!canPostAnyway}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Post Question
                  </button>
                ) : (
                  <span className="font-code text-[11px] text-muted-foreground">
                    Posting is only enabled after a duplicate conflict.
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-code text-[11px] uppercase tracking-wide text-muted-foreground">
              Current state
            </h3>
            <div className="mt-3 space-y-2 font-code text-[11px] text-muted-foreground">
              <p>Title: {titleValid ? "ready" : "needs work"}</p>
              <p>Body: {bodyValid ? "ready" : "needs work"}</p>
              <p>Tags: {tags.length} selected</p>
              <p>
                Mode:{" "}
                {step === 1
                  ? "writing"
                  : duplicateConflict
                    ? "reviewing duplicates"
                    : "review"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-code text-[11px] uppercase tracking-wide text-muted-foreground">
              Review panel
            </h3>
            {reviewLoading ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background p-4 font-code text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-neon" />
                Checking duplicates and appending suggested tags…
              </div>
            ) : step === 2 && duplicateConflict ? (
              duplicateSuggestions.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {duplicateSuggestions.map((duplicate) => (
                    <Link
                      key={duplicate.threadId}
                      to="/questions/$id"
                      params={{id: duplicate.threadId}}
                      className="block rounded-lg border border-border bg-background p-3 transition hover:border-neon/40 hover:bg-background/80"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-code text-sm font-medium text-foreground">
                            {duplicate.title}
                          </p>
                          <p className="mt-1 font-code text-[11px] text-muted-foreground">
                            by @{duplicate.authorUsername}
                          </p>
                        </div>
                        <span className="rounded-full border border-border px-2 py-0.5 font-code text-[10px] text-muted-foreground">
                          {Math.round(
                            (duplicate.cosineSimilarityScore ?? 0) * 100,
                          )}
                          %
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4 font-code text-xs text-green-700 dark:text-green-300">
                  <div className="flex items-center gap-2">
                    {/* <span className="text-sm">✅</span> */}
                    <span>
                      No duplicates found! You can safely post your question.
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="mt-3 rounded-lg border border-border bg-background p-4 font-code text-xs text-muted-foreground">
                {duplicateConflict
                  ? "Duplicates found. Review the matches and decide whether to post anyway."
                  : "Use Step 1 to prepare the draft, then check for duplicates."}
              </div>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
