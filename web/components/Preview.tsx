"use client";

import { OCCASIONS, type OccasionId } from "@/lib/occasions";
import { Close, Sparkle } from "./icons";

interface Props {
  photoUrl: string;
  occasion: OccasionId | null;
  onOccasion: (o: OccasionId | null) => void;
  onRate: () => void;
  onRetake: () => void;
}

export default function Preview({ photoUrl, occasion, onOccasion, onRate, onRetake }: Props) {
  return (
    <div className="screen" style={{ background: "#0B1026" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl} alt="Your photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "calc(12px + var(--safe-top)) 16px 0", display: "flex", justifyContent: "space-between" }}>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onRetake}><Close /></button>
        <button type="button" className="pill-btn" onClick={onRetake}>Retake</button>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "80px 20px calc(28px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 14, background: "linear-gradient(to bottom, rgba(7,11,26,0), rgba(7,11,26,0.9) 45%)" }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
          <span style={{ color: "#D9D9DE" }}>Headed to:</span>
          <select
            className="select-pill"
            value={occasion ?? ""}
            onChange={(e) => onOccasion((e.target.value || null) as OccasionId | null)}
          >
            <option value="">Anywhere</option>
            {OCCASIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-gold" style={{ height: 58, fontSize: 18 }} onClick={onRate}>
          <Sparkle /> Rate my fit
        </button>
        <p className="muted" style={{ margin: 0, textAlign: "center", fontSize: 12 }}>Only you can see this photo unless you share it.</p>
      </div>
    </div>
  );
}
