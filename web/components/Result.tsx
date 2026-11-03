"use client";

import { useState } from "react";
import { occasionLabel } from "@/lib/occasions";
import { type Scan, scoreColor } from "@/lib/types";
import { Close, Report, Share } from "./icons";
import ReportSheet from "./ReportSheet";
import ScoreRing from "./ScoreRing";

interface Props {
  scan: Scan;
  photoUrl: string | null;
  onClose: () => void;
  onShare: () => void;
}

/** Just the essentials: photo, score, verdict, best occasions. The details live in the report sheet. */
export default function Result({ scan, photoUrl, onClose, onShare }: Props) {
  const [focus, setFocus] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const occasions = [...(scan.occasions ?? [])].sort((a, b) => b.score - a.score);
  const focused = occasions.find((o) => o.occasion === focus);
  const heroValue = focused ? focused.score : scan.overall ?? 0;
  const heroLabel = focused ? `FOR ${occasionLabel(focused.occasion).toUpperCase()}` : "OVERALL";
  const heroText = focused ? focused.reason : scan.headline;

  return (
    <div className="screen sky">
      <div className="scroll" style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "relative", height: 320, background: "#0B1026" }}>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Your outfit" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
          )}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "calc(12px + var(--safe-top)) 16px 0", display: "flex", justifyContent: "space-between" }}>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Close /></button>
            <button type="button" className="icon-btn" aria-label="Share" onClick={onShare}><Share /></button>
          </div>
        </div>

        <div style={{ position: "relative", marginTop: -36, borderRadius: "28px 28px 0 0", background: "var(--bg)", padding: "0 20px 150px", display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: -84 }}>
            <ScoreRing value={heroValue} label={heroLabel} />
            <p className="display" style={{ margin: 0, textAlign: "center", fontWeight: 700, fontSize: 21, lineHeight: 1.25, letterSpacing: "-0.01em", maxWidth: 320 }} aria-live="polite">
              {heroText}
            </p>
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="label">Best for</span>
              <button type="button" className="report-btn" aria-label="See full breakdown" onClick={() => setReportOpen(true)}>
                <Report size={18} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }} role="radiogroup" aria-label="Show the score for an occasion">
              {occasions.slice(0, 3).map((o) => {
                const on = focus === o.occasion;
                return (
                  <button
                    key={o.occasion}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setFocus(on ? null : o.occasion)}
                    className={`best-tile${on ? " on" : ""}`}
                  >
                    <span className="display" style={{ fontSize: 30, color: scoreColor(o.score) }}>{o.score}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{occasionLabel(o.occasion)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "28px 16px calc(20px + var(--safe-bottom))", display: "flex", gap: 10, background: "linear-gradient(to bottom, rgba(7,11,26,0), var(--bg) 35%)" }}>
        <button type="button" className="btn btn-gold" style={{ flexGrow: 1, fontSize: 16 }} onClick={onShare}>
          <Share size={18} /> Share to story
        </button>
        <button type="button" className="btn btn-outline" style={{ height: 56 }} onClick={onClose}>New fit</button>
      </div>

      {reportOpen && <ReportSheet scan={scan} onClose={() => setReportOpen(false)} />}
    </div>
  );
}
