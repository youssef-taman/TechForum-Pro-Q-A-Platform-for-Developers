import {Link, useLocation, useNavigate} from "@tanstack/react-router";
import {
  Code2,
  Layers3,
  MessageSquare,
  Search,
  Terminal,
  ShieldCheck,
  User,
  LogOut,
  BookMarked,
  LayoutDashboard,
  Menu,
  X,
  Type,
  Bell,
  ThumbsUp,
} from "lucide-react";
import {useState, useRef, useEffect} from "react";
import {ThemeToggle} from "@/components/ThemeToggle";
import {useAuth} from "@/lib/auth-context";
import {apiFetch, API_ENDPOINTS, getToken} from "@/lib/api";
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

// OLD:
// type NotificationItem = {
//     id: string | number;
//     content: string;
//     createdAt: string;
//     isRead?: boolean;
//     url?: string | null;
// };

// NEW:
type NotificationItem = {
  id: string | number;
  message: string; // Changed from 'content' to match backend DTO
  createdAt: string;
  isRead?: boolean;
  link?: string | null; // Changed from 'url' to match backend DTO
};

type NotificationPage = {
  content?: NotificationItem[];
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {user, isLoggedIn, logout} = useAuth();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const fontRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);
  const {size: fontSize, setSize: setFontSize} = useFontSize();

  const role = user?.role?.toUpperCase() ?? "";
  const isPrivileged = role === "ADMIN" || role === "MODERATOR";
  const roleBadge = ROLE_BADGE[role];

  // Close font dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fontRef.current && !fontRef.current.contains(e.target as Node))
        setFontOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node))
        setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    // Notifications temporarily disabled
    return;
    const load = async () => {
      try {
        const data = (await apiFetch(
          `${API_ENDPOINTS.notifications}?page=0&size=20`,
        )) as NotificationPage;
        setNotifications(data.content ?? []);
      } catch {
        /* ignore */
      }
    };
    void load();

    // SSE for real-time notifications
    let es: EventSource | null = null;
    try {
      const token = getToken();
      const url = token
        ? `${API_ENDPOINTS.notificationsStream as string}?access_token=${encodeURIComponent(token)}`
        : (API_ENDPOINTS.notificationsStream as string);
      es = new EventSource(url);
      es.addEventListener("notification", (ev) => {
        try {
          const parsed = JSON.parse(
            (ev as MessageEvent).data,
          ) as NotificationItem;
          setNotifications((prev) => [parsed, ...prev]);
        } catch (error) {
          void error;
        }
      });
    } catch {
      /* ignore */
    }
    return () => {
      if (es) es.close();
    };
  }, [isLoggedIn]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = search.trim();
    if (term) {
      try {
        // use functional search update to merge with existing search params
        navigate({
          to: "/",
          search: (old) => ({
            ...(old as Record<string, string>),
            q: term,
          }),
        });
      } catch {
        // fallback to direct navigation
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const onToggleNotifications = async () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      try {
        const data = (await apiFetch(
          `${API_ENDPOINTS.notifications}?page=0&size=20`,
        )) as NotificationPage;
        setNotifications(data.content ?? []);
      } catch {
        /* ignore */
      }
    }
  };

  const openNotification = async (n: NotificationItem) => {
    // 1. Safely mark as read (don't navigate if it fails)
    try {
      await apiFetch(API_ENDPOINTS.markNotificationRead(String(n.id)), {
        method: "PATCH",
      });
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? {...x, isRead: true} : x)),
      );
    } catch {
      /* ignore */
    }

    // 2. Safely navigate (prevent crashes if link is broken)
    if (n.link && !n.link.includes("null") && !n.link.includes("undefined")) {
      try {
        navigate({ to: n.link as any });
      } catch (err) {
        // Fallback if TanStack Router rejects the route
        window.location.href = n.link;
      }
    }
  };

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

  const avatarLetters = user?.username?.slice(0, 2).toUpperCase() ?? "?";

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
            {/* Font size */}
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

            {/* Notifications */}
            {/* <div ref={notiRef} className="relative"> */}
            <div ref={notiRef} className="relative hidden">

              <button
                onClick={onToggleNotifications}
                title="Notifications"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface/50">
                          <h3 className="font-code text-sm font-semibold text-foreground">Notifications</h3>
                          {unreadCount > 0 && (
                              <button
                                  onClick={async () => {
                                      try {
                                          await apiFetch(API_ENDPOINTS.markAllNotificationsRead, { method: "PATCH" });
                                          setNotifications((prev) => prev.map((n) => ({...n, isRead: true})));
                                      } catch { /* ignore */ }
                                  }}
                                  className="text-[11px] font-code text-neon hover:underline"
                              >
                                  Mark all read
                              </button>
                          )}
                      </div>

                      {/* List */}
                      <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                              <div className="p-6 text-center">
                                  <Bell className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
                                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                              </div>
                          ) : (
                              <div className="divide-y divide-border/50">
                                  {notifications.map((n) => {
                                      // Smart icon selection based on message content
                                      const isVote = n.message?.includes("upvoted") || n.message?.includes("downvoted");
                                      const isReply = n.message?.includes("replied") || n.message?.includes("commented");
                                      const Icon = isVote ? ThumbsUp : isReply ? MessageSquare : Bell;

                                      return (
                                          <button
                                              key={String(n.id)}
                                              onClick={() => openNotification(n)}
                                              className="w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-surface/80 transition-colors"
                                          >
                                              {/* Unread indicator & Icon */}
                                              <div className="pt-0.5 flex flex-col items-center gap-1 w-5">
                                                  {!n.isRead && (
                                                      <span className="h-2 w-2 shrink-0 rounded-full bg-neon shadow-sm shadow-neon/50" />
                                                  )}
                                                  <Icon className={`h-4 w-4 shrink-0 ${n.isRead ? 'text-muted-foreground/40' : 'text-muted-foreground'}`} />
                                              </div>

                                              {/* Content */}
                                              <div className="flex-1 min-w-0">
                                                  <p className={`text-sm leading-snug ${n.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                                                      {n.message}
                                                  </p>
                                                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                                                      {timeAgo(n.createdAt)}
                                                  </p>
                                              </div>
                                          </button>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  </div>
              )}
            </div>

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
              </div>

              {/* Font size row */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2">
                <Type className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-code text-xs text-muted-foreground mr-1">
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
                            className={`text-[10px] font-code ${roleBadge.cls}`}
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
