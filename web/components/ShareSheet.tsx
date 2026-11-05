"use client";

import { useEffect, useState } from "react";
import { blobToBase64 } from "@/lib/image";
import { isInAppBrowser } from "@/lib/inApp";
import { renderShareCard } from "@/lib/shareCard";
import type { Scan } from "@/lib/types";
import { Close, Share } from "./icons";

interface Props {
  scan: Scan;
  photoUrl: string | null;
  /** Draw the verdict as the mascot's thought (off when the user dismissed it on the result screen). */
  showVerdict: boolean;
  onClose: () => void;
}

/**
 * The story card and one Share button: the phone's share sheet where the browser allows it, else a download.
 * In app browsers (Instagram, Facebook…) neither works, so Share asks you to press and hold the card to save it.
 */
export default function ShareSheet({ scan, photoUrl, showVerdict, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  // A data: URL rather than a blob: URL, so press-and-hold "Save image" works in in-app browsers too.
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [holdHint, setHoldHint] = useState(false);

  useEffect(() => {
    let live = true;
    setHoldHint(false);
    renderShareCard(scan, photoUrl, window.location.host, { showVerdict })
      .then(async (blob) => {
        const type = blob.type || "image/jpeg";
        const dataUrl = `data:${type};base64,${await blobToBase64(blob)}`;
        if (!live) return;
        setFile(new File([blob], `drippy-${scan.overall ?? "fit"}.jpg`, { type }));
        setSrc(dataUrl);
      })
      .catch((err) => {
        console.error("share card failed", err);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [scan, photoUrl, showVerdict]);

  async function share() {
    if (!file || !src) return;
    const canShareFile = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
    if (canShareFile) {
      try {
        await navigator.share({ files: [file], text: `My fit scored ${scan.overall} on Drippy. What's yours? ${window.location.origin}` });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return; // closed the share sheet
      }
    }
    if (isInAppBrowser()) {
      // Instagram's browser can't share or download files, but it can save a pressed-and-held image.
      setHoldHint(true);
      return;
    }
    const a = document.createElement("a");
    a.href = src;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Share your score">
      <button type="button" className="icon-btn solid" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: "calc(14px + var(--safe-top))", right: 16 }}>
        <Close />
      </button>

      <div className={holdHint ? "card-hold" : undefined} style={{ height: "min(64vh, 580px)", aspectRatio: "9 / 16", borderRadius: 20, overflow: "hidden", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Your Drippy story card" style={{ width: "100%", height: "100%", WebkitTouchCallout: "default", userSelect: "auto" }} />
        ) : failed ? (
          <span className="muted" style={{ fontSize: 14 }}>Couldn&apos;t make your card.</span>
        ) : (
          <span className="spinner" aria-label="Making your card" style={{ borderColor: "rgba(244,239,227,.2)", borderTopColor: "var(--gold)" }} />
        )}
      </div>

      {holdHint ? (
        <div className="glass-dark hold-hint" role="status">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0v3.5a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.9-2.5L4.2 14a1.5 1.5 0 0 1 2.4-1.8L9 15" />
          </svg>
          Press and hold the card to save it
        </div>
      ) : (
        <button type="button" className="btn btn-gold" style={{ width: "100%", maxWidth: 340 }} onClick={share} disabled={!src}>
          <Share size={18} /> Share
        </button>
      )}
    </div>
  );
}
