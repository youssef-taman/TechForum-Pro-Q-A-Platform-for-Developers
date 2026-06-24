import type {ThreadStatus} from "@/types";

const CONFIG: Record<
    ThreadStatus,
    {style: string; dot: string; label: string}
> = {
    OPEN: {
        style: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
        label: "Open",
    },
    RESOLVED: {
        style: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        dot: "bg-blue-500",
        label: "Resolved",
    },
    CLOSED: {
        style: "border-zinc-400/30 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400",
        dot: "bg-zinc-400",
        label: "Closed",
    },
};

export function StatusBadge({status}: {status: ThreadStatus}) {
    const cfg = CONFIG[status] ?? CONFIG.CLOSED;
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-code text-[10px] font-medium tracking-wide ${cfg.style}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}
