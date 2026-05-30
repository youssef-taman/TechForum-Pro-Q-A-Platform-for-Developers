import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Eye, Loader2, Pencil, Plus, SearchX, Sparkles, X, Send } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ask")({
  head: () => ({ meta: [{ title: "Ask a Question — TechForum Pro" }] }),
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

function AskPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [duplicateSuggestions, setDuplicateSuggestions] = useState<DuplicateSuggestion[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const previewPayload = {
    title: title.trim(),
    body: body.trim(),
    tags: [],
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const addSuggestedTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || tags.includes(normalized)) return;
    setTags((current) => [...current, normalized]);
  };

  const canAnalyze = title.trim().length >= 8 && body.trim().length >= BODY_MIN;

  const fetchTagRecommendations = async () => {
    if (!canAnalyze) {
      toast.error("Add a title and body before requesting tag recommendations.");
      return;
    }

    setLoadingTags(true);
    try {
      const suggestions = await apiFetch<string[]>(API_ENDPOINTS.threadTagRecommendations, {
        method: "POST",
        body: JSON.stringify(previewPayload),
      });

      setTagSuggestions(
        Array.from(new Set((suggestions ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))),
      );

      toast.success("Tag recommendations ready.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tag recommendations");
    } finally {
      setLoadingTags(false);
    }
  };

  const checkDuplicateThreads = async () => {
    if (!canAnalyze) {
      toast.error("Add a title and body before checking duplicates.");
      return;
    }

    setLoadingDuplicates(true);
    try {
      const matches = await apiFetch<DuplicateSuggestion[]>(API_ENDPOINTS.threadDuplicateCheck, {
        method: "POST",
        body: JSON.stringify(previewPayload),
      });

      setDuplicateSuggestions(matches ?? []);

      if ((matches ?? []).length > 0) {
        toast.warning("Potential duplicates found. Review them before posting.");
      } else {
        toast.success("No close duplicates found.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check duplicates");
    } finally {
      setLoadingDuplicates(false);
    }
  };

  useEffect(() => {
    setTagSuggestions([]);
    setDuplicateSuggestions([]);
  }, [title, body]);

  const titleValid = title.trim().length >= 8 && title.length <= TITLE_MAX;
  const bodyValid = body.trim().length >= BODY_MIN;
  const canSubmit = titleValid && bodyValid && isLoggedIn && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        tags: tags.map((name) => ({ name })),
      };
      const thread = await apiFetch<{ id: string }>(API_ENDPOINTS.threads, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Question posted!");
      navigate({ to: "/questions/$id", params: { id: thread.id } });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to post question",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-code text-sm text-muted-foreground">
          You must <Link to="/login" className="text-neon hover:underline">log in</Link> to ask a question.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="font-code text-2xl font-bold">
          <span className="text-muted-foreground">~/</span>ask-question
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-code text-xs text-muted-foreground">title</label>
              <span className="font-code text-[11px] text-muted-foreground">{title.length}/{TITLE_MAX}</span>
            </div>
            <input type="text" value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="How do I optimize a recursive function in TypeScript?"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none" />
            {!titleValid && title.length > 0 && (
              <p className="mt-1 font-code text-[11px] text-destructive">Title must be at least 8 characters</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-code text-xs text-muted-foreground">body (markdown)</label>
              <div className="flex items-center gap-2">
                <span className="font-code text-[11px] text-muted-foreground">{body.length} chars</span>
                <button type="button" onClick={() => setShowPreview((s) => !s)}
                  className="flex items-center gap-1 rounded border border-border px-2 py-0.5 font-code text-[11px] text-muted-foreground hover:border-neon hover:text-neon">
                  {showPreview ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPreview ? "Edit" : "Preview"}
                </button>
              </div>
            </div>
            {showPreview ? (
              <div className="min-h-60 rounded-lg border border-border bg-background p-4">
                {body ? <Markdown content={body} /> : <p className="font-code text-xs text-muted-foreground">Nothing to preview yet…</p>}
              </div>
            ) : (
              <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Describe your problem in detail. Use markdown for code blocks…"
                className="w-full resize-y rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none" />
            )}
            {!bodyValid && body.length > 0 && (
              <p className="mt-1 font-code text-[11px] text-destructive">Body must be at least {BODY_MIN} characters</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block font-code text-xs text-muted-foreground">tags</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-2">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-md border border-neon/30 bg-neon/10 px-2 py-0.5 font-code text-[11px] text-neon">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="add tag and press Enter…"
                className="min-w-35 flex-1 bg-transparent px-2 py-1 font-code text-xs focus:outline-none" />
            </div>
          </div>

          <button type="submit" disabled={!canSubmit}
            className="w-full rounded-lg bg-primary py-3 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            <span className="inline-flex items-center gap-2">
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Posting…" : "Post Question"}
            </span>
          </button>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-code text-sm font-semibold text-foreground">AI Assist</h2>
          <p className="mt-1 font-code text-[11px] text-muted-foreground">
            Generate tag ideas and scan for similar questions before you submit.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={fetchTagRecommendations}
              disabled={loadingTags || !canAnalyze}
              className="justify-start"
            >
              {loadingTags ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loadingTags ? "Loading tag ideas..." : "Recommend tags"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={checkDuplicateThreads}
              disabled={loadingDuplicates || !canAnalyze}
              className="justify-start"
            >
              {loadingDuplicates ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchX className="h-4 w-4" />}
              {loadingDuplicates ? "Checking duplicates..." : "Check duplicates"}
            </Button>
          </div>

          {tagSuggestions.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-code text-[11px] uppercase tracking-wide text-muted-foreground">Suggested tags</h3>
                <span className="font-code text-[11px] text-muted-foreground">Click to add</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tagSuggestions.map((tag) => {
                  const alreadySelected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addSuggestedTag(tag)}
                      disabled={alreadySelected}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-code text-[11px] transition ${
                        alreadySelected
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                          : "border-neon/30 bg-neon/10 text-neon hover:border-neon hover:bg-neon/15"
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {duplicateSuggestions.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-code text-[11px] uppercase tracking-wide">Potential duplicates</h3>
              </div>
              <div className="mt-3 space-y-2">
                {duplicateSuggestions.map((duplicate) => (
                  <Link
                    key={duplicate.threadId}
                    to="/questions/$id"
                    params={{ id: duplicate.threadId }}
                    className="block rounded-md border border-border bg-background/70 p-3 transition hover:border-neon/40 hover:bg-background"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-code text-sm font-medium text-foreground">{duplicate.title}</p>
                        <p className="mt-1 font-code text-[11px] text-muted-foreground">
                          by @{duplicate.authorUsername}
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-2 py-0.5 font-code text-[10px] text-muted-foreground">
                        {Math.round((duplicate.cosineSimilarityScore ?? 0) * 100)}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-code text-sm font-semibold text-foreground">Preview</h2>
          <div className="mt-3 rounded-lg border border-border bg-background p-4">
            {body ? <Markdown content={body} /> : <p className="font-code text-xs text-muted-foreground">Nothing to preview yet…</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
