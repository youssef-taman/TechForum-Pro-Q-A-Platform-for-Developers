import { Outlet, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

export function Layout() {
  return (
    <div className="relative min-h-screen bg-background dot-grid-bg">
      <a href="#main-content" className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 rounded bg-background/90 px-3 py-2 text-sm font-code text-neon">Skip to content</a>
    {/* <div className="flex min-h-screen flex-col w-full"> */}
      <Navbar />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* <main className="flex-1 p-6"> */}
        <Outlet />
      </main>
      <footer className="border-t border-border bg-background/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <nav aria-label="Footer" className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="font-code text-sm font-semibold">TechForum Pro</p>
              <p className="mt-2 font-code text-xs text-muted-foreground">© 2026 TechForum.pro — Built for developers, by developers.</p>
            </div>
            <div>
              <p className="font-code text-sm font-semibold">Company</p>
              <ul className="mt-2 space-y-1">
                <li><a href="/about" className="font-code text-xs text-muted-foreground hover:underline">About</a></li>
                <li><a href="/contact" className="font-code text-xs text-muted-foreground hover:underline">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="font-code text-sm font-semibold">Resources</p>
              <ul className="mt-2 space-y-1">
                <li><a href="/tags" className="font-code text-xs text-muted-foreground hover:underline">Explore tags</a></li>
                <li><a href="/terms" className="font-code text-xs text-muted-foreground hover:underline">Terms</a></li>
                <li><a href="/privacy" className="font-code text-xs text-muted-foreground hover:underline">Privacy</a></li>
              </ul>
            </div>
          </nav>
        </div>
      </footer>
      <Toaster position="top-right" />
    </div>
  );
}
