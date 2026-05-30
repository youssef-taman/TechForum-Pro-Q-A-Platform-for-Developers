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
    Settings,
    Menu,
    X,
    Type,
} from "lucide-react";
import {useState} from "react";
import {ThemeToggle} from "@/components/ThemeToggle";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/lib/auth-context";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {toast} from "sonner";
import {useFontSize} from "@/hooks/use-font-size";

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

const FONT_SIZES = ["sm", "md", "lg", "xl"] as const;

export function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const {user, isLoggedIn, logout} = useAuth();
    const [search, setSearch] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [fontMenuOpen, setFontMenuOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const {size: fontSize, setSize: setFontSize} = useFontSize();

    const role = user?.role?.toUpperCase() ?? "";
    const isPrivileged = role === "ADMIN" || role === "MODERATOR";
    const roleBadge = ROLE_BADGE[role];

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (search.trim()) {
            navigate({to: "/", search: {q: search.trim()}});
            setMobileOpen(false);
        }
    };

    const handleLogout = async () => {
        try {
            await apiFetch(API_ENDPOINTS.logout, {method: "POST"});
        } catch (err) {
            console.warn("Logout request failed, clearing local session anyway:", err);
            toast.error("Logout failed (network)");
        } finally {
            logout();
            toast.success("Logged out");
            await navigate({to: "/"});
            setMobileOpen(false);
        }
    };

    const navLink = (to: string, label: string, Icon: React.ElementType) => (
        <Link
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-code text-sm transition-colors ${
                location.pathname === to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
                <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-6 sm:px-8">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="group flex shrink-0 items-center gap-3"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon/20 bg-neon/10 text-neon shadow-sm transition-all group-hover:scale-105 group-hover:border-neon/35 group-hover:bg-neon/15">
                            <Code2 className="h-5 w-5" />
                        </div>
                        <span className={searchFocused ? "hidden" : "hidden leading-tight sm:inline"}>
                            <span className="block font-code text-base font-bold tracking-tight text-foreground">
                                TechForum<span className="text-neon">.pro</span>
                            </span>
                            <span className="block font-code text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                developer q&a platform
                            </span>
                        </span>
                    </Link>

                    {/* Search (center) */}
                    <form
                        onSubmit={submitSearch}
                        role="search"
                        aria-label="Search threads and tags"
                        className="relative flex-1 min-w-0"
                    >
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            type="search"
                            placeholder="Search questions, tags, users…"
                            aria-label="Search questions, tags or users"
                            className="h-12 w-full rounded-full border border-border bg-surface pl-12 pr-4 font-code text-sm text-foreground placeholder:text-muted-foreground/50 shadow-sm transition-colors focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/20"
                        />
                    </form>

                    {/* Nav links — desktop */}
                    <nav
                        aria-label="Primary"
                        className="ml-2 hidden items-center gap-2 rounded-full border border-border bg-surface/70 p-2 lg:flex"
                    >
                        {navLink("/", "Feed", Terminal)}
                        {isPrivileged &&
                            navLink("/moderator/queue", "Queue", ShieldCheck)}
                        {role === "ADMIN" &&
                            navLink("/admin", "Admin", LayoutDashboard)}
                    </nav>

                    {/* Right actions */}
                    <div className="ml-auto flex items-center gap-3">
                        {/* Font size picker */}
                        <div className="relative hidden sm:block">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setFontMenuOpen((o) => !o)}
                                title="Font size"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <Type className="h-4 w-4" />
                            </Button>
                            {fontMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 z-50 flex items-center gap-1 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                                    {FONT_SIZES.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => {
                                                setFontSize(s);
                                                setFontMenuOpen(false);
                                            }}
                                            className={`rounded-lg px-2.5 py-1 font-code text-xs transition-colors ${
                                                fontSize === s
                                                    ? "bg-neon/15 text-neon border border-neon/30"
                                                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                                            }`}
                                        >
                                            {s.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <ThemeToggle />

                        {/* Ask button */}
                        <Link to="/ask" aria-label="Ask a question">
                            <Button
                                size="sm"
                                className="flex items-center gap-2 rounded-full bg-neon/90 text-black px-4 py-2 shadow-md hover:brightness-95"
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span className={searchFocused ? "hidden" : "hidden font-code text-sm font-semibold sm:inline"}>
                                    Ask
                                </span>
                            </Button>
                        </Link>

                        {isLoggedIn ? (
                            <div className="hidden items-center gap-2 lg:flex">
                                {/* role badge removed from header */}

                                <Link to="/bookmarks" title="Bookmarks">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="font-code text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <BookMarked className="h-5 w-5" />
                                    </Button>
                                </Link>

                                <Link to="/profile" title="Profile & Settings">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 font-code text-sm"
                                    >
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                                            {user?.username
                                                ?.slice(0, 2)
                                                .toUpperCase()}
                                        </div>
                                        <span className="hidden sm:inline">
                                            @{user?.username}
                                        </span>
                                    </Button>
                                </Link>

                                {/* Settings icon removed from header */}

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleLogout}
                                    className="text-muted-foreground hover:text-destructive"
                                    title="Log out"
                                >
                                    <LogOut className="h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="hidden items-center gap-2 lg:flex">
                                <Link to="/login">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="font-code text-sm"
                                    >
                                        Login
                                    </Button>
                                </Link>
                                <Link to="/register">
                                    <Button
                                        size="sm"
                                        className="font-code text-sm"
                                    >
                                        Register
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* Mobile hamburger */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-muted-foreground"
                            onClick={() => setMobileOpen((o) => !o)}
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile nav drawer */}
                {mobileOpen && (
                    <div className="border-t border-border/70 bg-background/95 backdrop-blur-xl lg:hidden">
                        <div className="mx-auto max-w-6xl space-y-1 px-4 py-3">
                            {/* Mobile search */}
                            <form
                                onSubmit={submitSearch}
                                className="relative mb-3"
                            >
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    type="search"
                                    placeholder="Search…"
                                    className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-3 font-code text-sm focus:border-neon focus:outline-none"
                                />
                            </form>

                            {/* Nav links */}
                            <div className="flex flex-col gap-1">
                                {navLink("/", "Feed", Terminal)}
                                {isPrivileged &&
                                    navLink(
                                        "/moderator/queue",
                                        "Mod Queue",
                                        ShieldCheck,
                                    )}
                                {role === "ADMIN" &&
                                    navLink(
                                        "/admin",
                                        "Admin Dashboard",
                                        LayoutDashboard,
                                    )}
                            </div>

                            <div className="my-2 border-t border-border/50" />

                            {/* Font size */}
                            <div className="flex items-center gap-2 px-2.5 py-1.5">
                                <Type className="h-4 w-4 text-muted-foreground" />
                                <span className="font-code text-xs text-muted-foreground mr-2">
                                    Font
                                </span>
                                {FONT_SIZES.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setFontSize(s)}
                                        className={`rounded-lg px-2 py-0.5 font-code text-xs transition-colors ${
                                            fontSize === s
                                                ? "bg-neon/15 text-neon border border-neon/30"
                                                : "text-muted-foreground border border-border"
                                        }`}
                                    >
                                        {s.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            <div className="my-2 border-t border-border/50" />

                            {isLoggedIn ? (
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3 px-2.5 py-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                                            {user?.username
                                                ?.slice(0, 2)
                                                .toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-code text-sm font-medium text-foreground">
                                                @{user?.username}
                                            </p>
                                            {/* role badge removed from mobile drawer */}
                                        </div>
                                    </div>
                                    {navLink(
                                        "/profile",
                                        "Profile & Settings",
                                        User,
                                    )}
                                    {navLink(
                                        "/bookmarks",
                                        "Bookmarks",
                                        BookMarked,
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-code text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <LogOut className="h-4 w-4" /> Log out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {navLink("/login", "Login", User)}
                                    {navLink("/register", "Register", User)}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Close font menu on outside click */}
            {fontMenuOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFontMenuOpen(false)}
                />
            )}
        </>
    );
}