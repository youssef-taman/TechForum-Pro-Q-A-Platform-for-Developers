import {createFileRoute, Link} from "@tanstack/react-router";
import {useEffect, useMemo, useState, useCallback, useRef} from "react";
import {toast} from "sonner";
import {Search, Loader2, UserCog} from "lucide-react";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {useAuth} from "@/lib/auth-context";
import type {User, Page} from "@/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/users")({
    head: () => ({meta: [{title: "User Directory — TechForum Pro Admin"}]}),
    component: UserDirectory,
});

function UserDirectory() {
    const {user, isLoggedIn, login, logout} = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("username-asc");

    const isAdmin = isLoggedIn && user?.role?.toUpperCase() === "ADMIN";
    const PAGE_SIZE = 12;

    const loadUsers = useCallback(async () => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Try a single large page first to avoid many sequential requests.
            const pageSize = 1000;
            const firstPage = await apiFetch<Page<User>>(
                `${API_ENDPOINTS.users}?page=0&size=${pageSize}`,
            );

            const allUsers: User[] = [...firstPage.content];

            if (firstPage.totalPages > 1) {
                // Fetch remaining pages in parallel to speed things up.
                const rest = await Promise.all(
                    Array.from({length: firstPage.totalPages - 1}, (_, i) =>
                        apiFetch<Page<User>>(
                            `${API_ENDPOINTS.users}?page=${i + 1}&size=${pageSize}`,
                        ),
                    ),
                );
                rest.forEach((p) => allUsers.push(...p.content));
            }

            setUsers(allUsers);
        } catch (err) {
            console.error("Failed loading users", err);
            toast.error(err instanceof Error ? err.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
        }, [isAdmin]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        const role = roleFilter.toUpperCase();

        const list = users.filter((u) => {
            const matchesQuery = !term || u.username.toLowerCase().includes(term);
            const matchesRole = roleFilter === "all" || u.role === role;
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && !u.isSuspended) ||
                (statusFilter === "suspended" && u.isSuspended);
            return matchesQuery && matchesRole && matchesStatus;
        });

        list.sort((a, b) => {
            switch (sortBy) {
                case "username-desc":
                    return b.username.localeCompare(a.username);
                case "role": {
                    const weights = {ADMIN: 0, MODERATOR: 1, USER: 2} as const;
                    return weights[a.role] - weights[b.role];
                }
                case "status":
                    return Number(a.isSuspended) - Number(b.isSuspended);
                default:
                    return a.username.localeCompare(b.username);
            }
        });

        return list;
    }, [users, query, roleFilter, statusFilter, sortBy]);

    useEffect(() => {
        setPage(0);
    }, [query, roleFilter, statusFilter, sortBy]);

    const totalElements = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const visibleUsers = filtered.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE,
    );

    const promote = async (id: string) => {
        try {
            await apiFetch(API_ENDPOINTS.promote(id), {
                method: "POST",
                body: JSON.stringify({role: "MODERATOR"}),
            });
            setUsers((prev) =>
                prev.map((u) => (u.id === id ? {...u, role: "MODERATOR"} : u)),
            );
            toast.success("Promoted to MODERATOR");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Action failed");
        }
    };

    const demote = async (id: string) => {
        try {
            await apiFetch(API_ENDPOINTS.demote(id), {method: "POST"});
            setUsers((prev) =>
                prev.map((u) => (u.id === id ? {...u, role: "USER"} : u)),
            );
            toast.success("Demoted to USER");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Action failed");
        }
    };

    const suspend = async (id: string) => {
        try {
            await apiFetch(API_ENDPOINTS.suspend(id), {method: "PATCH"});
            setUsers((prev) =>
                prev.map((u) => (u.id === id ? {...u, isSuspended: true} : u)),
            );
            toast.success("User suspended");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Action failed");
        }
    };

    const unsuspend = async (id: string) => {
        try {
            await apiFetch(API_ENDPOINTS.unsuspend(id), {method: "POST"});
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === id ? {...u, isSuspended: false} : u,
                ),
            );
            toast.success("User unsuspended");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Action failed",
            );
        }
    };

    const removeUser = async (id: string) => {
        if (!confirm("Delete this user permanently?")) return;
        try {
            await apiFetch(API_ENDPOINTS.deleteUser(id), {method: "DELETE"});
            setUsers((prev) => prev.filter((u) => u.id !== id));
            toast.success("User removed");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Action failed");
        }
    };

    const hasFilters =
        query.trim() || roleFilter !== "all" || statusFilter !== "all" || sortBy !== "username-asc";

    // Attempt a one-time automatic rehydrate if the app thinks we're not admin
    const rehydratedRef = useRef<boolean>(false);
    useEffect(() => {
        const tryRehydrate = async () => {
            if (isAdmin) return;
            if (rehydratedRef.current) return;
            const token = localStorage.getItem("tf_access_token");
            const raw = localStorage.getItem("tf_user");
            if (!token || !raw) return;
            try {
                const parsed = JSON.parse(raw);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                login(token, parsed as any);
                try {
                    await apiFetch<Page<User>>(`${API_ENDPOINTS.users}?page=0&size=1`);
                    toast.success("Rehydrated auth from localStorage");
                    loadUsers();
                } catch (err) {
                    logout();
                    console.warn("Stored token validation failed during auto-rehydrate", err);
                }
            } catch (e) {
                console.warn("Auto-rehydrate parse failed", e);
            } finally {
                rehydratedRef.current = true;
            }
        };
        tryRehydrate();
    }, [isAdmin, login, logout, loadUsers, rehydratedRef]);

    if (!isAdmin) {
        return (
            <div className="mx-auto max-w-2xl space-y-4 py-24 text-center">
                <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="font-code text-lg font-semibold text-foreground">
                        Admin access required
                    </h2>
                    <p className="mt-2 font-code text-sm text-muted-foreground">
                        You must be signed in as an administrator to view the user
                        directory. If you are an admin, try reloading the page or
                        signing out and signing in again.
                    </p>
                    <div className="mt-3 text-xs text-muted-foreground">
                        Tip: open DevTools → Console and run
                        <div className="mt-1 inline-block rounded bg-surface px-2 py-1 font-code text-[11px]">
                            JSON.parse(localStorage.getItem("tf_user") || "null")
                        </div>
                    </div>
                    <div className="mt-3 flex flex-col items-center gap-2">
                        <button
                            onClick={() => {
                                try {
                                    console.log(
                                        "tf_user",
                                        JSON.parse(localStorage.getItem("tf_user") || "null"),
                                    );
                                    console.log("tf_access_token", localStorage.getItem("tf_access_token"));
                                    alert("Stored auth dumped to console");
                                } catch (e) {
                                    alert("Failed to read localStorage: " + (e instanceof Error ? e.message : String(e)));
                                }
                            }}
                            className="mt-2 rounded-md border border-border px-3 py-1 text-xs hover:border-neon"
                        >
                            Show stored auth (console)
                        </button>

                        <button
                            onClick={async () => {
                                const token = localStorage.getItem("tf_access_token");
                                const raw = localStorage.getItem("tf_user");
                                if (!token || !raw) {
                                    toast.error("No stored auth found in localStorage");
                                    return;
                                }
                                try {
                                    const parsed = JSON.parse(raw);
                                    // call AuthProvider.login to rehydrate app state
                                    // login expects (token, user)
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    login(token, parsed as any);
                                    // Validate token by calling a lightweight protected endpoint
                                    try {
                                        await apiFetch<Page<User>>(`${API_ENDPOINTS.users}?page=0&size=1`);
                                        toast.success("Rehydrated auth from localStorage");
                                        loadUsers();
                                    } catch (err) {
                                        // Token invalid or expired. Revert and notify.
                                        logout();
                                        toast.error("Stored token is invalid or expired. Please sign in again.");
                                    }
                                } catch (e) {
                                    toast.error("Failed to parse stored user");
                                }
                            }}
                            className="rounded-md border border-neon bg-neon/10 px-3 py-1 text-xs text-neon hover:bg-neon/20"
                        >
                            Use stored auth to sign in
                        </button>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <Link
                            to="/"
                            className="rounded-md border border-border px-3 py-1 text-xs hover:border-neon"
                        >
                            Go home
                        </Link>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-md border border-border px-3 py-1 text-xs hover:border-neon"
                        >
                            Reload page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="font-code text-2xl font-bold">
                    <span className="text-muted-foreground">~/</span>
                    user-directory
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{totalElements} users total</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <div>isLoggedIn: {String(isLoggedIn)}</div>
                    <div>role: {user?.role ?? "(none)"}</div>
                    <button
                        onClick={() => loadUsers()}
                        className="ml-2 rounded-md border border-border px-2 py-1 text-[11px] hover:border-neon"
                    >
                        Reload users
                    </button>
                </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by username…"
                        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 font-code text-xs shadow-sm focus:border-neon focus:outline-none"
                    />
                </div>

                <Select
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MODERATOR">Moderator</SelectItem>
                        <SelectItem value="USER">User</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="username-asc">Username A-Z</SelectItem>
                        <SelectItem value="username-desc">Username Z-A</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between font-code text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                    <UserCog className="h-3.5 w-3.5" />
                    <span>
                        {totalElements} matching users
                    </span>
                </div>
                {hasFilters && (
                    <button
                        onClick={() => {
                            setQuery("");
                            setRoleFilter("all");
                            setStatusFilter("all");
                            setSortBy("username-asc");
                        }}
                        className="rounded-full border border-border px-2.5 py-0.5 hover:border-neon hover:text-neon"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : users.length === 0 ? (
                <div className="mx-auto max-w-2xl py-12">
                    <div className="rounded-xl border border-border bg-card p-6 text-center">
                        <h3 className="font-code text-lg font-semibold text-foreground">No users found</h3>
                        <p className="mt-2 font-code text-sm text-muted-foreground">
                            The server returned no users. This may indicate an empty
                            database or a problem with the API. Try reloading users
                            or check the API endpoint.
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-3">
                            <button
                                onClick={() => loadUsers()}
                                className="rounded-md border border-border px-3 py-1 text-xs hover:border-neon"
                            >
                                Reload users
                            </button>
                            <a
                                href="/api/users?page=0&size=1"
                                className="rounded-md border border-border px-3 py-1 text-xs hover:border-neon"
                            >
                                Open API
                            </a>
                        </div>
                    </div>
                </div>
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
                            {visibleUsers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-12 text-center font-code text-xs text-muted-foreground"
                                    >
                                        No users match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                visibleUsers.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="border-t border-border font-code text-xs"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                                    {u.username.slice(0, 2).toUpperCase()}
                                                </div>
                                                <span>@{u.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px]">
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-full border px-2 py-0.5 font-code text-[10px] ${
                                                    u.isSuspended
                                                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                                                        : "border-green-500/40 bg-green-500/10 text-green-500"
                                                }`}
                                            >
                                                {u.isSuspended ? "suspended" : "active"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1.5">
                                                {u.role === "USER" && (
                                                    <button
                                                        onClick={() => promote(u.id)}
                                                        className="rounded-md border border-blue-500/40 px-2 py-1 text-blue-500 hover:bg-blue-500/10"
                                                    >
                                                        Promote
                                                    </button>
                                                )}
                                                {u.role === "MODERATOR" && (
                                                    <button
                                                        onClick={() => demote(u.id)}
                                                        className="rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-neon hover:text-neon"
                                                    >
                                                        Demote
                                                    </button>
                                                )}
                                                {!u.isSuspended && u.role !== "ADMIN" && (
                                                    <button
                                                        onClick={() => suspend(u.id)}
                                                        className="rounded-md border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10"
                                                    >
                                                        Suspend
                                                    </button>
                                                )}
                                                {u.isSuspended && u.role !== "ADMIN" && (
                                                    <button
                                                        onClick={() => unsuspend(u.id)}
                                                        className="rounded-md border border-emerald-500/40 px-2 py-1 text-emerald-500 hover:bg-emerald-500/10"
                                                    >
                                                        Unsuspend
                                                    </button>
                                                )}
                                                {u.role !== "ADMIN" && (
                                                    <button
                                                        onClick={() => removeUser(u.id)}
                                                        className="rounded-md border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && !loading && (
                <div className="flex items-center justify-center gap-2 font-code text-xs">
                    <button
                        disabled={safePage === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon"
                    >
                        ← prev
                    </button>
                    <span className="text-muted-foreground">
                        page {safePage + 1} / {totalPages}
                    </span>
                    <button
                        disabled={safePage >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:border-neon"
                    >
                        next →
                    </button>
                </div>
            )}
        </div>
    );
}
