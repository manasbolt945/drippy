"use client";

import { useState } from "react";
import { occasionLabel } from "@/lib/occasions";
import { bestTiles, defaultHeroOccasion, heroFor } from "@/lib/hero";
import { type Scan, scoreHex } from "@/lib/types";
import { Close, Share } from "./icons";
import Mascot from "./Mascot";
import ReportContent from "./ReportContent";

interface Props {
  scan: Scan;
  photoUrl: string | null;
  onClose: () => void;
  /**
   * Share the story card for what's on screen: `occasion` is the big score's occasion (null = overall),
   * `showVerdict` mirrors whether the thought bubble is showing.
   */
  onShare: (opts: { showVerdict: boolean; occasion: string | null }) => void;
}

const RC = 2 * Math.PI * 40;
const MASCOT = 60;

/** See-through score ring for the glass sheet. */
function GlassRing({ value, label }: { value: number; label: string }) {
  return (
    <svg width="88" height="88" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="9" />
      <circle
        className="ring-arc"
        cx="50" cy="50" r="40" fill="none" stroke={scoreHex(value)} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={RC} strokeDashoffset={RC * (1 - value / 100)} transform="rotate(-90 50 50)"
      />
      <text x="50" y="57" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-display)" fontWeight="800" fontSize="30">{value}</text>
      <text x="50" y="71" textAnchor="middle" fill="rgba(244,239,227,.75)" fontFamily="var(--font-body)" fontWeight="700" fontSize={label.length > 9 ? 7 : 8.5} letterSpacing="1">{label}</text>
    </svg>
  );
}

/**
 * Full-photo result with a liquid-glass peek sheet (design canvas "Peek sheet D1"):
 * the score ring sits on the sheet's edge with the mascot perched on it, reacting to the score,
 * and the verdict floats above as the mascot's thought. The arrow slides the sheet up into the full report.
 */
export default function Result({ scan, photoUrl, onClose, onShare }: Props) {
  const [focus, setFocus] = useState<string | null>(null);
  const [thought, setThought] = useState(true);
  const [open, setOpen] = useState(false);

  // Opens on the occasion picked before rating (or the overall score); tapping a tile switches to that one.
  const defaultOccasion = defaultHeroOccasion(scan);
  const { occasion: heroOccasion, value, label, text } = heroFor(scan, focus ?? defaultOccasion);
  const tiles = bestTiles(scan, defaultOccasion);

  // The story card shows the same score, and the verdict only if it's showing here too.
  const share = () => onShare({ showVerdict: thought, occasion: heroOccasion });

  const pick = (occasion: string) => {
    setFocus(focus === occasion ? null : occasion);
    setThought(true);
  };

  return (
    <div className="screen" style={{ background: "#0B1026" }}>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Your outfit" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%" }} />
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "linear-gradient(to bottom, rgba(7,11,26,0), rgba(7,11,26,.55))", pointerEvents: "none" }} />

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "calc(12px + var(--safe-top)) 16px 0", display: "flex", justifyContent: "space-between", zIndex: 2 }}>
        <button type="button" className="icon-btn glass" aria-label="Close" onClick={onClose}><Close /></button>
        <button type="button" className="icon-btn glass" aria-label="Share" onClick={share}><Share /></button>
      </div>

      <div className={`r-sheet glass-dark${open ? " open" : ""}${tiles.length ? "" : " compact"}`}>
        {/* The mascot's thought: the verdict, or the reason for the occasion you picked. Tap it to dismiss. */}
        {thought && !open && text && (
          <div className="r-thought" key={`${heroOccasion}-${value}`} aria-live="polite">
            <span className="r-dot big" /><span className="r-dot small" />
            <button type="button" className="glass-dark r-cloud" aria-label="Hide the verdict" onClick={() => setThought(false)}>
              <p className="display">{text}</p>
            </button>
          </div>
        )}
        {/* While it's hidden, a little "…" by the mascot's head hints that it has something to say */}
        {!thought && !open && text && (
          <button type="button" className="r-hint glass-dark" aria-label="Show the verdict" onClick={() => setThought(true)}>
            <span /><span /><span />
          </button>
        )}
        <button type="button" className="r-perch" aria-label={thought ? "Hide the verdict" : "Show the verdict"} onClick={() => setThought(!thought)}>
          <span className="r-mascot"><Mascot size={MASCOT} mode="mood" score={value} /></span>
          <span className="r-badge glass"><GlassRing value={value} label={label} /></span>
        </button>
        <button type="button" className="r-chev glass" aria-label={open ? "Close the full report" : "See the full report"} aria-expanded={open} onClick={() => setOpen(!open)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .3s" }}><path d="M6 15l6-6 6 6" /></svg>
        </button>

        <div className="r-body scroll">
          <div style={{ display: "flex", gap: 8 }} role="radiogroup" aria-label="Show the score for an occasion">
            {tiles.map((o) => (
              <button
                key={o.occasion}
                type="button"
                role="radio"
                aria-checked={focus === o.occasion}
                className={`glass r-tile${focus === o.occasion ? " on" : ""}`}
                onClick={() => pick(o.occasion)}
              >
                <span className="display" style={{ fontSize: 22, color: scoreHex(o.score) }}>{o.score}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{occasionLabel(o.occasion)}</span>
              </button>
            ))}
          </div>
          {open && <ReportContent scan={scan} />}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn gold-glass" style={{ flex: 1, height: 54, fontSize: 16 }} onClick={share}>
            <Share size={18} /> Share
          </button>
          <button type="button" className="btn glass" style={{ height: 54, padding: "0 20px", fontSize: 15, fontWeight: 600 }} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            New fit
          </button>
        </div>
      </div>
    </div>
  );
}
