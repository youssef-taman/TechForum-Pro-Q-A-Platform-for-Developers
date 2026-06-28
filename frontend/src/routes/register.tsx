import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  MailCheck,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS, ApiError, type AuthResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — TechForum Pro" }] }),
  component: RegisterPage,
});

const schema = z
  .object({
    username: z
      .string()
      .min(3, "At least 3 characters")
      .max(30, "Max 30 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onChange" });

  const username = watch("username");
  const passwordValue = watch("password");

  const showRegistrationConflict = (message: string) => {
    const normalized = message.toLowerCase();
    const isDuplicate =
      normalized.includes("already exists") ||
      normalized.includes("already in use") ||
      normalized.includes("duplicate") ||
      normalized.includes("taken") ||
      normalized.includes("conflict");
    if (!isDuplicate) return false;
    const fieldMsg = "This username or email is already registered";
    setError("username", { type: "server", message: fieldMsg });
    setError("email", { type: "server", message: fieldMsg });
    return true;
  };

  const onSubmit = async (data: FormValues) => {
    setFormError(null);
    try {
      const res = await apiFetch<AuthResponse>(API_ENDPOINTS.register, {
        method: "POST",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
        }),
      });
      login(res.accessToken, { username: res.username, email: res.email, role: res.role });
      toast.success("Account created! Welcome to TechForum Pro.");
      await navigate({ to: "/" });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
      if (!showRegistrationConflict(message)) {
        setFormError(message);
      }
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-xl gap-6 lg:items-center">
      <div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm">

        {/* ── Header ── */}
        <div className="mb-8 text-center">
          <h1 className="font-code text-3xl font-bold tracking-tight">
            <span className="text-muted-foreground">$ </span>register
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Create your TechForum Pro account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

          {/* ── Username ── */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="font-code text-sm font-medium text-foreground">
              Username
            </label>
            <input
              id="username"
              {...register("username")}
              placeholder="cooldev42"
              autoComplete="username"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
            />
            {errors.username ? (
              <p className="flex items-center gap-1.5 font-code text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.username.message}
              </p>
            ) : username && username.length >= 3 ? (
              <p className="flex items-center gap-1.5 font-code text-xs text-neon">
                <Check className="h-3 w-3 shrink-0" />
                Looks good
              </p>
            ) : null}
          </div>

          {/* ── Email ── */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-code text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              placeholder="dev@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
            />
            {errors.email ? (
              <p className="flex items-center gap-1.5 font-code text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.email.message}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 font-code text-xs text-muted-foreground">
                <MailCheck className="h-3 w-3 shrink-0" />
                We'll send a verification link to this address
              </p>
            )}
          </div>

          {/* ── Password ── */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-code text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-11 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="flex items-center gap-1.5 font-code text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.password.message}
              </p>
            ) : passwordValue && passwordValue.length >= 8 ? (
              <p className="flex items-center gap-1.5 font-code text-xs text-neon">
                <Check className="h-3 w-3 shrink-0" />
                Password meets requirements
              </p>
            ) : null}
          </div>

          {/* ── Confirm Password ── */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="font-code text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={show ? "text" : "password"}
              {...register("confirmPassword")}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
            />
            {errors.confirmPassword ? (
              <p className="flex items-center gap-1.5 font-code text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          {/* ── Inline form error ── */}
          {formError && (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="font-code text-sm text-destructive leading-snug">{formError}</p>
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg bg-primary py-3 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 active:scale-[0.99] transition-all"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <UserPlus className="h-4 w-4" />
              {isSubmitting ? "Creating account…" : "Create account"}
            </span>
          </button>
        </form>

        {/* ── Account safety notice ── */}
        <div className="mt-6 rounded-lg border border-border bg-surface/60 p-4 font-code text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-neon shrink-0" />
            Account safety
          </div>
          <p className="mt-1.5 leading-relaxed">
            Email verification and password recovery are available below. We recommend verifying your email after signing up.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link to="/verify-email" className="text-neon hover:underline underline-offset-2">
              Verify email
            </Link>
            <Link to="/forgot-password" className="text-neon hover:underline underline-offset-2">
              Forgot password
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center font-code text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-neon hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
