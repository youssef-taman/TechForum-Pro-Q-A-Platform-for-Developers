import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";

type ResetResponse = {
  message: string;
  token?: string | null;
};

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — TechForum Pro" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestedToken, setRequestedToken] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setRequestedToken(token);
      setManualToken(token);
    }
  }, []);

  const requestReset = async () => {
    const value = identifier.trim();
    setIdentifierError(null);
    if (value.length < 3) {
      setIdentifierError("Enter your username or email address");
      return;
    }

    setRequesting(true);
    try {
      const response = await apiFetch<ResetResponse>(API_ENDPOINTS.requestPasswordReset, {
        method: "POST",
        body: JSON.stringify({ identifier: value }),
      });
      setRequestedToken(response.token ?? null);
      setManualToken(response.token ?? "");
      toast.success(response.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request reset token";
      setIdentifierError(msg);
    } finally {
      setRequesting(false);
    }
  };

  const confirmReset = async () => {
    const token = manualToken.trim() || requestedToken;
    setPasswordError(null);
    setResetError(null);

    if (!token) {
      setResetError("Request a reset token first, then enter it above.");
      return;
    }

    if (!requestedToken) {
      setResetError("Request a reset token using the form above before confirming.");
      return;
    }

    if (newPassword.trim().length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setConfirming(true);
    try {
      const response = await apiFetch<ResetResponse>(API_ENDPOINTS.confirmPasswordReset, {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      toast.success(response.message);
      setResetDone(true);
      setRequestedToken(null);
      setManualToken("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      setResetError(msg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md gap-6 lg:items-center">
      <div className="w-full rounded-xl border border-border bg-card p-8">

        {/* ── Header ── */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-neon/30 bg-neon/10 text-neon">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="font-code text-2xl font-bold">
            <span className="text-muted-foreground">$ </span>forgot password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Request a reset token, then set your new password below.
          </p>
        </div>

        {resetDone ? (
          /* ── Success state ── */
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5 text-center">
            <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <p className="font-code text-sm font-medium text-foreground">Password reset successfully</p>
            <p className="mt-1 font-code text-xs text-muted-foreground">You can now sign in with your new password.</p>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── Step 1: Request token ── */}
            <div className="rounded-lg border border-border bg-surface/60 p-4">
              <p className="mb-3 font-code text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step 1 — Request token
              </p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="identifier" className="font-code text-sm font-medium text-foreground">
                  Username or email
                </label>
                <input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setIdentifierError(null);
                  }}
                  placeholder="dev@example.com or username"
                  autoComplete="username email"
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
                />
                {identifierError && (
                  <p className="flex items-center gap-1.5 font-code text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {identifierError}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={requestReset}
                disabled={requesting}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                {requesting ? "Generating token…" : "Send reset token"}
              </button>
            </div>

            {/* Token display */}
            {requestedToken && (
              <div className="rounded-lg border border-neon/30 bg-neon/10 p-4 font-code text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-neon" />
                  <span className="font-medium">Reset token generated</span>
                </div>
                <p className="mt-1.5 break-all leading-relaxed text-neon">{requestedToken}</p>
              </div>
            )}

            {/* ── Step 2: Set new password ── */}
            <div className="rounded-lg border border-border bg-surface/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-3.5 w-3.5 text-neon shrink-0" />
                <p className="font-code text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step 2 — Set new password
                </p>
              </div>

              <div className="space-y-3">
                {/* Token field */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reset-token" className="font-code text-sm font-medium text-foreground">
                    Reset token
                  </label>
                  <input
                    id="reset-token"
                    value={manualToken}
                    onChange={(e) => {
                      setManualToken(e.target.value);
                      setResetError(null);
                    }}
                    placeholder="Paste token here"
                    autoComplete="off"
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
                  />
                </div>

                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-password" className="font-code text-sm font-medium text-foreground">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-11 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className="font-code text-sm font-medium text-foreground">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
                  />
                </div>

                {/* Inline validation error */}
                {passwordError && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    <p className="font-code text-xs text-destructive leading-snug">{passwordError}</p>
                  </div>
                )}
                {resetError && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    <p className="font-code text-xs text-destructive leading-snug">{resetError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={confirmReset}
                  disabled={confirming || !(manualToken.trim() || requestedToken)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  {confirming ? "Resetting…" : "Reset password"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 font-code text-xs">
          <Link to="/login" className="inline-flex items-center gap-1 text-neon hover:underline">
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
          <Link to="/register" className="text-neon hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
