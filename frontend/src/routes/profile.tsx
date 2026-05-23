import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, API_ENDPOINTS, clearAuth } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — TechForum Pro" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiFetch(API_ENDPOINTS.logout, { method: "POST" });
    } catch {
      // Ignore — blacklist may fail, still clear client-side
    } finally {
      logout();
      toast.success("Logged out");
      navigate({ to: "/" });
    }
  };

  if (!isLoggedIn || !user) {
    return (
      <div className="py-20 text-center font-code text-sm text-muted-foreground">
        <Link to="/login" className="text-neon hover:underline">Log in</Link> to see your profile.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-code text-2xl font-bold">
        <span className="text-muted-foreground">~/</span>my-profile
      </h1>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-code text-lg font-bold text-primary-foreground">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-code text-base font-semibold">@{user.username}</p>
          <p className="font-code text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 font-code text-[11px]">
            <span className="rounded-full border border-neon/40 bg-neon/10 px-2 py-0.5 text-neon capitalize">{user.role}</span>
          </p>
        </div>
        <button onClick={handleLogout}
          className="ml-auto flex items-center gap-2 rounded-md border border-border px-3 py-1.5 font-code text-xs text-muted-foreground hover:border-destructive hover:text-destructive">
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-code text-sm font-semibold text-foreground">Quick Links</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/bookmarks" className="rounded-md border border-border px-3 py-1.5 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon">
            My Bookmarks
          </Link>
          <Link to="/ask" className="rounded-md border border-border px-3 py-1.5 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon">
            Ask a Question
          </Link>
          {(user.role?.toUpperCase() === "ADMIN" || user.role?.toUpperCase() === "MODERATOR") && (
            <Link to="/moderator/queue" className="rounded-md border border-border px-3 py-1.5 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon">
              Moderator Queue
            </Link>
          )}
          {user.role?.toUpperCase() === "ADMIN" && (
            <Link to="/admin/users" className="rounded-md border border-border px-3 py-1.5 font-code text-xs text-muted-foreground hover:border-neon hover:text-neon">
              Admin: Users
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
