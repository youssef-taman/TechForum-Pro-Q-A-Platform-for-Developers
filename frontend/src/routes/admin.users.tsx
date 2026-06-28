import {createFileRoute} from "@tanstack/react-router";
import {useEffect, useState, useCallback} from "react";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    Loader2,
    ShieldCheck,
    ShieldOff,
    Trash2,
    UserCheck,
    UserX,
} from "lucide-react";
import {toast} from "sonner";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import type {User} from "@/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Page} from "@/types";

type UserSort = "username_asc" | "username_desc" | "role" | "suspended";

export const Route = createFileRoute("/admin/users")({
    head: () => ({meta: [{title: "User Management — Admin"}]}),
    component: AdminUsersPage,
});

function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [userSort, setUserSort] = useState<UserSort>("username_asc");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            const url = `${API_ENDPOINTS.users}?page=${p}&size=20${
                searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ""
            }`;
            const data = await apiFetch<Page<User>>(url);
            let items = data.content;
            items = applyUserSort(items, userSort);
            setUsers(items);
            setTotalPages(data.totalPages ?? 1);
        } catch {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    }, [searchTerm, userSort]);

    useEffect(() => {
        load(page);
    }, [page, load]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(0);
            load(0);
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm, load]);

    // Re-sort on sort change
    useEffect(() => {
        setUsers((prev) => applyUserSort(prev, userSort));
    }, [userSort]);

    function applyUserSort(items: User[], sort: UserSort) {
        const copy = [...items];
        switch (sort) {
            case "username_asc":
                return copy.sort((a, b) => a.username.localeCompare(b.username));
            case "username_desc":
                return copy.sort((a, b) => b.username.localeCompare(a.username));
            case "role":
                return copy.sort((a, b) => a.role.localeCompare(b.role));
            case "suspended":
                return copy.sort((a, b) => Number(b.isSuspended) - Number(a.isSuspended));
            default:
                return copy;
        }
    }

    const withBusy = async (id: string, fn: () => Promise<void>) => {
        setBusyId(id);
        try {
            await fn();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Action failed");
        } finally {
            setBusyId(null);
        }
    };

    const promote = (u: User) =>
        withBusy(u.id, async () => {
            await apiFetch(API_ENDPOINTS.promote(u.id), {
                method: "POST",
                body: JSON.stringify({role: "MODERATOR"}),
            });
            setUsers((prev) =>
                prev.map((x) => (x.id === u.id ? {...x, role: "MODERATOR"} : x)),
            );
            toast.success(`${u.username} promoted to Moderator`);
        });

    const demote = (u: User) =>
        withBusy(u.id, async () => {
            await apiFetch(API_ENDPOINTS.demote(u.id), {method: "POST"});
            setUsers((prev) =>
                prev.map((x) => (x.id === u.id ? {...x, role: "USER"} : x)),
            );
            toast.success(`${u.username} demoted to User`);
        });

    const confirmSuspend = async () => {
        if (!suspendTarget) return;
        const u = suspendTarget;
        setSuspendTarget(null);
        withBusy(u.id, async () => {
            await apiFetch(API_ENDPOINTS.suspend(u.id), {method: "PATCH"});
            setUsers((prev) =>
                prev.map((x) => (x.id === u.id ? {...x, isSuspended: true} : x)),
            );
            toast.success(`${u.username} suspended`);
        });
    };

    const unsuspend = (u: User) =>
        withBusy(u.id, async () => {
            await apiFetch(API_ENDPOINTS.unsuspend(u.id), {method: "PATCH"});
            setUsers((prev) =>
                prev.map((x) => (x.id === u.id ? {...x, isSuspended: false} : x)),
            );
            toast.success(`${u.username} unsuspended`);
        });

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const u = deleteTarget;
        setDeleteTarget(null);
        withBusy(u.id, async () => {
            await apiFetch(API_ENDPOINTS.deleteUser(u.id), {method: "DELETE"});
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
            toast.success(`${u.username} deleted`);
        });
    };

    const ROLE_STYLE: Record<string, string> = {
        ADMIN: "border-rose-500/30 bg-rose-500/10 text-rose-500",
        MODERATOR: "border-amber-500/30 bg-amber-500/10 text-amber-500",
        USER: "border-border bg-surface text-muted-foreground",
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-code text-base font-bold">
                    <span className="text-muted-foreground">~/</span>users
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search users…"
                        className="rounded-lg border border-border bg-surface px-3 py-1.5 font-code text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/20 transition-colors"
                    />
                    <div className="w-44">
                        <Select
                            defaultValue={userSort}
                            onValueChange={(v) => setUserSort(v as UserSort)}
                        >
                            <SelectTrigger className="font-code text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="username_asc">Username ↑</SelectItem>
                                <SelectItem value="username_desc">Username ↓</SelectItem>
                                <SelectItem value="role">Role</SelectItem>
                                <SelectItem value="suspended">Suspended first</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <span className="font-code text-xs text-muted-foreground">
                        {users.length} shown
                    </span>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-neon" />
                </div>
            ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
                    <p className="font-code text-sm text-muted-foreground">No users found</p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="mt-2 font-code text-xs text-neon hover:underline"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <table className="w-full font-code text-sm">
                        <thead className="border-b border-border bg-surface/50">
                            <tr>
                                {["Username", "Email", "Role", "Status", "Actions"].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {users.map((u) => (
                                <tr
                                    key={u.id}
                                    className={`transition-colors hover:bg-surface/40 ${
                                        u.isSuspended ? "opacity-60" : ""
                                    }`}
                                >
                                    <td className="px-4 py-3 font-medium text-foreground">
                                        @{u.username}
                                    </td>
                                    <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground" title={u.email ?? ""}>
                                        {u.email ?? "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                                                ROLE_STYLE[u.role] ?? ROLE_STYLE.USER
                                            }`}
                                        >
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 w-32">
                                        <span className={`inline-flex w-24 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                                            u.isSuspended
                                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        }`}>
                                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${u.isSuspended ? "bg-destructive" : "bg-emerald-500"}`} />
                                            {u.isSuspended ? "Suspended" : "Active"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            {busyId === u.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                            ) : (
                                                <>
                                                    {u.role === "USER" && (
                                                        <button
                                                            onClick={() => promote(u)}
                                                            title="Promote to Moderator"
                                                            className="rounded border border-amber-500/30 bg-amber-500/8 px-2 py-1 text-xs text-amber-600 transition-colors hover:bg-amber-500/15"
                                                        >
                                                            <ShieldCheck className="mr-1 inline h-3 w-3" />
                                                            Promote
                                                        </button>
                                                    )}
                                                    {u.role === "MODERATOR" && (
                                                        <button
                                                            onClick={() => demote(u)}
                                                            title="Demote to User"
                                                            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-neon hover:text-neon"
                                                        >
                                                            <ShieldOff className="mr-1 inline h-3 w-3" />
                                                            Demote
                                                        </button>
                                                    )}
                                                    {u.isSuspended ? (
                                                        <button
                                                            onClick={() => unsuspend(u)}
                                                            title="Unsuspend"
                                                            className="rounded border border-emerald-500/30 bg-emerald-500/8 px-2 py-1 text-xs text-emerald-600 transition-colors hover:bg-emerald-500/15"
                                                        >
                                                            <UserCheck className="mr-1 inline h-3 w-3" />
                                                            Unsuspend
                                                        </button>
                                                    ) : (
                                                        u.role !== "ADMIN" && (
                                                            <button
                                                                onClick={() => setSuspendTarget(u)}
                                                                title="Suspend"
                                                                className="rounded border border-orange-500/30 bg-orange-500/8 px-2 py-1 text-xs text-orange-600 transition-colors hover:bg-orange-500/15"
                                                            >
                                                                <UserX className="mr-1 inline h-3 w-3" />
                                                                Suspend
                                                            </button>
                                                        )
                                                    )}
                                                    {u.role !== "ADMIN" && (
                                                        <button
                                                            onClick={() => setDeleteTarget(u)}
                                                            title="Delete user"
                                                            className="rounded border border-destructive/30 bg-destructive/8 p-1 text-destructive transition-colors hover:bg-destructive/15"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 font-code text-xs">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:border-neon transition-colors"
                    >
                        ← Prev
                    </button>
                    <span className="px-2 py-1.5 text-muted-foreground">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:border-neon transition-colors"
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Suspend confirmation */}
            <AlertDialog
                open={!!suspendTarget}
                onOpenChange={(open) => { if (!open) setSuspendTarget(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Suspend @{suspendTarget?.username}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will lock the account immediately. The user won't be
                            able to log in or access the platform until unsuspended.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSuspend}
                            className="bg-orange-600 text-white hover:bg-orange-700"
                        >
                            Suspend account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete confirmation */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete @{deleteTarget?.username}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently removes the account and all their content.
                            This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
