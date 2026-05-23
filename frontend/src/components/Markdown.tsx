import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

export function Markdown({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    mermaid.initialize({ startOnLoad: false, theme: "default" });

    const nodes = containerRef.current?.querySelectorAll<HTMLElement>("[data-mermaid]") || [];
    nodes.forEach((el) => {
      const code = el.getAttribute("data-mermaid") || el.textContent || "";
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      // mermaid.render returns a promise in v8+
      try {
        // @ts-ignore
        const result = mermaid.render(id, code);
        if (result && typeof (result as any).then === "function") {
          (result as any).then((r: any) => {
            el.innerHTML = r.svg ?? r;
          }).catch(() => {
            el.textContent = code;
          });
        } else {
          // synchronous result
          // @ts-ignore
          el.innerHTML = (result as any).svg ?? result;
        }
      } catch (e) {
        el.textContent = code;
      }
    });
  }, [content]);

  return (
    <div ref={containerRef} className="prose-sm max-w-none font-sans text-sm leading-relaxed text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }) => {
            const lang = (className || "").replace("language-", "");
            const codeString = String(children).trim();
            if (lang === "mermaid") {
              return (
                <div className="my-3 overflow-x-auto rounded-lg border border-border bg-surface p-3 font-code text-xs">
                  <div data-mermaid={codeString} />
                </div>
              );
            }

            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-surface p-3 font-code text-xs">
                  <code {...props}>{children}</code>
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
