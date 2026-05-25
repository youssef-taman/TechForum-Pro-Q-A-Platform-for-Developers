import {Link, useLocation, useNavigate} from "@tanstack/react-router";
import {
    Code2,
    MessageSquare,
    Search,
    Terminal,
    ShieldCheck,
    User,
    LogOut,
    BookMarked,
    LayoutDashboard,
} from "lucide-react";
import {useState} from "react";
import {ThemeToggle} from "@/components/ThemeToggle";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/lib/auth-context";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {toast} from "sonner";

const ROLE_BADGE: Record<string, {label: string; cls: string}> = {
    ADMIN: {
        label: "admin",
        cls: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    },
    MODERATOR: {
        label: "mod",
        cls: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    },
    USER: {label: "user", cls: "bg-neon/10 text-neon border-neon/30"},
};

export function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const {user, isLoggedIn, logout} = useAuth();
    const [search, setSearch] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);

    const role = user?.role?.toUpperCase() ?? "";
    const isPrivileged = role === "ADMIN" || role === "MODERATOR";
    const roleBadge = ROLE_BADGE[role];

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (search.trim()) navigate({to: "/", search: {q: search.trim()}});
    };

    const handleLogout = async () => {
        try {
            await apiFetch(API_ENDPOINTS.logout, {method: "POST"});
        } catch (err) {
            console.warn("Logout request failed:", err);
            toast.error("Logout failed (network)");
        }
        // Always clear local auth state even if the server call failed
        logout();
        toast.success("Logged out");
        navigate({to: "/"});
    };

    const navLink = (to: string, label: string, Icon: React.ElementType) => (
        <Link
            to={to}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-code text-xs transition-colors ${
                location.pathname === to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </Link>
    );

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
                {/* Logo */}
                <Link to="/" className="group flex shrink-0 items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all group-hover:scale-105 group-hover:shadow-md">
                        <Code2 className="h-4 w-4" />
                    </div>
                    <span className="hidden font-code text-sm font-bold tracking-tight text-foreground sm:inline">
                        TechForum<span className="text-neon">.pro</span>
                    </span>
                </Link>

                {/* Search */}
                <form
                    onSubmit={submitSearch}
                    className="relative hidden flex-1 max-w-sm md:block"
                >
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        type="search"
                        placeholder="Search questions, tags…"
                        className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 font-code text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/20"
                    />
                </form>

                {/* Nav links — desktop */}
                <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
                    {navLink("/", "Feed", Terminal)}
                    {isPrivileged &&
                        navLink("/moderator/queue", "Queue", ShieldCheck)}
                    {role === "ADMIN" &&
                        navLink("/admin", "Admin", LayoutDashboard)}
                </nav>

                {/* Right actions */}
                <div className="ml-auto flex items-center gap-1.5">
                    <ThemeToggle />

                    <Link to="/ask">
                        <Button
                            size="sm"
                            className="hidden gap-1.5 font-code text-xs sm:flex"
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Ask
                        </Button>
                    </Link>

                    {isLoggedIn ? (
                        <div className="flex items-center gap-1">
                            {/* Role badge */}
                            {roleBadge && (
                                <span
                                    className={`hidden rounded-full border px-2 py-0.5 font-code text-[10px] font-medium lg:inline ${roleBadge.cls}`}
                                >
                                    {roleBadge.label}
                                </span>
                            )}

                            <Link to="/bookmarks">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-code text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <BookMarked className="h-3.5 w-3.5" />
                                </Button>
                            </Link>

                            <Link to="/profile">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 font-code text-xs"
                                >
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                                        {user?.username
                                            ?.slice(0, 2)
                                            .toUpperCase()}
                                    </div>
                                    <span className="hidden sm:inline">
                                        @{user?.username}
                                    </span>
                                </Button>
                            </Link>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="font-code text-xs text-muted-foreground hover:text-destructive"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <Link to="/login">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-code text-xs"
                                >
                                    Login
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm" className="font-code text-xs">
                                    Register
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
