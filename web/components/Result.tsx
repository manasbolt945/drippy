"use client";

import { useState } from "react";
import { occasionLabel } from "@/lib/occasions";
import { type Scan, scoreColor } from "@/lib/types";
import { Close, Share } from "./icons";
import ScoreRing from "./ScoreRing";

interface Props {
  scan: Scan;
  photoUrl: string | null;
  onClose: () => void;
  onShare: () => void;
}

const BARS = [
  ["color_harmony", "Color harmony"],
  ["fit", "Fit"],
  ["styling", "Styling"],
  ["cohesion", "Cohesion"],
] as const;

export default function Result({ scan, photoUrl, onClose, onShare }: Props) {
  const [focus, setFocus] = useState<string>("overall");
  const [open, setOpen] = useState(false);

  const occasions = [...(scan.occasions ?? [])].sort((a, b) => b.score - a.score);
  const focused = occasions.find((o) => o.occasion === focus);
  const overall = scan.overall ?? 0;
  const heroValue = focused ? focused.score : overall;
  const heroLabel = focused ? `FOR ${occasionLabel(focused.occasion).toUpperCase()}` : "OVERALL";
  const heroText = focused ? focused.reason : scan.headline;

  return (
    <div className="screen sky">
      <div className="scroll" style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "relative", height: 300, background: "#0B1026" }}>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Your outfit" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
          )}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "calc(12px + var(--safe-top)) 16px 0", display: "flex", justifyContent: "space-between" }}>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Close /></button>
            <button type="button" className="icon-btn" aria-label="Share" onClick={onShare}><Share /></button>
          </div>
        </div>

        <div style={{ position: "relative", marginTop: -36, borderRadius: "28px 28px 0 0", background: "var(--bg)", padding: "0 16px 150px", display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: -84 }}>
            <ScoreRing value={heroValue} label={heroLabel} />
            <p className="display" style={{ margin: 0, textAlign: "center", fontWeight: 700, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.01em", maxWidth: 340 }} aria-live="polite">
              {heroText}
            </p>
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="label">Score for</span>
            <div className="chips" style={{ margin: "0 -16px" }} role="radiogroup" aria-label="Score for">
              {[{ occasion: "overall" }, ...occasions].map((o) => (
                <button
                  key={o.occasion}
                  type="button"
                  role="radio"
                  aria-checked={focus === o.occasion}
                  className={`chip flat${focus === o.occasion ? " on" : ""}`}
                  onClick={() => setFocus(o.occasion)}
                >
                  {o.occasion === "overall" ? "Overall" : occasionLabel(o.occasion)}
                </button>
              ))}
            </div>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="label">Best for</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {occasions.slice(0, 3).map((o) => (
                <div key={o.occasion} className="card" style={{ padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span className="display" style={{ fontSize: 28, color: scoreColor(o.score) }}>{o.score}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{occasionLabel(o.occasion)}</span>
                </div>
              ))}
            </div>
          </section>

          {scan.breakdown && (
            <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span className="label">Breakdown</span>
              {BARS.map(([key, label]) => {
                const v = scan.breakdown![key];
                return (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${v}%`, background: scoreColor(v) }} /></div>
                  </div>
                );
              })}
            </section>
          )}

          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
            >
              <span className="label">Every occasion</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--gold-text)" }}>{open ? "Hide" : `Show all ${occasions.length}`}</span>
            </button>
            {open && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {occasions.map((o) => (
                  <div key={o.occasion} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--surface)" }}>
                    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{occasionLabel(o.occasion)}</span>
                      <span className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>{o.reason}</span>
                    </div>
                    <span className="display" style={{ flexShrink: 0, fontSize: 22, color: scoreColor(o.score) }}>{o.score}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!!scan.tips?.length && (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="label">Level it up</span>
              {scan.tips.map((tip, i) => (
                <div key={tip} className="card" style={{ display: "flex", gap: 12, padding: 14, borderRadius: 16, fontSize: 14, lineHeight: 1.45 }}>
                  <span className="tip-num">{i + 1}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "28px 16px calc(20px + var(--safe-bottom))", display: "flex", gap: 10, background: "linear-gradient(to bottom, rgba(7,11,26,0), var(--bg) 35%)" }}>
        <button type="button" className="btn btn-gold" style={{ flexGrow: 1, fontSize: 16 }} onClick={onShare}>
          <Share size={18} /> Share to story
        </button>
        <button type="button" className="btn btn-outline" style={{ height: 56 }} onClick={onClose}>New fit</button>
      </div>
    </div>
  );
}
