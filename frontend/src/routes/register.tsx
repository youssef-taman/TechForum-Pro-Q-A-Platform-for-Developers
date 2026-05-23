import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Check, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
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

interface AuthResponse {
  accessToken: string;
  username: string;
  email: string;
  role: string;
}

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onChange" });

  const username = watch("username");

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await apiFetch<AuthResponse>(API_ENDPOINTS.register, {
        method: "POST",
        body: JSON.stringify({ username: data.username, email: data.email, password: data.password }),
      });
      login(res.accessToken, { username: res.username, email: res.email, role: res.role });
      toast.success("Account created! Welcome to TechForum Pro.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
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

        <p className="mt-6 text-center font-code text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-neon hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
