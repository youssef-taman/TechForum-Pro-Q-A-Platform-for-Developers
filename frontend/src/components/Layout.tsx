import { Outlet } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

export function Layout() {
  return (
    // <div className="relative min-h-screen bg-background dot-grid-bg">
    <div className="flex min-h-screen flex-col w-full">
      <Navbar />
      {/* <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"> */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      {/* <footer className="border-t border-border bg-background/60 backdrop-blur-sm"> */}
      <footer className="border-t border-border p-4 text-center">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="font-code text-xs text-muted-foreground">
            © 2026 TechForum<span className="text-neon">.pro</span>
          </p>
          <p className="font-code text-xs text-muted-foreground">
            Built for developers, by developers.
          </p>
        </div>
      </footer>
      <Toaster position="top-right" />
    </div>
  );
}
