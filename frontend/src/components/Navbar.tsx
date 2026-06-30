import {Link, useLocation, useNavigate} from "@tanstack/react-router";
import {
  BookMarked,
  Bell,
  BellOff,
  CheckCheck,
  Code2,
  ExternalLink,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  Terminal,
  ThumbsUp,
  Type,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {useRef, useState, useEffect} from "react";
import {ThemeToggle} from "@/components/ThemeToggle";
import {useAuth} from "@/lib/auth-context";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";
import {toast} from "sonner";
import {useFontSize} from "@/hooks/use-font-size";
import {useNotifications} from "@/hooks/useNotifications";

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Notification icon helper ──────────────────────────────────────────────────

function notifIcon(message: string | undefined, type: string | undefined) {
  const msg = (message ?? "").toLowerCase();
  const t = (type ?? "").toLowerCase();
  if (t === "vote" || t === "upvote" || msg.includes("upvoted"))
    return ThumbsUp;
  if (
    t === "reply" ||
    t === "comment" ||
    msg.includes("replied") ||
    msg.includes("commented")
  )
    return MessageSquare;
  return Bell;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {user, isLoggedIn, logout} = useAuth();

  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);

  const fontRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);

  const {size: fontSize, setSize: setFontSize} = useFontSize();

  // ── Notification state via hook ──────────────────────────────────────────
  const {
    notifications,
    unreadCount,
    loading: notiLoading,
    streamConnected,
    refresh: refreshNotifications,
    markOneRead,
    markAllRead,
  } = useNotifications(isLoggedIn);

  const role = user?.role?.toUpperCase() ?? "";
  const isPrivileged = role === "ADMIN" || role === "MODERATOR";
  const roleBadge = ROLE_BADGE[role];
  const avatarLetters = user?.username?.slice(0, 2).toUpperCase() ?? "?";

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fontRef.current && !fontRef.current.contains(e.target as Node))
        setFontOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node))
        setNotiOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  const onToggleNotifications = () => {
    const next = !notiOpen;
    setNotiOpen(next);
    // Refresh the list every time the dropdown opens so it is always current
    if (next) refreshNotifications();
  };

  const openNotification = async (
    id: string,
    link: string | null | undefined,
  ) => {
    // Mark as read first (fire-and-forget is fine; markOneRead is silent on error)
    void markOneRead(id);
    setNotiOpen(false);

    if (link && !link.includes("null") && !link.includes("undefined")) {
      try {
        navigate({to: link as never});
      } catch {
        window.location.href = link;
      }
    }
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = search.trim();
    if (term) {
      try {
        navigate({
          to: "/",
          search: (old) => ({...(old as Record<string, string>), q: term}),
        });
      } catch {
        window.location.href = `/?q=${encodeURIComponent(term)}`;
      }
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch(API_ENDPOINTS.logout, {method: "POST"});
    } catch {
      /* ignore */
    }
    logout();
    toast.success("Logged out");
    navigate({to: "/"});
    setMobileOpen(false);
  };

  // ── Internal components ───────────────────────────────────────────────────

  const NavLink = ({
    to,
    label,
    Icon,
  }: {
    to: string;
    label: string;
    Icon: React.ElementType;
  }) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-code text-sm transition-colors ${
        location.pathname === to
          ? "bg-neon/10 text-neon font-medium"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </Link>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          {/* ── Logo ── */}
          <Link to="/" className="group flex shrink-0 items-center gap-3 mr-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon/25 bg-linear-to-br from-neon/15 to-primary/10 text-neon shadow-sm transition-all group-hover:scale-105 group-hover:from-neon/20 group-hover:to-primary/15">
              <Layers3 className="h-5 w-5" />
            </div>
            <span className="hidden leading-tight sm:inline">
              <span className="block font-code text-base font-bold tracking-tight text-foreground">
                TechForum<span className="text-neon">.pro</span>
              </span>
              <span className="block font-code text-xs uppercase tracking-[0.15em] text-muted-foreground/80">
                dev q&a
              </span>
            </span>
          </Link>

          {/* ── Search ── */}
          <form
            onSubmit={submitSearch}
            className="relative flex-1 min-w-0 max-w-lg"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
              placeholder="Search questions, tags…"
              className="h-9 w-full rounded-full border border-border bg-surface/80 pl-9 pr-4 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/20 transition-colors"
            />
          </form>

          {/* ── Desktop nav pills ── */}
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface/60 px-1 py-1 lg:flex">
            <NavLink to="/" label="Feed" Icon={Terminal} />
            {isPrivileged && (
              <NavLink to="/moderator/queue" label="Queue" Icon={ShieldCheck} />
            )}
            {role === "ADMIN" && (
              <NavLink to="/admin" label="Admin" Icon={LayoutDashboard} />
            )}
          </nav>

          {/* ── Right cluster ── */}
          <div className="ml-auto flex items-center gap-1">
            {/* Font size picker */}
            <div ref={fontRef} className="relative hidden sm:block">
              <button
                onClick={() => setFontOpen((o) => !o)}
                title="Font size"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Type className="h-3.5 w-3.5" />
              </button>
              {fontOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 flex items-center gap-1 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setFontSize(s);
                        setFontOpen(false);
                      }}
                      className={`min-w-8 rounded-lg px-2 py-1 font-code text-xs font-medium transition-colors ${
                        fontSize === s
                          ? "bg-neon/15 text-neon ring-1 ring-neon/30"
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

            {/* ── Notification bell (logged-in only) ── */}
            {isLoggedIn && (
              <div ref={notiRef} className="relative">
                {/* Bell button with unread badge */}
                <button
                  onClick={onToggleNotifications}
                  title="Notifications"
                  aria-label={
                    unreadCount > 0
                      ? `${unreadCount} unread notifications`
                      : "Notifications"
                  }
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    notiOpen
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Bell className="h-4 w-4" />

                  {/* Unread count badge */}
                  {unreadCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-code text-[10px] font-bold leading-none text-destructive-foreground shadow-sm"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}

                  {/* Live stream dot — subtle green pulse when SSE is connected */}
                  {streamConnected && unreadCount === 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background"
                    />
                  )}
                </button>

                {/* ── Dropdown panel ── */}
                {notiOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between border-b border-border bg-surface/50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-code text-sm font-semibold text-foreground">
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-destructive px-1.5 py-0.5 font-code text-[10px] font-bold leading-none text-destructive-foreground">
                            {unreadCount}
                          </span>
                        )}
                        {/* SSE dot — small and unobtrusive, shown only when live */}
                        <span
                          title={
                            streamConnected
                              ? "Live updates active"
                              : "Reconnecting…"
                          }
                          className={`h-1.5 w-1.5 rounded-full transition-colors ${
                            streamConnected
                              ? "bg-green-500"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => void markAllRead()}
                            className="font-code text-[11px] text-neon hover:underline transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                        <Link
                          to="/notifications"
                          onClick={() => setNotiOpen(false)}
                          className="font-code text-[11px] text-muted-foreground hover:text-neon transition-colors"
                        >
                          See all →
                        </Link>
                      </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="max-h-72 overflow-y-auto">
                      {notiLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 font-code text-xs text-muted-foreground">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-neon" />
                          Loading…
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <BellOff className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                          <p className="font-code text-sm text-muted-foreground">
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {notifications.map((n) => {
                            const Icon = notifIcon(n.message, n.type);
                            // Human-readable type label: STATUS_UPDATE → Status update
                            const typeLabel = n.type
                              ? n.type
                                  .replace(/_/g, " ")
                                  .toLowerCase()
                                  .replace(/^\w/, (c) => c.toUpperCase())
                              : null;

                            return (
                              <button
                                key={String(n.id)}
                                type="button"
                                onClick={() =>
                                  void openNotification(n.id, n.link)
                                }
                                className={`group w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface/80 ${
                                  n.isRead ? "" : "bg-neon/[0.03]"
                                }`}
                              >
                                {/* Unread left stripe */}
                                <span
                                  className={`absolute left-0 h-full w-0.5 rounded-r-full transition-colors ${
                                    n.isRead ? "bg-transparent" : "bg-neon/50"
                                  }`}
                                />

                                {/* Icon */}
                                <div
                                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                    n.isRead
                                      ? "bg-surface text-muted-foreground/40"
                                      : "bg-neon/10 text-neon"
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </div>

                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-xs leading-snug ${
                                      n.isRead
                                        ? "text-muted-foreground"
                                        : "font-medium text-foreground"
                                    }`}
                                  >
                                    {n.message}
                                  </p>
                                  <div className="mt-1 flex items-center gap-1.5 font-code text-[10px] text-muted-foreground/70">
                                    <span>{timeAgo(n.createdAt)}</span>
                                    {typeLabel && (
                                      <>
                                        <span className="text-muted-foreground/30">
                                          ·
                                        </span>
                                        <span>{typeLabel}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Arrow — only if there's a link to follow */}
                                {n.link && (
                                  <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/20 group-hover:text-neon transition-colors" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border bg-surface/30 px-4 py-2.5 text-center">
                      <Link
                        to="/notifications"
                        onClick={() => setNotiOpen(false)}
                        className="font-code text-xs text-muted-foreground hover:text-neon transition-colors"
                      >
                        View all notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ask button */}
            <Link
              to="/ask"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-neon/90 px-4 py-2 font-code text-sm font-semibold text-black shadow-sm hover:bg-neon transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Ask
            </Link>

            {isLoggedIn ? (
              <div className="hidden items-center gap-1 lg:flex">
                <Link
                  to="/bookmarks"
                  title="Bookmarks"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <BookMarked className="h-4 w-4" />
                </Link>
                <Link
                  search={{tab: "profile"}}
                  to="/profile"
                  title="Profile"
                  className="flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 pl-1 pr-3 py-1 hover:border-neon/40 transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-code text-xs font-bold text-primary-foreground">
                    {avatarLetters}
                  </div>
                  <span className="font-code text-xs text-foreground">
                    @{user?.username}
                  </span>
                  {roleBadge && (
                    <span
                      className={`rounded-full border px-1.5 py-0.5 font-code text-[10px] font-medium ${roleBadge.cls}`}
                    >
                      {roleBadge.label}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-1.5 lg:flex">
                <Link
                  to="/login"
                  className="rounded-full border border-border px-3.5 py-1.5 font-code text-xs text-muted-foreground hover:border-neon hover:text-foreground transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-primary px-3.5 py-1.5 font-code text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {mobileOpen && (
          <div className="border-t border-border/60 bg-background/97 backdrop-blur-xl lg:hidden">
            <div className="mx-auto max-w-7xl space-y-3 px-4 py-3">
              <form onSubmit={submitSearch} className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-4 font-code text-sm focus:border-neon focus:outline-none"
                />
              </form>

              <div className="flex flex-col gap-0.5">
                <NavLink to="/" label="Feed" Icon={Terminal} />
                {isPrivileged && (
                  <NavLink
                    to="/moderator/queue"
                    label="Mod Queue"
                    Icon={ShieldCheck}
                  />
                )}
                {role === "ADMIN" && (
                  <NavLink to="/admin" label="Admin" Icon={LayoutDashboard} />
                )}
                {isLoggedIn && (
                  <Link
                    to="/notifications"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between rounded-full px-3 py-1.5 font-code text-sm transition-colors ${
                      location.pathname === "/notifications"
                        ? "bg-neon/10 text-neon font-medium"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 shrink-0" />
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-destructive px-1.5 py-0.5 font-code text-[10px] font-bold text-destructive-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                )}
              </div>

              {/* Font size row */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2">
                <Type className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="mr-1 font-code text-xs text-muted-foreground">
                  Font
                </span>
                <div className="flex gap-1">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setFontSize(s)}
                      className={`rounded-md px-2 py-0.5 font-code text-xs transition-colors ${
                        fontSize === s
                          ? "bg-neon/15 text-neon ring-1 ring-neon/30"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/50 pt-2">
                {isLoggedIn ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-code text-[11px] font-bold text-primary-foreground">
                        {avatarLetters}
                      </div>
                      <div>
                        <p className="font-code text-sm font-medium">
                          @{user?.username}
                        </p>
                        {roleBadge && (
                          <span
                            className={`font-code text-[10px] ${roleBadge.cls}`}
                          >
                            {roleBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <NavLink
                      to="/profile"
                      label="Profile & Settings"
                      Icon={User}
                    />
                    <NavLink
                      to="/bookmarks"
                      label="Bookmarks"
                      Icon={BookMarked}
                    />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-1.5 rounded-full px-3 py-1.5 font-code text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Log out
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 rounded-lg border border-border py-2 text-center font-code text-sm text-muted-foreground"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 rounded-lg bg-primary py-2 text-center font-code text-sm font-medium text-primary-foreground"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
