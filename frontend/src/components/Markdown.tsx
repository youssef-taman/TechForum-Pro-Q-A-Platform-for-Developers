import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import {CodeRunner} from "@/components/CodeRunner";

type MarkdownProps = {
  content: string;
  compact?: boolean;
  readOnly?: boolean;
};

export function decodeQuotedLiteral(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        return parsed;
      }
    } catch {
      return trimmed.slice(1, -1).replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\"/g, '"');
    }
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\'/g, "'");
  }

  return content;
}

function normalizeMarkdownContent(content: string) {
  const decoded = decodeQuotedLiteral(content);
  const trimmed = decoded.trim();
  const unwrapped = decoded.includes("\\n") && (trimmed.includes("```") || trimmed.includes("\\n"))
    ? decoded.replace(/\\n/g, "\n")
    : decoded;

  const normalizedBlocks = unwrapped.replace(/```([^\n`]*)\\n([\s\S]*?)```/g, (_match, language: string, body: string) => {
    return "```" + language + "\n" + body.replace(/\\n/g, "\n") + "\n```";
  });

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
    readOnly = false,
}: MarkdownProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const normalizedContent = normalizeMarkdownContent(content);
    const runnableLanguages = new Set([
        "javascript",
        "js",
        "mjs",
        "cjs",
        "typescript",
        "ts",
        "tsx",
        "python",
        "py",
    ]);

    useEffect(() => {
        // No runtime initialization required anymore (mermaid removed)
        return;
    }, [normalizedContent]);

    return (
        <div
            ref={containerRef}
            className={
                compact
                    ? "prose-sm max-w-none font-sans text-[13px] leading-relaxed text-foreground/90"
                    : "prose-sm max-w-none font-sans text-sm leading-relaxed text-foreground/90"
            }
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code: ({className, children, ...props}) => {
                        const lang = (className || "").replace("language-", "");
                        const codeString = String(children).replace(/\n$/, "");

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
                                    highlighted = hljs.highlight(codeString, {
                                        language: lang,
                                    }).value;
                                } else {
                                    highlighted =
                                        hljs.highlightAuto(codeString).value;
                                }
                            } catch (e) {
                                highlighted = codeString
                                    .replace(/</g, "&lt;")
                                    .replace(/>/g, "&gt;");
                            }

                            return (
                                <pre
                                    className={
                                        compact
                                            ? "my-2 overflow-x-auto rounded-lg border border-border bg-surface p-2.5 font-code text-[11px]"
                                            : "my-3 overflow-x-auto rounded-lg border border-border bg-surface p-3 font-code text-xs"
                                    }
                                >
                                    <code
                                        className={className}
                                        {...props}
                                        dangerouslySetInnerHTML={{
                                            __html: highlighted,
                                        }}
                                    />
                                </pre>
                            );
                        }
                        return (
                            <code
                                className={
                                    compact
                                        ? "rounded bg-surface px-1 py-0.5 font-code text-[11px] text-neon"
                                        : "rounded bg-surface px-1 py-0.5 font-code text-xs text-neon"
                                }
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    p: ({children}) => (
                        <p className={compact ? "my-1.5" : "my-2"}>
                            {children}
                        </p>
                    ),
                    ul: ({children}) => (
                        <ul
                            className={
                                compact
                                    ? "my-1.5 list-disc pl-5"
                                    : "my-2 list-disc pl-6"
                            }
                        >
                            {children}
                        </ul>
                    ),
                    ol: ({children}) => (
                        <ol
                            className={
                                compact
                                    ? "my-1.5 list-decimal pl-5"
                                    : "my-2 list-decimal pl-6"
                            }
                        >
                            {children}
                        </ol>
                    ),
                    h1: ({children}) => (
                        <h3
                            className={
                                compact
                                    ? "mt-2 text-sm font-bold"
                                    : "mt-3 text-base font-bold"
                            }
                        >
                            {children}
                        </h3>
                    ),
                    h2: ({children}) => (
                        <h4
                            className={
                                compact
                                    ? "mt-2 text-xs font-bold"
                                    : "mt-3 text-sm font-bold"
                            }
                        >
                            {children}
                        </h4>
                    ),
                    a: ({children, href}) => (
                        <a
                            href={href}
                            className="text-neon hover:underline"
                            target="_blank"
                            rel="noreferrer"
                        >
                            {children}
                        </a>
                    ),
                }}
            >
                {normalizedContent}
            </ReactMarkdown>
        </div>
    );
}
