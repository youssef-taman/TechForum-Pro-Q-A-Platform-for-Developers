import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-code text-xs text-muted-foreground transition-all hover:border-neon hover:text-neon focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Toggle theme"
    >
      <span className="text-muted-foreground/60">theme:</span>
      <span className="text-neon font-semibold">
        "{mounted ? theme : "dark"}"
      </span>
      <span className="absolute -right-1 -top-1 flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon/40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
      </span>
    </button>
  );
}
