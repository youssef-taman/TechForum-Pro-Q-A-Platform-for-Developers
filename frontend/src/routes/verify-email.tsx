import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, API_ENDPOINTS, type AuthActionResponse } from "@/lib/api";

export const Route = createFileRoute("/verify-email")({
  head: () => ({ meta: [{ title: "Verify Email — TechForum Pro" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const [identifier, setIdentifier] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setVerificationToken(token);
      setManualToken(token);
    }
  }, []);

  const requestVerification = async () => {
    const value = identifier.trim();
    if (value.length < 3) {
      toast.error("Enter a username or email");
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
      toast.error(err instanceof Error ? err.message : "Failed to request verification token");
    } finally {
      setRequesting(false);
    }
  };

  const confirmVerification = async () => {
    const token = manualToken.trim() || verificationToken;

    if (!token) {
      toast.error("Enter or request a verification token first");
      return;
    }

    setConfirming(true);
    try {
      const response = await apiFetch<AuthActionResponse>(API_ENDPOINTS.confirmEmailVerification, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      toast.success(response.message);
      setVerificationToken(null);
      setManualToken("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to verify email");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md gap-6 lg:items-center">
      <div className="w-full rounded-xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-neon/30 bg-neon/10 text-neon">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <h1 className="font-code text-2xl font-bold">
            <span className="text-muted-foreground">$ </span>verify email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Request a verification token here, then confirm it on the same page.
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
              onClick={requestVerification}
              disabled={requesting}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MailCheck className="h-3.5 w-3.5" />}
              {requesting ? "Generating token…" : "Request verification token"}
            </button>
          </div>

          {verificationToken && (
            <div className="rounded-lg border border-neon/30 bg-neon/10 p-4 font-code text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-neon" />
                Verification token generated
              </div>
              <p className="mt-1 break-all leading-relaxed text-neon">{verificationToken}</p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-center gap-2 font-code text-xs text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-neon" />
              Confirm verification
            </div>
            <input
              value={manualToken}
              onChange={(event) => setManualToken(event.target.value)}
              placeholder="Verification token"
              className="mt-3 w-full rounded-lg border border-input bg-background px-4 py-2.5 font-code text-sm focus:border-neon focus:outline-none"
            />
            <button
              type="button"
              onClick={confirmVerification}
              disabled={confirming || !(manualToken.trim() || verificationToken)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-code text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
              {confirming ? "Verifying…" : "Confirm verification"}
            </button>
          </div>
        </div>

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