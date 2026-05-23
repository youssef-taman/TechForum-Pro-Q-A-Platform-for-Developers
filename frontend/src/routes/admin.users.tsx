import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "User Directory — TechForum Pro Admin" }] }),
  component: UserDirectory,
});

interface UserDTO { id: string; username: string; role: string; isSuspended: boolean }
interface Page<T> { content: T[]; totalPages: number; number: number; totalElements: number }

function UserDirectory() {
  const { user, isLoggedIn } = useAuth();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");

  useEffect(() => {
    console.log("Current user role:", user?.role);

    if (!isLoggedIn || user?.role?.toUpperCase() !== "ADMIN") { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<Page<UserDTO>>(`${API_ENDPOINTS.users}?page=${page}&size=20`);
        console.log("Data received from backend:", data);
        setUsers(data.content);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isLoggedIn, user?.role, page]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, query]);

  const promote = async (id: string, role: string) => {
    try {
      await apiFetch(API_ENDPOINTS.promote(id), { method: "POST", body: JSON.stringify({ role }) });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
      toast.success(`Promoted to ${role}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
  };

  const demote = async (id: string) => {
    try {
      await apiFetch(API_ENDPOINTS.demote(id), { method: "POST" });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: "USER" } : u));
      toast.success("Demoted to member");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
  };

  const suspend = async (id: string) => {
    try {
      await apiFetch(API_ENDPOINTS.suspend(id), { method: "PATCH" });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isSuspended: true } : u));
      toast.success("User suspended");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
  };

  const removeUser = async (id: string) => {
    if (!confirm("Delete this user permanently?")) return;
    try {
      await apiFetch(API_ENDPOINTS.deleteUser(id), { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User removed");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
  };

  if (!isLoggedIn || user?.role?.toUpperCase() !== "ADMIN") {
    return (
      <div className="py-20 text-center font-code text-sm text-muted-foreground">
        Admin access required. <Link to="/" className="text-neon hover:underline">Go home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-code text-2xl font-bold">
          <span className="text-muted-foreground">~/</span>user-directory
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{users.length} users loaded from backend</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="filter by username…"
          className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 font-code text-xs focus:border-neon focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead className="bg-surface font-code text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border font-code text-xs">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span>@{u.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] capitalize">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 font-code text-[10px] ${
                      u.isSuspended ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-green-500/40 bg-green-500/10 text-green-500"
                    }`}>
                      {u.isSuspended ? "suspended" : "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {u.role !== "ADMIN" && (
                        <button onClick={() => promote(u.id, "MODERATOR")}
                          className="rounded-md border border-blue-500/40 px-2 py-1 text-blue-500 hover:bg-blue-500/10">
                          Promote
                        </button>
                      )}
                      {u.role === "MODERATOR" && (
                        <button onClick={() => demote(u.id)}
                          className="rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-neon hover:text-neon">
                          Demote
                        </button>
                      )}
                      {!u.isSuspended && (
                        <button onClick={() => suspend(u.id)}
                          className="rounded-md border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10">
                          Suspend
                        </button>
                      )}
                      <button onClick={() => removeUser(u.id)}
                        className="rounded-md border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 font-code text-xs">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon">← prev</button>
          <span className="text-muted-foreground">page {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon">next →</button>
        </div>
      )}
    </div>
  );
}
