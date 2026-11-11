"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { identify, resetAnalytics, track } from "@/lib/analytics";
import { AuthFailure, DEMO_MODE, ScoreError, continueWithProvider, currentAccount, logOut, needsPassword, onAccountChange, scoreFit, sendWelcomeOnce, type Account, type Provider } from "@/lib/backend";
import { normalizePhoto } from "@/lib/image";
import { escapeInAppBrowserOnce } from "@/lib/inApp";
import type { OccasionId } from "@/lib/occasions";
import type { Scan } from "@/lib/types";
import AccountSheet from "./AccountSheet";
import AuthScreen, { type AuthMode } from "./AuthScreen";
import Camera from "./Camera";
import History from "./History";
import Notice from "./Notice";
import KeepFitsSheet from "./KeepFitsSheet";
import Preview from "./Preview";
import Result from "./Result";
import Scanning from "./Scanning";
import ShareSheet from "./ShareSheet";
import Splash from "./Splash";
import Welcome from "./Welcome";

interface Photo {
  blob: Blob;
  url: string;
}

type View =
  | { name: "boot" }
  | { name: "welcome" }
  | { name: "camera" }
  | { name: "preview" }
  | { name: "scanning" }
  | { name: "result"; scan: Scan; photoUrl: string | null }
  | { name: "notScorable"; message: string }
  | { name: "error"; error: ScoreError }
  | { name: "history" };

const WELCOMED_KEY = "drippy.welcomed";
const SCORED_KEY = "drippy.scoredCount";

/** Offer "Keep your fits" to guests after their 1st score, then every 5th. */
function shouldOfferKeepFits(): boolean {
  let n = 0;
  try {
    n = Number(localStorage.getItem(SCORED_KEY) ?? "0") + 1;
    localStorage.setItem(SCORED_KEY, String(n));
  } catch {
    return false;
  }
  return n === 1 || n % 5 === 0;
}

export default function DrippyApp() {
  const [view, setView] = useState<View>({ name: "boot" });
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [occasion, setOccasion] = useState<OccasionId | null>(null);
  // The occasion whose story card is being shared (null = overall); undefined = not sharing.
  const [sharing, setSharing] = useState<string | null | undefined>(undefined);
  const [splashDone, setSplashDone] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const accountRef = useRef<Account | null>(null);
  const [auth, setAuth] = useState<{ mode: AuthMode; from: string } | null>(null);
  const [keepFits, setKeepFits] = useState(false);
  const [accountSheet, setAccountSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const endSplash = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    // Opened from a story link on Android? Instagram's browser can't share or save images, so reopen in Chrome.
    // Keep loading anyway: if the hand-off is blocked, the app still works here.
    escapeInAppBrowserOnce();
    let welcomed = false;
    try {
      welcomed = localStorage.getItem(WELCOMED_KEY) === "1";
    } catch {
      // Storage blocked: show the welcome screen every time.
    }
    setView(welcomed ? { name: "camera" } : { name: "welcome" });
  }, []);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const applyAccount = useCallback((next: Account | null) => {
    accountRef.current = next;
    setAccount(next);
    if (next) identify(next.id);
    // A real account (Google, or email confirmed): send "Welcome to Drippy" once.
    if (next && !next.guest && next.email) sendWelcomeOnce(next.id).catch(() => {});
    // Came back from the "confirm your email" link: one last step, a password.
    if (needsPassword(next)) setAuth({ mode: "setPassword", from: "email_link" });
  }, []);

  useEffect(() => {
    currentAccount().then(applyAccount).catch(() => {});
    return onAccountChange((next, recovery) => {
      applyAccount(next);
      if (recovery) setAuth({ mode: "setPassword", from: "reset" });
    });
  }, [applyAccount]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const openAuth = useCallback((mode: AuthMode, from: string) => {
    track("auth_opened", { from, mode });
    setKeepFits(false);
    setAuth({ mode, from });
  }, []);

  const authDone = useCallback(async (how: "signed_up" | "logged_in" | "password_set") => {
    setAuth(null);
    setToast(how === "logged_in" ? "Welcome back" : how === "signed_up" ? "Your fits are saved" : "You're all set");
    applyAccount(await currentAccount().catch(() => null));
    setView((v) => (v.name === "welcome" || v.name === "boot" ? { name: "camera" } : v));
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      // Not critical.
    }
  }, [applyAccount]);

  const socialLogin = useCallback(async (p: Provider, from: string) => {
    track("auth_opened", { from, mode: p });
    try {
      await continueWithProvider(p); // leaves the page for the provider, then comes back signed in
    } catch (err) {
      setToast(err instanceof AuthFailure ? err.message : "Couldn't start that login.");
    }
  }, []);

  const doLogOut = useCallback(async () => {
    setAccountSheet(false);
    track("logged_out");
    await logOut().catch(() => {});
    resetAnalytics();
    applyAccount(null);
    setToast("Logged out");
  }, [applyAccount]);

  const markWelcomed = () => {
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      // Not critical.
    }
  };

  const takePhoto = useCallback(async (raw: Blob, source: "camera" | "upload") => {
    track("photo_added", { source });
    try {
      const blob = await normalizePhoto(raw);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setView({ name: "preview" });
    } catch {
      setPhoto(null);
      setView({ name: "error", error: new ScoreError("failed", "We couldn't open that photo. Try a JPEG or PNG.") });
    }
  }, []);

  const openPicker = useCallback(() => fileInput.current?.click(), []);

  const rate = useCallback(async () => {
    if (!photo) return;
    setView({ name: "scanning" });
    track("scan_requested", { occasion });
    try {
      const scan = await scoreFit(photo.blob, occasion);
      if (scan.status === "scored") {
        track("scan_scored", { occasion, overall: scan.overall ?? null });
        // Let the mascot celebrate for a moment before the score appears.
        setFinishing(true);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        await new Promise((r) => setTimeout(r, reduce ? 300 : 1100));
        setFinishing(false);
        setView({ name: "result", scan, photoUrl: photo.url });
        // A guest just got a score: after a beat, offer to keep their fits.
        const acc = accountRef.current;
        if ((!acc || acc.guest) && shouldOfferKeepFits()) {
          setTimeout(() => {
            track("keep_fits_shown");
            setKeepFits(true);
          }, 1800);
        }
      } else {
        track("scan_not_scorable", { occasion });
        setView({ name: "notScorable", message: scan.message || "We need your outfit, top to shoes, to give you a score." });
      }
    } catch (err) {
      track("scan_failed", { kind: err instanceof ScoreError ? err.kind : "failed" });
      setView({ name: "error", error: err instanceof ScoreError ? err : new ScoreError("failed", "Something went wrong. Please try again.") });
    }
  }, [occasion, photo]);

  const toCamera = useCallback(() => {
    setSharing(undefined);
    setView({ name: "camera" });
  }, []);

  let screen: React.ReactNode = null;
  switch (view.name) {
    case "welcome":
      screen = (
        <Welcome
          onStart={() => { track("welcome_started", { via: "camera" }); markWelcomed(); setView({ name: "camera" }); }}
          onUpload={() => { track("welcome_started", { via: "upload" }); markWelcomed(); setView({ name: "camera" }); openPicker(); }}
          onLogin={() => openAuth("login", "landing")}
          onProvider={(p) => socialLogin(p, "landing")}
        />
      );
      break;
    case "camera":
      screen = (
        <Camera occasion={occasion} onOccasion={setOccasion} onPhoto={(blob) => takePhoto(blob, "camera")} onUpload={openPicker} onHistory={() => { track("history_opened", { from: "camera" }); setView({ name: "history" }); }}
          account={account}
          onAccount={() => (account && !account.guest ? setAccountSheet(true) : openAuth("login", "camera"))}
        />
      );
      break;
    case "preview":
      screen = photo && <Preview photoUrl={photo.url} occasion={occasion} onOccasion={setOccasion} onRate={rate} onRetake={toCamera} />;
      break;
    case "scanning":
      screen = photo && <Scanning photoUrl={photo.url} finishing={finishing} />;
      break;
    case "result":
      screen = (
        <>
          <Result scan={view.scan} photoUrl={view.photoUrl} onClose={toCamera} onShare={(o) => { track("share_opened", { occasion: o }); setSharing(o); }} />
          {DEMO_MODE && view.scan.model === "demo" && (
            <div style={{ position: "absolute", top: "calc(68px + var(--safe-top))", left: "50%", transform: "translateX(-50%)", padding: "6px 12px", borderRadius: 999, background: "rgba(7,11,26,0.7)", border: "1px solid var(--gold)", color: "var(--gold-text)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
              Sample result · backend not connected
            </div>
          )}
          {sharing !== undefined && <ShareSheet scan={view.scan} photoUrl={view.photoUrl} occasion={sharing} onClose={() => setSharing(undefined)} />}
        </>
      );
      break;
    case "notScorable":
      screen = (
        <Notice
          title="We can't see your fit"
          message={`${view.message} This photo didn't count toward today's free checks.`}
          tips
          primary={{ label: "Retake photo", onClick: toCamera }}
          secondary={{ label: "Pick another photo", onClick: () => { toCamera(); openPicker(); } }}
          onClose={toCamera}
        />
      );
      break;
    case "error": {
      const limit = view.error.kind === "limit";
      screen = (
        <Notice
          title={limit ? "That's all for today" : "Something went wrong"}
          message={view.error.message}
          primary={limit ? { label: "See your fits", onClick: () => { track("history_opened", { from: "limit" }); setView({ name: "history" }); } } : photo ? { label: "Try again", onClick: rate } : { label: "Back to camera", onClick: toCamera }}
          secondary={limit ? undefined : { label: "Back to camera", onClick: toCamera }}
          onClose={toCamera}
        />
      );
      break;
    }
    case "history":
      screen = <History onDone={toCamera} onOpen={(item) => setView({ name: "result", scan: item.scan, photoUrl: item.photoUrl })} />;
      break;
  }

  return (
    <main className="app">
      {screen}
      {keepFits && view.name === "result" && (
        <KeepFitsSheet
          onEmail={() => openAuth("signup", "keep_fits")}
          onProvider={(p) => socialLogin(p, "keep_fits")}
          onLater={() => { track("keep_fits_dismissed"); setKeepFits(false); }}
        />
      )}
      {accountSheet && account && (
        <AccountSheet
          account={account}
          onFits={() => { setAccountSheet(false); track("history_opened", { from: "account" }); setView({ name: "history" }); }}
          onLogOut={doLogOut}
          onClose={() => setAccountSheet(false)}
        />
      )}
      {auth && <AuthScreen mode={auth.mode} from={auth.from} onClose={() => setAuth(null)} onDone={authDone} />}
      {toast && (
        <div className="toast" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
          {toast}
        </div>
      )}
      {!splashDone && <Splash onDone={endSplash} />}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) takePhoto(file, "upload");
        }}
      />
    </main>
  );
}
