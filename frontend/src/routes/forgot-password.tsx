import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
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
  const [requesting, setRequesting] = useState(false);
  const [requestedToken, setRequestedToken] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setRequestedToken(token);
      setManualToken(token);
    }
  }, []);

  const requestReset = async () => {
    const value = identifier.trim();
    if (value.length < 3) {
      toast.error("Enter a username or email");
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
      toast.error(err instanceof Error ? err.message : "Failed to request reset token");
    } finally {
      setRequesting(false);
    }
  };

  const confirmReset = async () => {
    const token = manualToken.trim() || requestedToken;

    if (!token) {
      toast.error("Enter or request a reset token first");
      return;
    }

    if (!requestedToken) {
      toast.error("Request a reset token first");
      return;
    }

    if (newPassword.trim().length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setConfirming(true);
    try {
      const response = await apiFetch<ResetResponse>(API_ENDPOINTS.confirmPasswordReset, {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      toast.success(response.message);
      setRequestedToken(null);
      setManualToken("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md gap-6 lg:items-center">
      <div className="w-full rounded-xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-neon/30 bg-neon/10 text-neon">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="font-code text-2xl font-bold">
            <span className="text-muted-foreground">$ </span>forgot password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Request a reset token here, then confirm the new password on the same page.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block font-code text-xs text-muted-foreground">username or email</label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="dev@example.com or username"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
            />
            <button
              type="button"
              onClick={requestReset}
              disabled={requesting}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              {requesting ? "Generating token…" : "Request reset token"}
            </button>
          </div>

          {requestedToken && (
            <div className="rounded-lg border border-neon/30 bg-neon/10 p-4 font-code text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-neon" />
                Reset token generated
              </div>
              <p className="mt-1 break-all leading-relaxed text-neon">{requestedToken}</p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-center gap-2 font-code text-xs text-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-neon" />
              Confirm new password
            </div>
            <div className="mt-3 space-y-3">
              <input
                  value={manualToken}
                  onChange={(event) => setManualToken(event.target.value)}
                  placeholder="Reset token"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
              />
              <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
              />
              <button
                  type="button"
                  onClick={confirmReset}
                  disabled={confirming || !(manualToken.trim() || requestedToken)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                {confirming ? "Resetting…" : "Reset password"}
              </button>
            </div>
          </div>
        </div>

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