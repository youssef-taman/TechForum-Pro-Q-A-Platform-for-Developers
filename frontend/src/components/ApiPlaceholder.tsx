import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

type ApiPlaceholderProps = {
  title: string;
  endpoint: string;
  description: string;
  note?: string;
  actions?: Array<{ label: string; endpoint?: string }>;
  className?: string;
};

export function ApiPlaceholder({
  title,
  endpoint,
  description,
  note,
  actions = [],
  className = "",
}: ApiPlaceholderProps) {
  const [copied, setCopied] = useState(false);

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-code text-sm font-semibold text-foreground">{title}</h2>
        <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-code text-[10px] text-neon">
          Spring Boot placeholder
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 rounded-lg border border-border bg-background px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">Base URL</p>
            <p className="mt-1 font-code text-[11px] text-foreground">{API_BASE_URL}</p>
          </div>
          <button
            type="button"
            onClick={copyEndpoint}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-code text-[11px] text-muted-foreground transition-colors hover:border-neon hover:text-neon"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy endpoint"}
          </button>
        </div>
        <div className="mt-3 font-code text-[11px] text-muted-foreground">
          <span className="text-foreground">Endpoint:</span> {endpoint}
        </div>
      </div>
      {note && <p className="mt-3 font-code text-[11px] text-muted-foreground">{note}</p>}
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <span
              key={`${action.label}-${action.endpoint ?? "action"}`}
              className="rounded-md border border-border px-2.5 py-1 font-code text-[11px] text-muted-foreground"
            >
              {action.label}
              {action.endpoint ? ` · ${action.endpoint}` : ""}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}