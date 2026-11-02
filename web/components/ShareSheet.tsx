"use client";

import { useEffect, useState } from "react";
import { renderShareCard } from "@/lib/shareCard";
import type { Scan } from "@/lib/types";
import { Close, Download, Share } from "./icons";

interface Props {
  scan: Scan;
  photoUrl: string | null;
  onClose: () => void;
}

/** Renders the story card, then hands it to the phone's share sheet (Instagram, WhatsApp…) or saves it. */
export default function ShareSheet({ scan, photoUrl, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    renderShareCard(scan, photoUrl, window.location.host)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setFile(new File([blob], `drippy-${scan.overall ?? "fit"}.png`, { type: "image/png" }));
        setUrl(objectUrl);
      })
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scan, photoUrl]);

  const canShareFile = !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  async function share() {
    if (!file) return;
    try {
      await navigator.share({
        files: [file],
        text: `My fit scored ${scan.overall} on Drippy. What's yours? ${window.location.origin}`,
      });
    } catch {
      // User closed the share sheet.
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Share your score">
      <button type="button" className="icon-btn solid" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: "calc(14px + var(--safe-top))", right: 16 }}>
        <Close />
      </button>

      <div style={{ height: "min(62vh, 560px)", aspectRatio: "9 / 16", borderRadius: 20, overflow: "hidden", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Your Drippy story card" style={{ width: "100%", height: "100%" }} />
        ) : (
          <span className="muted" style={{ fontSize: 14 }}>{failed ? "Couldn't make your card." : "Making your card…"}</span>
        )}
      </div>

      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10 }}>
        {canShareFile && (
          <button type="button" className="btn btn-gold" onClick={share}>
            <Share size={18} /> Share to story
          </button>
        )}
        {url && (
          <a className={`btn ${canShareFile ? "btn-outline" : "btn-gold"}`} href={url} download={file?.name}>
            <Download size={18} /> Save image
          </a>
        )}
        <p className="muted" style={{ margin: 0, textAlign: "center", fontSize: 12 }}>
          {canShareFile ? "Pick Instagram, then Story." : "Save it, then post it to your story."}
        </p>
      </div>
    </div>
  );
}
