import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, BadgeCheck, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS, type AuthActionResponse } from "@/lib/api";

export const Route = createFileRoute("/verify-email")({
  head: () => ({ meta: [{ title: "Verify Email — TechForum Pro" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const [identifier, setIdentifier] = useState("");
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [verifiedDone, setVerifiedDone] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setVerificationToken(token);
      setManualToken(token);
    }
  }, []);

  const requestVerification = async () => {
    const value = identifier.trim();
    setIdentifierError(null);
    if (value.length < 3) {
      setIdentifierError("Enter your username or email address");
      return;
    }

    setRequesting(true);
    try {
      const response = await apiFetch<AuthActionResponse>(API_ENDPOINTS.requestEmailVerification, {
        method: "POST",
        body: JSON.stringify({ identifier: value }),
      });
      setVerificationToken(response.token ?? null);
      setManualToken(response.token ?? "");
      toast.success(response.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request verification token";
      setIdentifierError(msg);
    } finally {
      setRequesting(false);
    }
  };

  const confirmVerification = async () => {
    const token = manualToken.trim() || verificationToken;
    setTokenError(null);

    if (!token) {
      setTokenError("Enter or request a verification token first");
      return;
    }

    setConfirming(true);
    try {
      const response = await apiFetch<AuthActionResponse>(API_ENDPOINTS.confirmEmailVerification, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      toast.success(response.message);
      setVerifiedDone(true);
      setVerificationToken(null);
      setManualToken("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to verify email";
      setTokenError(msg);
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
            <BadgeCheck className="h-5 w-5" />
          </div>
          <h1 className="font-code text-2xl font-bold">
            <span className="text-muted-foreground">$ </span>verify email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Request a verification token, then confirm it below.
          </p>
        </div>

        {verifiedDone ? (
          /* ── Success state ── */
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5 text-center">
            <BadgeCheck className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <p className="font-code text-sm font-medium text-foreground">Email verified successfully</p>
            <p className="mt-1 font-code text-xs text-muted-foreground">Your account is now fully active.</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Go to forum
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
                onClick={requestVerification}
                disabled={requesting}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MailCheck className="h-3.5 w-3.5" />}
                {requesting ? "Generating token…" : "Send verification token"}
              </button>
            </div>

            {/* Token display */}
            {verificationToken && (
              <div className="rounded-lg border border-neon/30 bg-neon/10 p-4 font-code text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-neon" />
                  <span className="font-medium">Verification token generated</span>
                </div>
                <p className="mt-1.5 break-all leading-relaxed text-neon">{verificationToken}</p>
              </div>
            )}

            {/* ── Step 2: Confirm token ── */}
            <div className="rounded-lg border border-border bg-surface/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-3.5 w-3.5 text-neon shrink-0" />
                <p className="font-code text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step 2 — Confirm token
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="verification-token" className="font-code text-sm font-medium text-foreground">
                  Verification token
                </label>
                <input
                  id="verification-token"
                  value={manualToken}
                  onChange={(e) => {
                    setManualToken(e.target.value);
                    setTokenError(null);
                  }}
                  placeholder="Paste token here"
                  autoComplete="off"
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 font-code text-sm placeholder:text-muted-foreground/60 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20 transition-colors"
                />
                {tokenError && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    <p className="font-code text-xs text-destructive leading-snug">{tokenError}</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={confirmVerification}
                disabled={confirming || !(manualToken.trim() || verificationToken)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                {confirming ? "Verifying…" : "Confirm verification"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 font-code text-xs">
          <Link to="/login" className="inline-flex items-center gap-1 text-neon hover:underline">
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
          <Link to="/register" className="text-neon hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
