import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — TechForum Pro" }] }),
  component: LoginPage,
});

const schema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

interface AuthResponse {
  accessToken: string;
  username: string;
  email: string;
  role: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await apiFetch<AuthResponse>(API_ENDPOINTS.login, {
        method: "POST",
        body: JSON.stringify({ identifier: data.identifier, password: data.password }),
      });
      login(res.accessToken, { username: res.username, email: res.email, role: res.role });
      toast.success(`Welcome back, ${res.username}!`);
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md gap-6 lg:items-center">
      <div className="w-full rounded-xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <h1 className="font-code text-2xl font-bold">
            <span className="text-muted-foreground">$ </span>login
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to TechForum Pro</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="mb-1.5 block font-code text-xs text-muted-foreground">username or email</label>
            <input
              {...register("identifier")}
              placeholder="dev@example.com or username"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
            />
            {errors.identifier && <p className="mt-1 font-code text-[11px] text-destructive">{errors.identifier.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block font-code text-xs text-muted-foreground">password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-10 font-code text-sm focus:border-neon focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 font-code text-[11px] text-destructive">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-primary py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <LogIn className="h-3.5 w-3.5" />
              {isSubmitting ? "Signing in…" : "Sign in"}
            </span>
          </button>
        </form>

        <p className="mt-6 text-center font-code text-xs text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="text-neon hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
