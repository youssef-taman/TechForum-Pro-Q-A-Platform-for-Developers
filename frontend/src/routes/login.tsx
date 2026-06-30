import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, HelpCircle, MailCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS, ApiError, type AuthResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — TechForum Pro" }] }),
  component: LoginPage,
});

const schema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  // Inline error shown inside the form card, near the submit button
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    // Clear any previous inline error before each attempt
    setFormError(null);

    try {
      const res = await apiFetch<AuthResponse>(API_ENDPOINTS.login, {
        method: "POST",
        body: JSON.stringify({ identifier: data.identifier, password: data.password }),
      });

      login(res.accessToken, {
        username: res.username,
        email: res.email,
        role: res.role,
      });

      // Success toast is appropriate here — it's a background confirmation
      // after the user has already moved away from the form
      toast.success(`Welcome back, ${res.username}!`);
      await navigate({ to: "/" });
    } catch (err) {
      // Show error inline inside the card, not as a floating toast.
      // Floating toasts violate the HCI proximity principle for form errors:
      // the error should appear near the action that caused it.
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Login failed. Please try again.";
      setFormError(message);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md gap-6 lg:items-center">
      <div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm">

        {/* ── Header ── */}
        <div className="mb-8 text-center">
          <h1 className="font-code text-3xl font-bold tracking-tight">
            <span className="text-muted-foreground">$ </span>login
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Sign in to TechForum Pro
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

          {/* ── Username / Email ── */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="identifier"
              className="font-code text-sm font-medium text-foreground"
            >
              Username or email
            </label>
            <input
              id="identifier"
              {...register("identifier")}
              placeholder="dev@example.com or username"
              autoComplete="username"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
            />
            {errors.identifier && (
              <p className="flex items-center gap-1.5 font-code text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.identifier.message}
              </p>
            )}
          </div>

          {/* ── Password ── */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-code text-sm font-medium text-foreground"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-11 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/40 transition-colors"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1.5 font-code text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* ── Helper links ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 font-code text-xs text-muted-foreground">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1 text-neon hover:underline underline-offset-2"
            >
              <HelpCircle className="h-3 w-3" />
              Forgot password?
            </Link>
            <Link
              to="/verify-email"
              className="inline-flex items-center gap-1 text-neon hover:underline underline-offset-2"
            >
              <MailCheck className="h-3 w-3" />
              Verify email
            </Link>
          </div>

          {/* ── Inline form error ── */}
          {/* Shown directly above the submit button so the user sees it immediately
              without having to look away from the form (HCI proximity principle). */}
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="font-code text-sm text-destructive leading-snug">
                {formError}
              </p>
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg bg-primary py-3 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 active:scale-[0.99] transition-all"
          >
            <span className="inline-flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              {isSubmitting ? "Signing in…" : "Sign in"}
            </span>
          </button>
        </form>

        {/* ── Register link ── */}
        <p className="mt-7 text-center font-code text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="font-semibold text-neon hover:underline underline-offset-2">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
