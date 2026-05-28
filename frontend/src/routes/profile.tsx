import {createFileRoute, Link, useNavigate} from "@tanstack/react-router";
import {useEffect, useState} from "react";
import {useAuth} from "@/lib/auth-context";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {toast} from "sonner";
import {
    LogOut,
    Bookmark,
    MessageSquare,
    ShieldCheck,
    LayoutDashboard,
    Loader2,
    Clock,
} from "lucide-react";
import {StatusBadge} from "@/components/StatusBadge";
import type {Thread, Page} from "@/types";

export const Route = createFileRoute("/profile")({
    head: () => ({meta: [{title: "My Profile — TechForum Pro"}]}),
    component: ProfilePage,
});

const ROLE_STYLES: Record<string, string> = {
    ADMIN: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    MODERATOR:
        "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    USER: "border-neon/30 bg-neon/10 text-neon",
};

function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return `${days}d ago`;
}

function ProfilePage() {
    const {user, isLoggedIn, logout} = useAuth();
    const navigate = useNavigate();
    // FIX: fetch user's own threads from GET /threads/user/{username}
    const [myThreads, setMyThreads] = useState<Thread[]>([]);
    const [loadingThreads, setLoadingThreads] = useState(false);

    const handleLogout = async () => {
        try {
            await apiFetch(API_ENDPOINTS.logout, {method: "POST"});
        } catch { /* empty */ }
        logout();
        toast.success("Logged out");
        navigate({to: "/"});
    };

    useEffect(() => {
        if (!isLoggedIn || !user) return;
        setLoadingThreads(true);
        apiFetch<Page<Thread>>(
            `${API_ENDPOINTS.userThreads(user.username)}?page=0&size=10&sortBy=latest`,
        )
            .then((data) => setMyThreads(data.content))
            .catch(() => {})
            .finally(() => setLoadingThreads(false));
    }, [isLoggedIn, user]);

    if (!isLoggedIn || !user) {
        return (
            <div className="py-20 text-center font-code text-sm text-muted-foreground">
                <Link to="/login" className="text-neon hover:underline">
                    Log in
                </Link>{" "}
                to see your profile.
            </div>
        );
    }

    const role = user.role?.toUpperCase() ?? "USER";
    const isPrivileged = role === "ADMIN" || role === "MODERATOR";

    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <h1 className="font-code text-xl font-bold">
                <span className="text-muted-foreground">~/</span>profile
            </h1>

            {/* User card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-code text-lg font-bold text-primary-foreground shadow-md">
                        {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-code text-base font-semibold text-foreground">
                            @{user.username}
                        </p>
                        <p className="font-code text-xs text-muted-foreground truncate">
                            {user.email}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-code text-[10px] font-medium ${ROLE_STYLES[role] ?? ROLE_STYLES.USER}`}
                            >
                                {role}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-code text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                    >
                        <LogOut className="h-3.5 w-3.5" /> Logout
                    </button>
                </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                    {to: "/bookmarks", label: "Bookmarks", icon: Bookmark},
                    {to: "/ask", label: "Ask Question", icon: MessageSquare},
                    ...(isPrivileged
                        ? [
                              {
                                  to: "/moderator/queue",
                                  label: "Mod Queue",
                                  icon: ShieldCheck,
                              },
                          ]
                        : []),
                    ...(role === "ADMIN"
                        ? [
                              {
                                  to: "/admin",
                                  label: "Dashboard",
                                  icon: LayoutDashboard,
                              },
                          ]
                        : []),
                ].map(({to, label, icon: Icon}) => (
                    <Link
                        key={to}
                        to={to}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-center transition-all hover:border-neon/40 hover:bg-surface"
                    >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-code text-[11px] text-muted-foreground">
                            {label}
                        </span>
                    </Link>
                ))}
            </div>

            {/* My Questions — FIX: calls GET /threads/user/{username} */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-3">
                    <h2 className="font-code text-sm font-semibold text-foreground">
                        My Questions
                    </h2>
                </div>
                <div className="p-4">
                    {loadingThreads ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-neon" />
                        </div>
                    ) : myThreads.length === 0 ? (
                        <div className="py-6 text-center">
                            <p className="font-code text-xs text-muted-foreground">
                                No questions yet.
                            </p>
                            <Link
                                to="/ask"
                                className="mt-1 inline-block font-code text-xs text-neon hover:underline"
                            >
                                Ask your first question →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {myThreads.map((t) => (
                                <Link
                                    key={t.id}
                                    to="/questions/$id"
                                    params={{id: t.id}}
                                    search={{author: t.authorName}}
                                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-all hover:border-neon/30"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={t.status} />
                                            <span className="font-code text-[10px] text-muted-foreground">
                                                {t.numberComments} comments
                                            </span>
                                        </div>
                                        <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">
                                            {t.title}
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-1 font-code text-[10px] text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {relativeTime(t.createdAt)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
