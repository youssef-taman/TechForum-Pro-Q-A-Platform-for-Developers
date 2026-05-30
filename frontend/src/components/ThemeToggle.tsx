import {MoonStar, SunMedium} from "lucide-react";
import {useTheme} from "@/hooks/use-theme";

export function ThemeToggle() {
  const {theme, toggleTheme, mounted} = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 font-code text-xs text-muted-foreground transition-all hover:border-neon hover:text-neon focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Toggle theme"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-neon shadow-sm transition-colors group-hover:border-neon/50">
        {mounted && theme === "dark" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-muted-foreground/60">theme</span>
        <span className="text-neon font-semibold capitalize">{mounted ? theme : "dark"}</span>
      </span>
      <span className="absolute -right-1 -top-1 flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon/40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
      </span>
    </button>
  );
}
