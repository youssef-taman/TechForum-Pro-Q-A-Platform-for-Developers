import {Link} from "@tanstack/react-router";
import React from "react";

type TagProps = {
  name: string;
  to?: string;
  params?: Record<string, string>;
  compact?: boolean;
  className?: string;
};

export function Tag({
  name,
  to,
  params,
  compact = false,
  className = "",
}: TagProps) {
  const base = compact
    ? "rounded-md border border-border bg-surface px-2 py-0.5 font-code text-[11px] text-muted-foreground transition-colors hover:border-neon/40 hover:text-neon"
    : "rounded-md border border-border bg-surface px-2.5 py-1 font-code text-xs text-muted-foreground transition-colors hover:border-neon/40 hover:text-neon";

  if (to) {
    return (
      <Link to={to} params={params} className={`${base} ${className}`}>
        {name}
      </Link>
    );
  }

  return <span className={`${base} ${className}`}>{name}</span>;
}

export default Tag;
