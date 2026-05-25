import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

export function Markdown({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // No runtime initialization required anymore (mermaid removed)
    return;
  }, [content]);

  return (
    <div ref={containerRef} className="prose-sm max-w-none font-sans text-sm leading-relaxed text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }) => {
            const lang = (className || "").replace("language-", "");
            const codeString = String(children).trim();

            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              let highlighted = "";
              try {
                if (lang && hljs.getLanguage(lang)) {
                  highlighted = hljs.highlight(codeString, { language: lang }).value;
                } else {
                  highlighted = hljs.highlightAuto(codeString).value;
                }
              } catch (e) {
                highlighted = codeString.replace(/</g, "&lt;").replace(/>/g, "&gt;");
              }

              return (
                <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-surface p-3 font-code text-xs">
                  <code className={className} {...props} dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
              );
            }
            return (
              <code className="rounded bg-surface px-1 py-0.5 font-code text-xs text-neon" {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal pl-6">{children}</ol>,
          h1: ({ children }) => <h3 className="mt-3 text-base font-bold">{children}</h3>,
          h2: ({ children }) => <h4 className="mt-3 text-sm font-bold">{children}</h4>,
          a: ({ children, href }) => (
            <a href={href} className="text-neon hover:underline" target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
