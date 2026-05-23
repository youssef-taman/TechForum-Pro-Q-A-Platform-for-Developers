import type { ThreadStatus } from "@/types";

const STYLES: Record<ThreadStatus, string> = {
  open: "border-green-500/40 bg-green-500/10 text-green-500",
  solved: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  closed: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};

export function StatusBadge({ status }: { status: ThreadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-code text-[10px] uppercase tracking-wider ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
