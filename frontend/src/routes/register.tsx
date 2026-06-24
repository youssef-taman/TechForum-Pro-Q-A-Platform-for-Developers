import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Check, UserPlus, MailCheck, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS, type AuthResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — TechForum Pro" }] }),
  component: RegisterPage,
});

const schema = z
  .object({
    username: z.string().min(3, "At least 3 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscore only"),
    email: z.string().email("Invalid email"),
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

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onChange" });

  const username = watch("username");

  const showRegistrationConflict = (message: string) => {
    const normalized = message.toLowerCase();
    const isDuplicateAccount =
      normalized.includes("already exists") ||
      normalized.includes("already in use") ||
      normalized.includes("duplicate") ||
      normalized.includes("taken") ||
      normalized.includes("conflict");

    if (!isDuplicateAccount) return false;

    const fieldMessage = "Username or email is already in use";
    setError("username", { type: "server", message: fieldMessage });
    setError("email", { type: "server", message: fieldMessage });
    return true;
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await apiFetch<AuthResponse>(API_ENDPOINTS.register, {
        method: "POST",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password
        }),
      });

      login(res.accessToken, {
        username: res.username,
        email: res.email,
        role: res.role
      });

      toast.success("Account created! Welcome to TechForum Pro.");
      await navigate({to: "/"});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      if (!showRegistrationConflict(message)) {
        toast.error(message);
      }
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md gap-6 lg:items-center">
      <div className="w-full rounded-xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <h1 className="font-code text-2xl font-bold">
            <span className="text-muted-foreground">$ </span>register
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Create your TechForum Pro account.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="mb-1.5 block font-code text-xs text-muted-foreground">username</label>
            <input
              {...register("username")}
              placeholder="cooldev42"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
            />
            {errors.username && <p className="mt-1 font-code text-[11px] text-destructive">{errors.username.message}</p>}
            {!errors.username && username && (
              <p className="mt-1 flex items-center gap-1 font-code text-[11px] text-green-500">
                <Check className="h-3 w-3" /> Looks good
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block font-code text-xs text-muted-foreground">email</label>
            <input type="email" {...register("email")} placeholder="dev@example.com"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none" />
            {errors.email && <p className="mt-1 font-code text-[11px] text-destructive">{errors.email.message}</p>}
            {!errors.email && username && (
              <p className="mt-1 flex items-center gap-1 font-code text-[11px] text-muted-foreground">
                <MailCheck className="h-3 w-3" />
                Verification email will use this address
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block font-code text-xs text-muted-foreground">password</label>
            <div className="relative">
              <input type={show ? "text" : "password"} {...register("password")} placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-10 font-code text-sm focus:border-neon focus:outline-none" />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 font-code text-[11px] text-destructive">{errors.password.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block font-code text-xs text-muted-foreground">confirm password</label>
            <input type={show ? "text" : "password"} {...register("confirmPassword")} placeholder="••••••••"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none" />
            {errors.confirmPassword && <p className="mt-1 font-code text-[11px] text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-primary py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <span className="inline-flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5" />
              {isSubmitting ? "Creating account…" : "Create account"}
            </span>
          </button>
        </form>

        <div className="mt-5 rounded-lg border border-border bg-surface/60 p-3 text-left font-code text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-neon" />
            Account safety
          </div>
          <p className="mt-1 leading-relaxed">
            We are rolling out email verification and password recovery flows.
            Use the links below to get to those screens.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link to="/verify-email" className="text-neon hover:underline">
              Email verification
            </Link>
            <Link to="/forgot-password" className="text-neon hover:underline">
              Forgot password
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center font-code text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-neon hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
