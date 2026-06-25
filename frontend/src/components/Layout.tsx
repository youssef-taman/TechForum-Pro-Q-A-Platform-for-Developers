import {Outlet} from "@tanstack/react-router";
import {Navbar} from "@/components/Navbar";
import {Toaster} from "@/components/ui/sonner";
import {Layers3} from "lucide-react";

export function Layout() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 rounded bg-background/90 px-3 py-2 text-sm font-code text-neon"
            >
                Skip to content
            </a>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-neon/10 via-transparent to-transparent" />
            <div className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-neon/8 blur-3xl" />
            <div className="pointer-events-none absolute right-24 top-20 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
            <Navbar />
            <main
                id="main-content"
                className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10"
            >
                <Outlet />
            </main>

            <footer className="relative border-t border-border/70 bg-background/80 backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-neon/40 to-transparent" />
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
                    <nav
                        aria-label="Footer"
                        className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]"
                    >
                        {/* Brand */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon/20 bg-linear-to-br from-neon/15 to-primary/10 text-neon shadow-sm">
                                    <Layers3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-code text-sm font-semibold text-foreground">
                                        TechForum Pro
                                    </p>
                                    <p className="font-code text-[11px] text-muted-foreground">
                                        Developer Q&A platform
                                    </p>
                                </div>
                            </div>
                            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                                A focused workspace for fast answers, cleaner
                                code reviews, and practical knowledge sharing.
                            </p>
                            <div className="flex flex-wrap gap-2 font-code text-[11px] text-muted-foreground">
                                <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                                    Ask
                                </span>
                                <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                                    Review
                                </span>
                                <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                                    Resolve
                                </span>
                            </div>
                        </div>

                        {/* Product */}
                        <div>
                            <p className="font-code text-sm font-semibold text-foreground">
                                Product
                            </p>
                            <ul className="mt-3 space-y-2">
                                <li>
                                    <a
                                        href="/"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Feed
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/ask"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Ask a question
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/tags"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Tag explorer
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Account */}
                        <div>
                            <p className="font-code text-sm font-semibold text-foreground">
                                Account
                            </p>
                            <ul className="mt-3 space-y-2">
                                <li>
                                    <a
                                        href="/profile"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Profile
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/bookmarks"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Bookmarks
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/profile?tab=settings"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Settings
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/login"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Sign in
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <p className="font-code text-sm font-semibold text-foreground">
                                Support
                            </p>
                            <ul className="mt-3 space-y-2">
                                <li>
                                    <a
                                        href="/tags"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Browse tags
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/register"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Create account
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/forgot-password"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Reset password
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/about"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        About us
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/help"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Help center
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/tour"
                                        className="font-code text-xs text-muted-foreground transition-colors hover:text-neon"
                                    >
                                        Tour
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </nav>

                    {/* Bottom bar */}
                    <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 sm:flex-row">
                        <p className="font-code text-[11px] text-muted-foreground">
                            © 2026 TechForum.pro — All rights reserved
                        </p>
                        <div className="flex items-center gap-4">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-code text-[11px] text-muted-foreground transition-colors hover:text-neon"
                                aria-label="GitHub"
                            >
                                GitHub
                            </a>
                            <span className="text-border">·</span>
                            <a
                                href="/tags"
                                className="font-code text-[11px] text-muted-foreground transition-colors hover:text-neon"
                            >
                                Tags
                            </a>
                            <span className="text-border">·</span>
                            <a
                                href="/ask"
                                className="font-code text-[11px] text-muted-foreground transition-colors hover:text-neon"
                            >
                                Ask
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
            <Toaster position="top-right" />
        </div>
    );
}
