"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_MODE, ScoreError, scoreFit } from "@/lib/backend";
import { normalizePhoto } from "@/lib/image";
import { escapeInAppBrowserOnce } from "@/lib/inApp";
import type { OccasionId } from "@/lib/occasions";
import type { Scan } from "@/lib/types";
import Camera from "./Camera";
import History from "./History";
import Notice from "./Notice";
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

export default function DrippyApp() {
  const [view, setView] = useState<View>({ name: "boot" });
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [occasion, setOccasion] = useState<OccasionId | null>(null);
  const [sharing, setSharing] = useState<{ showVerdict: boolean; occasion: string | null } | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const [finishing, setFinishing] = useState(false);
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

  const markWelcomed = () => {
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      // Not critical.
    }
  };

  const takePhoto = useCallback(async (raw: Blob) => {
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
    try {
      const scan = await scoreFit(photo.blob, occasion);
      if (scan.status === "scored") {
        // Let the mascot celebrate for a moment before the score appears.
        setFinishing(true);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        await new Promise((r) => setTimeout(r, reduce ? 300 : 1100));
        setFinishing(false);
        setView({ name: "result", scan, photoUrl: photo.url });
      } else {
        setView({ name: "notScorable", message: scan.message || "We need your outfit, top to shoes, to give you a score." });
      }
    } catch (err) {
      setView({ name: "error", error: err instanceof ScoreError ? err : new ScoreError("failed", "Something went wrong. Please try again.") });
    }
  }, [occasion, photo]);

  const toCamera = useCallback(() => {
    setSharing(null);
    setView({ name: "camera" });
  }, []);

  let screen: React.ReactNode = null;
  switch (view.name) {
    case "welcome":
      screen = (
        <Welcome
          onStart={() => { markWelcomed(); setView({ name: "camera" }); }}
          onUpload={() => { markWelcomed(); setView({ name: "camera" }); openPicker(); }}
        />
      );
      break;
    case "camera":
      screen = (
        <Camera occasion={occasion} onOccasion={setOccasion} onPhoto={takePhoto} onUpload={openPicker} onHistory={() => setView({ name: "history" })} />
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
          <Result scan={view.scan} photoUrl={view.photoUrl} onClose={toCamera} onShare={setSharing} />
          {DEMO_MODE && view.scan.model === "demo" && (
            <div style={{ position: "absolute", top: "calc(68px + var(--safe-top))", left: "50%", transform: "translateX(-50%)", padding: "6px 12px", borderRadius: 999, background: "rgba(7,11,26,0.7)", border: "1px solid var(--gold)", color: "var(--gold-text)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
              Sample result · backend not connected
            </div>
          )}
          {sharing && <ShareSheet scan={view.scan} photoUrl={view.photoUrl} showVerdict={sharing.showVerdict} occasion={sharing.occasion} onClose={() => setSharing(null)} />}
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
          primary={limit ? { label: "See your fits", onClick: () => setView({ name: "history" }) } : photo ? { label: "Try again", onClick: rate } : { label: "Back to camera", onClick: toCamera }}
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
          if (file) takePhoto(file);
        }}
      />
    </main>
  );
}
