"use client";

import { useEffect, useState } from "react";
import { renderShareCard } from "@/lib/shareCard";
import type { Scan } from "@/lib/types";
import { Close, Share } from "./icons";

interface Props {
  scan: Scan;
  photoUrl: string | null;
  onClose: () => void;
}

/** The story card and one Share button: the phone's share sheet where the browser allows it, else a download. */
export default function ShareSheet({ scan, photoUrl, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    renderShareCard(scan, photoUrl, window.location.host)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setFile(new File([blob], `drippy-${scan.overall ?? "fit"}.jpg`, { type: blob.type || "image/jpeg" }));
        setUrl(objectUrl);
      })
      .catch((err) => {
        console.error("share card failed", err);
        setFailed(true);
      });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scan, photoUrl]);

  async function share() {
    if (!file || !url) return;
    const canShareFile = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
    if (canShareFile) {
      try {
        await navigator.share({ files: [file], text: `My fit scored ${scan.overall} on Drippy. What's yours? ${window.location.origin}` });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return; // closed the share sheet
      }
    }
    // No file sharing here (e.g. Instagram's in-app browser on Android): save the image instead.
    const a = document.createElement("a");
    a.href = url;
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

      <div style={{ height: "min(64vh, 580px)", aspectRatio: "9 / 16", borderRadius: 20, overflow: "hidden", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Your Drippy story card" style={{ width: "100%", height: "100%" }} />
        ) : failed ? (
          <span className="muted" style={{ fontSize: 14 }}>Couldn&apos;t make your card.</span>
        ) : (
          <span className="spinner" aria-label="Making your card" style={{ borderColor: "rgba(244,239,227,.2)", borderTopColor: "var(--gold)" }} />
        )}
      </div>

      <button type="button" className="btn btn-gold" style={{ width: "100%", maxWidth: 340 }} onClick={share} disabled={!url}>
        <Share size={18} /> Share
      </button>
    </div>
  );
}
