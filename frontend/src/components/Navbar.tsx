import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Code2, MessageSquare, Search, Terminal, GitBranch, User, LogOut } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();
  const [search, setSearch] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/", search: { q: search } });
  };

  const handleLogout = async () => {
    try {
      await apiFetch(API_ENDPOINTS.logout, { method: "POST" });
    } catch {
      // ignore logout API errors
    }
    logout();
    toast.success("Logged out");
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="hidden font-code text-base font-bold tracking-tight text-foreground sm:inline">
            TechForum<span className="text-neon">.pro</span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="relative hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="search"
            placeholder="search questions, tags…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 font-code text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none" />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/"
            className={`hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 font-code text-xs transition-colors lg:inline-flex ${
              location.pathname === "/" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Terminal className="h-3.5 w-3.5" /> Home
          </Link>

          {isLoggedIn && (user?.role?.toUpperCase() === "ADMIN" || user?.role?.toUpperCase() === "MODERATOR") && (
            <Link to="/moderator/queue"
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 font-code text-xs text-muted-foreground transition-colors hover:text-foreground lg:inline-flex">
              <GitBranch className="h-3.5 w-3.5" /> Queue
            </Link>
          )}

          <ThemeToggle />

          <Link to="/ask">
            <Button size="sm" className="font-code text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Ask
            </Button>
          </Link>

          {isLoggedIn ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="font-code text-xs">
                  <User className="h-3.5 w-3.5" /> @{user?.username}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="font-code text-xs text-muted-foreground">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="font-code text-xs">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="font-code text-xs">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
