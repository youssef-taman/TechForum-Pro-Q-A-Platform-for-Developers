import {createFileRoute, Link, Outlet} from "@tanstack/react-router";
import {
    Users,
    MessageSquare,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Loader2,
    LayoutDashboard,
} from "lucide-react";
import {useEffect, useState} from "react";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {useAuth} from "@/lib/auth-context";
import type {Page, Thread, User} from "@/types";
import {toast} from "sonner";

export const Route = createFileRoute("/admin")({
    head: () => ({meta: [{title: "Admin Dashboard — TechForum Pro"}]}),
    component: AdminDashboard,
});

interface Metrics {
    totalUsers: number;
    openThreads: number;
    resolvedThreads: number;
    closedThreads: number;
}

function StatCard({
    icon: Icon,
    label,
    value,
    color = "text-neon",
}: {
    icon: React.ElementType;
    label: string;
    value: number | null;
    color?: string;
}) {
    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${color}`} />
                {value === null && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
            </div>
            <p className={`mt-3 font-code text-2xl font-bold ${color}`}>
                {value !== null ? value.toLocaleString() : "—"}
            </p>
            <p className="mt-0.5 font-code text-xs text-muted-foreground">
                {label}
            </p>
        </div>
    );
}

function AdminDashboard() {
    const {user, isLoggedIn} = useAuth();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = isLoggedIn && user?.role?.toUpperCase() === "ADMIN";

    // FIX: real API calls replacing hardcoded "API" strings
    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }
        const load = async () => {
            setLoading(true);
            try {
                const [usersRes, openRes, resolvedRes, closedRes] =
                    await Promise.all([
                        apiFetch<Page<User>>(
                            `${API_ENDPOINTS.users}?page=0&size=1`,
                        ),
                        apiFetch<Page<Thread>>(
                            `${API_ENDPOINTS.threads}?status=OPEN&page=0&size=1`,
                        ),
                        apiFetch<Page<Thread>>(
                            `${API_ENDPOINTS.threads}?status=RESOLVED&page=0&size=1`,
                        ),
                        apiFetch<Page<Thread>>(
                            `${API_ENDPOINTS.threads}?status=CLOSED&page=0&size=1`,
                        ),
                    ]);
                setMetrics({
                    totalUsers: usersRes.totalElements,
                    openThreads: openRes.totalElements,
                    resolvedThreads: resolvedRes.totalElements,
                    closedThreads: closedRes.totalElements,
                });
            } catch {
                toast.error("Failed to load metrics");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <XCircle className="h-10 w-10 text-destructive/60" />
                <p className="mt-3 font-code text-sm text-muted-foreground">
                    Admin access required.
                </p>
                <Link
                    to="/"
                    className="mt-2 font-code text-xs text-neon hover:underline"
                >
                    ← Go home
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="font-code text-xl font-bold">
                        <span className="text-muted-foreground">~/</span>admin
                    </h1>
                    <p className="font-code text-xs text-muted-foreground">
                        Platform overview
                    </p>
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    icon={Users}
                    label="Total Users"
                    value={loading ? null : (metrics?.totalUsers ?? 0)}
                    color="text-primary"
                />
                <StatCard
                    icon={MessageSquare}
                    label="Open Threads"
                    value={loading ? null : (metrics?.openThreads ?? 0)}
                    color="text-emerald-500"
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Resolved"
                    value={loading ? null : (metrics?.resolvedThreads ?? 0)}
                    color="text-blue-500"
                />
                <StatCard
                    icon={XCircle}
                    label="Closed"
                    value={loading ? null : (metrics?.closedThreads ?? 0)}
                    color="text-muted-foreground"
                />
            </div>

            {/* Quick access */}
            <div>
                <h2 className="mb-3 font-code text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Management
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    {[
                        {
                            to: "/admin/users",
                            label: "User Directory",
                            desc: "Manage roles, suspend or delete users.",
                            icon: Users,
                        },
                        {
                            to: "/moderator/queue",
                            label: "Moderator Queue",
                            desc: "Review closed and flagged threads.",
                            icon: MessageSquare,
                        },
                    ].map(({to, label, desc, icon: Icon}) => (
                        <Link
                            key={to}
                            to={to}
                            className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-neon/40 hover:shadow-md"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
                                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-neon" />
                                </div>
                                <div>
                                    <p className="font-code text-sm font-semibold text-foreground">
                                        {label}
                                    </p>
                                    <p className="mt-0.5 font-code text-xs text-muted-foreground">
                                        {desc}
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-neon" />
                        </Link>
                    ))}
                </div>
            </div>

            <Outlet />
        </div>
    );
}
