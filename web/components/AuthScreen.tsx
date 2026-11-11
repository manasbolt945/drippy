"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  AuthFailure,
  PROVIDERS,
  continueWithProvider,
  logInWithEmail,
  resendEmailCode,
  sendPasswordReset,
  setPassword,
  signUpWithEmail,
  verifyEmailCode,
  type CodeKind,
  type Provider,
} from "@/lib/backend";
import Mascot from "./Mascot";
import { ProviderIcon } from "./ProviderIcon";

export type AuthMode = "login" | "signup" | "setPassword";
type Stage = AuthMode | "code" | "resetSent";

interface Props {
  mode: AuthMode;
  /** Where it was opened from, for analytics. */
  from: string;
  onClose: () => void;
  onDone: (how: "signed_up" | "logged_in" | "password_set") => void;
}

const RESEND_WAIT = 60;

/** Screen 3: email log in / sign up, the 6-digit code step, and "set a password". */
export default function AuthScreen({ mode, from, onClose, onDone }: Props) {
  const [stage, setStage] = useState<Stage>(mode);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [codeKind, setCodeKind] = useState<CodeKind>("email_change");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Countdown before "Resend code" works again (Supabase allows one email a minute).
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const isForm = stage === "login" || stage === "signup" || stage === "setPassword";

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof AuthFailure ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stage === "setPassword") {
      if (password.length < 8) return setError("Use 8 characters or more.");
      return run(async () => {
        await setPassword(password);
        track("signed_up", { method: "email", from });
        onDone("password_set");
      });
    }
    if (stage === "signup" && !first.trim()) return setError("Add your first name.");
    if (!email.includes("@")) return setError("Enter your email.");
    if (stage === "signup" && password.length < 8) return setError("Use 8 characters or more.");
    if (!password) return setError("Enter your password.");
    run(async () => {
      if (stage === "signup") {
        const result = await signUpWithEmail(email.trim(), password, { first_name: first.trim(), last_name: last.trim() });
        if (result === "done") {
          track("signed_up", { method: "email", from });
          return onDone("signed_up");
        }
        setCodeKind(result);
        setCode("");
        setWait(RESEND_WAIT);
        setStage("code");
      } else {
        await logInWithEmail(email.trim(), password);
        track("logged_in", { method: "email", from });
        onDone("logged_in");
      }
    });
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) return setError("Enter the 6-digit code from the email.");
    run(async () => {
      await verifyEmailCode(email.trim(), digits, codeKind, password);
      track("signed_up", { method: "email", from });
      onDone("signed_up");
    });
  };

  const resend = () =>
    run(async () => {
      await resendEmailCode(email.trim(), codeKind);
      setWait(RESEND_WAIT);
      setNote("New code sent.");
    });

  const forgot = () => {
    if (!email.includes("@")) return setError("Enter your email first, then tap Forgot password.");
    run(async () => {
      await sendPasswordReset(email.trim());
      setStage("resetSent");
    });
  };

  const social = (p: Provider) => run(() => continueWithProvider(p));

  const switchTo = (next: "login" | "signup") => {
    setStage(next);
    setError(null);
    setNote(null);
  };

  const label = stage === "signup" ? "Sign up" : stage === "code" ? "Enter your code" : "Log in";

  return (
    <div className="screen sky auth" role="dialog" aria-modal="true" aria-label={label}>
      <div style={{ padding: "calc(12px + var(--safe-top)) 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" className="icon-btn solid" aria-label="Back" onClick={stage === "code" ? () => switchTo("signup") : onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <Mascot size={44} />
        <span style={{ width: 44 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px calc(24px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 18 }}>
        {isForm && (
          <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {stage === "setPassword" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Set a password</h1>
                <p className="muted" style={{ margin: 0, fontSize: 15 }}>Your email is confirmed. One last step.</p>
              </div>
            ) : (
              <div className="seg" role="group" aria-label="Log in or sign up">
                <button type="button" aria-pressed={stage === "login"} onClick={() => switchTo("login")}>Log in</button>
                <button type="button" aria-pressed={stage === "signup"} onClick={() => switchTo("signup")}>Sign up</button>
              </div>
            )}

            {stage === "signup" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <label className="field">
                  <span>First name</span>
                  <input autoComplete="given-name" autoCapitalize="words" value={first} onChange={(e) => setFirst(e.target.value)} />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input autoComplete="family-name" autoCapitalize="words" value={last} onChange={(e) => setLast(e.target.value)} />
                </label>
              </div>
            )}

            {stage !== "setPassword" && (
              <label className="field">
                <span>Email</span>
                <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="field">
                <span>Password</span>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete={stage === "login" ? "current-password" : "new-password"}
                    placeholder={stage === "login" ? "Your password" : "8+ characters"}
                    value={password}
                    onChange={(e) => setPw(e.target.value)}
                    style={{ paddingRight: 52 }}
                  />
                  <button type="button" className="pw-eye" aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw} onClick={() => setShowPw((v) => !v)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
                      {showPw && <path d="M4 4l16 16" />}
                    </svg>
                  </button>
                </div>
              </label>
              {stage === "login" && (
                <button type="button" className="link-btn" style={{ alignSelf: "flex-end" }} onClick={forgot} disabled={busy}>Forgot password?</button>
              )}
            </div>

            {error && <p role="alert" style={{ margin: 0, color: "var(--coral)", fontSize: 14, fontWeight: 600 }}>{error}</p>}

            <button type="submit" className="btn btn-gold" disabled={busy}>
              {busy ? "One sec…" : stage === "signup" ? "Create account" : stage === "setPassword" ? "Save password" : "Log in"}
            </button>
          </form>
        )}

        {isForm && stage !== "setPassword" && PROVIDERS.length > 0 && (
          <>
            <div className="or-line"><span>or</span></div>
            <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
              {PROVIDERS.map((p) => (
                <button key={p} type="button" className="provider-btn" aria-label={`Continue with ${p[0].toUpperCase()}${p.slice(1)}`} onClick={() => social(p)} disabled={busy}>
                  <ProviderIcon provider={p} />
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "code" && (
          <form onSubmit={verify} noValidate style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", paddingTop: 12 }}>
            <div className="mail-badge">
              <ProviderIcon provider="email" size={40} />
            </div>
            <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Enter your code</h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              We sent 6 digits to <b style={{ color: "var(--text)", wordBreak: "break-all" }}>{email}</b>
            </p>
            <input
              className="code-input"
              aria-label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
            {error && <p role="alert" style={{ margin: 0, color: "var(--coral)", fontSize: 14, fontWeight: 600 }}>{error}</p>}
            {note && !error && <p role="status" style={{ margin: 0, color: "var(--gold-text)", fontSize: 14, fontWeight: 600 }}>{note}</p>}
            <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={busy || code.length !== 6}>
              {busy ? "One sec…" : "Verify"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="link-btn" onClick={resend} disabled={busy || wait > 0}>
                {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
              </button>
              <button type="button" className="link-btn muted-link" onClick={() => switchTo("signup")}>Change email</button>
            </div>
          </form>
        )}

        {stage === "resetSent" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
            <div className="mail-badge">
              <ProviderIcon provider="email" size={40} />
            </div>
            <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Check your inbox</h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              Tap the reset link we sent to <b style={{ color: "var(--text)", wordBreak: "break-all" }}>{email}</b>
            </p>
            <button type="button" className="link-btn" onClick={() => switchTo("login")}>Back to log in</button>
          </div>
        )}
      </div>
    </div>
  );
}
