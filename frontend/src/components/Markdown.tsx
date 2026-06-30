import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import { CodeRunner } from "@/components/CodeRunner";
import { decodeQuotedLiteral } from "@/lib/markdown";

type MarkdownProps = {
  content: string;
  // compact   — feed previews, comment bodies: tighter spacing, smaller text
  // reading   — full thread body: comfortable long-form reading size
  // (default) — standard inline rendering, same as before
  compact?: boolean;
  reading?: boolean;
  readOnly?: boolean;
};

function normalizeMarkdownContent(content: string) {
  const decoded = decodeQuotedLiteral(content);
  const trimmed = decoded.trim();
  const unwrapped =
    decoded.includes("\\n") &&
    (trimmed.includes("```") || trimmed.includes("\\n"))
      ? decoded.replace(/\\n/g, "\n")
      : decoded;

  // Normalize indented fences to column 0
  const dedentedFences = unwrapped.replace(/^([ \t]+)(```)/gm, "$2");

  const normalizedBlocks = dedentedFences.replace(
    /```([^\n`]*)(\\n|\n)([\s\S]*?)```/g,
    (_match, language: string, _sep: string, body: string) => {
      return "```" + language + "\n" + body.replace(/\\n/g, "\n") + "\n```";
    },
  );

  return normalizedBlocks
    .split(/(```[\s\S]*?```)/g)
    .map((segment) => {
      if (segment.startsWith("```") && segment.endsWith("```")) {
        return segment;
      }
      return segment
        .split(/\n\n+/)
        .map((paragraph) => paragraph.replace(/\n/g, "  \n"))
        .join("\n\n");
    })
    .join("");
}

export function Markdown({
  content,
  compact = false,
  reading = false,
  readOnly = false,
}: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const normalizedContent = normalizeMarkdownContent(content);

  const runnableLanguages = new Set([
    "javascript", "js", "mjs", "cjs",
    "typescript", "ts", "tsx",
    "python", "py",
  ]);

  useEffect(() => {
    return;
  }, [normalizedContent]);

  // ── Container class ───────────────────────────────────────────────────────
  // Three modes:
  //   compact  — feed cards, comment threads: small, tight
  //   reading  — thread detail body: comfortable reading size + spacing
  //   default  — general use: base size
  const containerClass = compact
    ? "prose-feed max-w-none font-sans text-[13px] leading-relaxed text-foreground/85"
    : reading
    ? "prose-reading max-w-none font-sans"
    : "max-w-none font-sans text-base leading-relaxed text-foreground/90";

  // ── Code block classes ────────────────────────────────────────────────────
  const preClass = compact
    ? "my-2 overflow-x-auto rounded-lg border border-border bg-surface p-3 font-code text-xs leading-relaxed"
    : reading
    ? "my-4 overflow-x-auto rounded-xl border border-border bg-surface p-5 font-code text-sm leading-relaxed shadow-sm"
    : "my-3 overflow-x-auto rounded-lg border border-border bg-surface p-4 font-code text-sm leading-relaxed";

  const inlineCodeClass = compact
    ? "rounded bg-surface px-1.5 py-0.5 font-code text-[11px] text-neon"
    : reading
    ? "rounded-md bg-surface px-1.5 py-0.5 font-code text-[0.9em] text-neon"
    : "rounded bg-surface px-1.5 py-0.5 font-code text-sm text-neon";

  // ── Heading classes ───────────────────────────────────────────────────────
  const h1Class = compact
    ? "mt-2 font-heading text-sm font-bold tracking-tight"
    : reading
    ? "mt-6 font-heading text-xl font-bold tracking-tight text-foreground"
    : "mt-3 font-heading text-base font-bold tracking-tight";

  const h2Class = compact
    ? "mt-2 font-heading text-xs font-bold tracking-tight"
    : reading
    ? "mt-5 font-heading text-lg font-bold tracking-tight text-foreground"
    : "mt-3 font-heading text-sm font-bold tracking-tight";

  const h3Class = compact
    ? "mt-1.5 font-sans text-xs font-semibold"
    : reading
    ? "mt-4 font-sans text-base font-semibold text-foreground"
    : "mt-2 font-sans text-sm font-semibold";

  return (
    <div ref={containerRef} className={containerClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ── Code ────────────────────────────────────────────────────────
          code: ({ className, children, ...props }) => {
            const lang = (className || "").replace("language-", "");
            const codeString = children != null
              ? String(children).replace(/\n$/, "")
              : "";
            const isBlock = /language-/.test(className ?? "");

            if (isBlock) {
              if (runnableLanguages.has(lang.toLowerCase())) {
                return (
                  <CodeRunner
                    code={codeString}
                    language={lang}
                    compact={compact}
                    readOnly={readOnly}
                  />
                );
              }

              let highlighted = "";
              try {
                if (lang && hljs.getLanguage(lang)) {
                  highlighted = hljs.highlight(codeString, { language: lang }).value;
                } else {
                  highlighted = hljs.highlightAuto(codeString).value;
                }
              } catch {
                highlighted = codeString
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");
              }

              return (
                <pre className={preClass}>
                  <code
                    className={className}
                    {...props}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                </pre>
              );
            }

            return (
              <code className={inlineCodeClass} {...props}>
                {children}
              </code>
            );
          },

          // ── Block elements ───────────────────────────────────────────────
          p: ({ children }) => (
            <p className={compact ? "my-1.5" : reading ? "my-3" : "my-2"}>
              {children}
            </p>
          ),

          ul: ({ children }) => (
            <ul
              className={
                compact
                  ? "my-1.5 list-disc pl-5 space-y-0.5"
                  : reading
                  ? "my-3 list-disc pl-6 space-y-1"
                  : "my-2 list-disc pl-6 space-y-0.5"
              }
            >
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol
              className={
                compact
                  ? "my-1.5 list-decimal pl-5 space-y-0.5"
                  : reading
                  ? "my-3 list-decimal pl-6 space-y-1"
                  : "my-2 list-decimal pl-6 space-y-0.5"
              }
            >
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className={reading ? "leading-relaxed" : "leading-normal"}>
              {children}
            </li>
          ),

          // ── Headings ─────────────────────────────────────────────────────
          // Note: h1 in markdown body → rendered as h2 semantically to avoid
          // duplicate h1s on the page (the thread title is already h1).
          h1: ({ children }) => <h2 className={h1Class}>{children}</h2>,
          h2: ({ children }) => <h3 className={h2Class}>{children}</h3>,
          h3: ({ children }) => <h4 className={h3Class}>{children}</h4>,

          // ── Blockquote ───────────────────────────────────────────────────
          blockquote: ({ children }) => (
            <blockquote
              className={
                compact
                  ? "my-2 border-l-2 border-neon/40 pl-3 text-muted-foreground italic"
                  : reading
                  ? "my-4 border-l-4 border-neon/50 pl-4 text-muted-foreground italic leading-relaxed"
                  : "my-3 border-l-2 border-neon/40 pl-3 text-muted-foreground italic"
              }
            >
              {children}
            </blockquote>
          ),

          // ── Horizontal rule ──────────────────────────────────────────────
          hr: () => (
            <hr className="my-4 border-0 border-t border-border/60" />
          ),

          // ── Table ────────────────────────────────────────────────────────
          table: ({ children }) => (
            <div className="my-4 w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),

          thead: ({ children }) => (
            <thead className="bg-surface font-code text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {children}
            </thead>
          ),

          th: ({ children }) => (
            <th className="border-b border-border px-4 py-2.5 text-left">{children}</th>
          ),

          td: ({ children }) => (
            <td className="border-b border-border/50 px-4 py-2.5 last:border-0">{children}</td>
          ),

          // ── Links ────────────────────────────────────────────────────────
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-neon underline underline-offset-2 decoration-neon/40 hover:decoration-neon transition-colors"
              target="_blank"
              rel="noreferrer noopener"
            >
              {children}
            </a>
          ),

          // ── Strong / Em ──────────────────────────────────────────────────
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),

          em: ({ children }) => (
            <em className="italic text-foreground/80">{children}</em>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
