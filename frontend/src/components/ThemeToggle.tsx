import {MoonStar, SunMedium} from "lucide-react";
import {useTheme} from "@/hooks/use-theme";

export function ThemeToggle() {
  const {theme, toggleTheme, mounted} = useTheme();
  const isDark = mounted && theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      className="flex items-center gap-3 rounded-full p-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
    >
      <div
        className={`relative h-9 w-16 rounded-full transition-colors duration-300 ease-out ring-1 ring-inset ${
          isDark
            ? "bg-linear-to-r from-slate-800 to-slate-700 ring-slate-700"
            : "bg-linear-to-r from-yellow-100 to-orange-200 ring-yellow-200"
        }`}
      >
        <span
          className={`absolute top-1 left-1 flex h-7 w-7 items-center justify-center rounded-full shadow-md bg-white text-yellow-600 transition-transform duration-300 ease-out transform ${
            isDark ? "translate-x-7 bg-neutral-900 text-sky-300" : "translate-x-0"
          }`}
        >
          {isDark ? (
            <MoonStar className="h-4 w-4" />
          ) : (
            <SunMedium className="h-4 w-4" />
          )}
        </span>
      </div>

      {/* Label removed for compact header — switch-only UI */}
    </button>
  );
}
