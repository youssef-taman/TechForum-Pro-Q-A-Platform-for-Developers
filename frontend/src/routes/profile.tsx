import {
    createFileRoute,
    Link,
    useNavigate,
    useSearch,
} from "@tanstack/react-router";
import {useEffect, useState, useRef} from "react";
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
    Settings,
    Type,
    Lock,
    Bell,
    ChevronRight,
    User as UserIcon,
} from "lucide-react";
import {StatusBadge} from "@/components/StatusBadge";
import {Markdown} from "@/components/Markdown";
import type {Thread, Page} from "@/types";
import {RUNTIME_CONFIG} from "@/lib/runtimeConfig";
import {useFontSize, type FontSize} from "@/hooks/use-font-size";

export const Route = createFileRoute("/profile")({
    validateSearch: (search: Record<string, unknown>): {tab?: string} => ({
        tab: typeof search.tab === "string" ? search.tab : undefined,
    }),
    head: () => ({meta: [{title: "My Profile — TechForum Pro"}]}),
    component: ProfilePage,
});

const ROLE_STYLES: Record<string, string> = {
    ADMIN: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    MODERATOR:
        "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    USER: "border-neon/30 bg-neon/10 text-neon",
};

const FONT_SIZES: {value: FontSize; label: string; desc: string}[] = [
    {value: "sm", label: "Small", desc: "13px"},
    {value: "md", label: "Medium", desc: "15px"},
    {value: "lg", label: "Large", desc: "17px"},
    {value: "xl", label: "X-Large", desc: "19px"},
];

function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return `${days}d ago`;
}

/* ─────────────── Settings Section ─────────────── */
function SettingsSection() {
    const {size: fontSize, setSize: setFontSize} = useFontSize();

    // Change password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    // Notification prefs (UI only / localStorage)
    const [notifyReplies, setNotifyReplies] = useState(
        () => localStorage.getItem("tf_notify_replies") !== "false",
    );
    const [notifyMentions, setNotifyMentions] = useState(
        () => localStorage.getItem("tf_notify_mentions") !== "false",
    );

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        setSavingPassword(true);
        try {
            await apiFetch(API_ENDPOINTS.confirmPasswordReset, {
                method: "POST",
                body: JSON.stringify({currentPassword, newPassword}),
            });
            toast.success("Password updated");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to update password",
            );
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Font size */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Type className="h-4 w-4 text-neon" />
                    <h3 className="font-code text-sm font-semibold text-foreground">
                        Font Size
                    </h3>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {FONT_SIZES.map(({value, label, desc}) => (
                        <button
                            key={value}
                            onClick={() => setFontSize(value)}
                            className={`flex flex-col items-center gap-1 rounded-xl border p-3 font-code text-xs transition-all ${
                                fontSize === value
                                    ? "border-neon/40 bg-neon/10 text-neon"
                                    : "border-border text-muted-foreground hover:border-neon/30 hover:text-foreground"
                            }`}
                        >
                            <span className="text-base font-bold">A</span>
                            <span className="text-[10px]">{label}</span>
                            <span className="text-[10px] opacity-60">
                                {desc}
                            </span>
                        </button>
                    ))}
                </div>
                <p className="mt-3 font-code text-[11px] text-muted-foreground">
                    Current:{" "}
                    <span className="text-neon">{fontSize.toUpperCase()}</span>{" "}
                    — affects all text across the app.
                </p>
            </div>

            {/* Change password */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-neon" />
                    <h3 className="font-code text-sm font-semibold text-foreground">
                        Change Password
                    </h3>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div>
                        <label className="mb-1 block font-code text-[11px] text-muted-foreground">
                            Current password
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-code text-sm focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/20"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block font-code text-[11px] text-muted-foreground">
                            New password
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-code text-sm focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/20"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block font-code text-[11px] text-muted-foreground">
                            Confirm new password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-code text-sm focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/20"
                        />
                    </div>
                    <div className="flex justify-end pt-1">
                        <button
                            type="submit"
                            disabled={
                                savingPassword ||
                                !currentPassword ||
                                !newPassword ||
                                !confirmPassword
                            }
                            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
                        >
                            {savingPassword ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            {savingPassword ? "Saving…" : "Update password"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Notification preferences */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-neon" />
                    <h3 className="font-code text-sm font-semibold text-foreground">
                        Notifications
                    </h3>
                    <span className="ml-auto rounded-full border border-border bg-surface px-2 py-0.5 font-code text-[10px] text-muted-foreground">
                        UI only
                    </span>
                </div>
                <div className="space-y-3">
                    {[
                        {
                            label: "Replies to my comments",
                            value: notifyReplies,
                            onChange: (v: boolean) => {
                                setNotifyReplies(v);
                                localStorage.setItem(
                                    "tf_notify_replies",
                                    String(v),
                                );
                            },
                        },
                        {
                            label: "Mentions & direct replies",
                            value: notifyMentions,
                            onChange: (v: boolean) => {
                                setNotifyMentions(v);
                                localStorage.setItem(
                                    "tf_notify_mentions",
                                    String(v),
                                );
                            },
                        },
                    ].map(({label, value, onChange}) => (
                        <label
                            key={label}
                            className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-neon/30"
                        >
                            <span className="font-code text-xs text-foreground">
                                {label}
                            </span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={value}
                                onClick={() => onChange(!value)}
                                className={`relative h-5 w-9 rounded-full border transition-all ${
                                    value
                                        ? "border-neon/40 bg-neon/20"
                                        : "border-border bg-surface"
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 h-4 w-4 rounded-full border transition-all ${
                                        value
                                            ? "left-4 border-neon bg-neon"
                                            : "left-0.5 border-border bg-muted"
                                    }`}
                                />
                            </button>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─────────────── Main Profile Page ─────────────── */
function ProfilePage() {
    const {user, isLoggedIn, logout} = useAuth();
    const navigate = useNavigate();
    const search = useSearch({from: "/profile"});
    const [activeTab, setActiveTab] = useState<"questions" | "settings">(
        search.tab === "settings" ? "settings" : "questions",
    );

    const [myThreads, setMyThreads] = useState<Thread[]>([]);
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [prefetchCache, setPrefetchCache] = useState<Map<number, Thread[]>>(
        new Map(),
    );
    const prefetchCacheRef = useRef(prefetchCache);
    useEffect(() => {
        prefetchCacheRef.current = prefetchCache;
    }, [prefetchCache]);
    const PREFETCH_AHEAD = RUNTIME_CONFIG.PREFETCH_AHEAD;
    const PREFETCH_CACHE_LIMIT = RUNTIME_CONFIG.PREFETCH_CACHE_LIMIT;

    const addToPrefetchCache = useRef((pageNum: number, threads: Thread[]) => {
        setPrefetchCache((prev) => {
            const next = new Map(prev);
            next.set(pageNum, threads);
            while (next.size > PREFETCH_CACHE_LIMIT) {
                const oldestKey = next.keys().next().value as number;
                next.delete(oldestKey);
            }
            return next;
        });
    }).current;

    const handleLogout = async () => {
        try {
            await apiFetch(API_ENDPOINTS.logout, {method: "POST"});
        } catch {
            /* empty */
        }
        logout();
        toast.success("Logged out");
        navigate({to: "/"});
    };

    useEffect(() => {
        if (!isLoggedIn || !user) return;
        let cancelled = false;
        const load = async (p: number) => {
            setLoadingThreads(true);
            try {
                const data = await apiFetch<Page<Thread>>(
                    `${API_ENDPOINTS.userThreads(user.username)}?page=${p}&size=10&sortBy=latest`,
                );
                if (cancelled) return;
                if (p === 0) setMyThreads(data.content);
                else setMyThreads((prev) => [...prev, ...data.content]);
                setTotalPages(data.totalPages ?? 1);

                for (let i = 1; i <= PREFETCH_AHEAD; i++) {
                    const pageToPrefetch = p + i;
                    if (pageToPrefetch >= (data.totalPages ?? 1)) break;
                    if (prefetchCacheRef.current.has(pageToPrefetch)) continue;
                    apiFetch<Page<Thread>>(
                        `${API_ENDPOINTS.userThreads(user.username)}?page=${pageToPrefetch}&size=10&sortBy=latest`,
                    )
                        .then((next) =>
                            addToPrefetchCache(pageToPrefetch, next.content),
                        )
                        .catch(() => {});
                }
            } catch {
                /* ignore */
            } finally {
                if (!cancelled) setLoadingThreads(false);
            }
        };

        load(page);
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, user, page, PREFETCH_AHEAD, addToPrefetchCache]);

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
            {/* Page header */}
            <div className="flex items-center justify-between">
                <h1 className="font-code text-xl font-bold">
                    <span className="text-muted-foreground">~/</span>profile
                </h1>
                <div className="flex items-center gap-1 rounded-full border border-border bg-surface/70 p-1">
                    <button
                        onClick={() => setActiveTab("questions")}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-code text-xs transition-colors ${
                            activeTab === "questions"
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Questions
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-code text-xs transition-colors ${
                            activeTab === "settings"
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                    </button>
                </div>
            </div>

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

            {/* Tab content */}
            {activeTab === "settings" ? (
                <SettingsSection />
            ) : (
                /* My Questions */
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
                                <UserIcon className="mx-auto h-8 w-8 text-muted-foreground/30" />
                                <p className="mt-2 font-code text-xs text-muted-foreground">
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
                                                <StatusBadge
                                                    status={t.status}
                                                />
                                                <span className="font-code text-[10px] text-muted-foreground">
                                                    {t.numberComments} comments
                                                </span>
                                            </div>
                                            <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">
                                                {t.title}
                                            </p>
                                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                                <Markdown
                                                    content={t.body}
                                                    compact
                                                />
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-1 font-code text-[10px] text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {relativeTime(t.createdAt)}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 mt-1" />
                                    </Link>
                                ))}
                                {page < totalPages - 1 && (
                                    <div className="mt-2 flex justify-center">
                                        <button
                                            onClick={() => {
                                                const nextPage = page + 1;
                                                if (
                                                    prefetchCache.has(nextPage)
                                                ) {
                                                    const cached =
                                                        prefetchCache.get(
                                                            nextPage,
                                                        ) ?? [];
                                                    setMyThreads((prev) => [
                                                        ...prev,
                                                        ...cached,
                                                    ]);
                                                    setPrefetchCache((prev) => {
                                                        const copy = new Map(
                                                            prev,
                                                        );
                                                        copy.delete(nextPage);
                                                        return copy;
                                                    });
                                                    setPage(nextPage);
                                                } else {
                                                    setPage(nextPage);
                                                }
                                            }}
                                            className="rounded-md border border-border px-4 py-1 font-code text-xs hover:border-neon"
                                        >
                                            Load more
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
