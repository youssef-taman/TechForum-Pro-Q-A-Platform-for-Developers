import { Outlet } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

export function Layout() {
  return (
    <div className="relative min-h-screen bg-background dot-grid-bg">
      <a href="#main-content" className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 rounded bg-background/90 px-3 py-2 text-sm font-code text-neon">Skip to content</a>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-linear-to-b from-neon/10 via-transparent to-transparent" />
      <Navbar />
      <main id="main-content" className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <nav aria-label="Footer" className="grid gap-6 md:grid-cols-[1.3fr_1fr_1fr]">
            <div className="space-y-3">
              <p className="font-code text-sm font-semibold">TechForum Pro</p>
              <p className="max-w-md text-sm text-muted-foreground">
                A focused developer Q&A workspace for fast answers, expert review, and cleaner knowledge sharing.
              </p>
              <p className="font-code text-[11px] text-muted-foreground">
                © 2026 TechForum.pro
              </p>
            </div>
            <div>
              <p className="font-code text-sm font-semibold">Product</p>
              <ul className="mt-2 space-y-1.5">
                <li><a href="/" className="font-code text-xs text-muted-foreground hover:text-neon">Feed</a></li>
                <li><a href="/ask" className="font-code text-xs text-muted-foreground hover:text-neon">Ask a question</a></li>
                <li><a href="/tags" className="font-code text-xs text-muted-foreground hover:text-neon">Tag explorer</a></li>
              </ul>
            </div>
            <div>
              <p className="font-code text-sm font-semibold">Resources</p>
              <ul className="mt-2 space-y-1.5">
                <li><a href="/profile" className="font-code text-xs text-muted-foreground hover:text-neon">Profile</a></li>
                <li><a href="/bookmarks" className="font-code text-xs text-muted-foreground hover:text-neon">Bookmarks</a></li>
                <li><a href="/login" className="font-code text-xs text-muted-foreground hover:text-neon">Sign in</a></li>
              </ul>
            </div>
          </nav>
        </div>
      </footer>
      <Toaster position="top-right" />
    </div>
  );
}
