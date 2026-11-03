"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Mascot from "./Mascot";

const MASCOT = 220;
const SLOT = 34;
const RING_C = 439.8;

/**
 * First-run screen with no headline: the mascot tells the story in three scenes (Snap → Get rated → Share)
 * inside a mirror, flying up to become the logo before "Drippy". Loops until the user allows the camera.
 */
export default function Welcome({ onStart, onUpload }: { onStart: () => void; onUpload: () => void }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const [fly, setFly] = useState({ x: 0, y: -300, k: SLOT / MASCOT });

  // Measure where the logo slot is, so the mascot lands exactly there on any screen size.
  useLayoutEffect(() => {
    const measure = () => {
      const s = slotRef.current?.getBoundingClientRect();
      const m = mascotRef.current?.getBoundingClientRect();
      if (!s || !m) return;
      setFly({ x: s.left + s.width / 2 - (m.left + m.width / 2), y: s.top + s.height / 2 - (m.top + m.height / 2), k: SLOT / MASCOT });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div
      // Browsers read the --fly-* values when an animation starts, so restart the story whenever they change.
      key={`${fly.x},${fly.y}`}
      className="screen sky welcome"
      style={{ ["--fly-x" as string]: `${fly.x}px`, ["--fly-y" as string]: `${fly.y}px`, ["--fly-k" as string]: fly.k }}
    >
      <div style={{ paddingTop: "calc(24px + var(--safe-top))", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        <div ref={slotRef} className="w-slot" style={{ width: SLOT, height: SLOT }} />
        <span className="display" style={{ fontSize: 22 }}>Drippy</span>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "16px 24px 0" }} aria-hidden="true">
        {["w-s1", "w-s2", "w-s3"].map((c) => (
          <div key={c} style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(244,239,227,.18)", overflow: "hidden" }}>
            <div className={c} style={{ height: "100%", background: "var(--gold)" }} />
          </div>
        ))}
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }} aria-hidden="true">
        <div className="w-mirror" />
        <div className="w-mirror w-glow" />
        <div className="w-card">
          <svg width="160" height="160" viewBox="0 0 176 176">
            <circle cx="88" cy="88" r="80" fill="var(--bg)" fillOpacity=".85" />
            <circle cx="88" cy="88" r="70" fill="none" stroke="var(--surface-2)" strokeWidth="13" />
            <circle className="w-ring" cx="88" cy="88" r="70" fill="none" stroke="var(--gold)" strokeWidth="13" strokeLinecap="round" strokeDasharray={RING_C} transform="rotate(-90 88 88)" />
            <text x="88" y="102" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-display)" fontWeight="800" fontSize="60">88</text>
          </svg>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="w-chip w-p1">Work 92</span>
            <span className="w-chip w-p2">Date 89</span>
          </div>
          <span className="w-chip w-p3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
            Share
          </span>
        </div>
        {/* The anchor never moves (it is what we measure); the inner layer does the flying. */}
        <div ref={mascotRef} className="w-anchor" style={{ width: MASCOT, height: MASCOT, marginLeft: -MASCOT / 2, marginTop: -MASCOT / 2 }}>
          <div className="w-fly dm-welcome"><Mascot size={MASCOT} /></div>
        </div>
      </div>

      <div style={{ position: "relative", height: 40, margin: "8px 0 4px" }} aria-hidden="true">
        <span className="w-cap w-c1">Snap</span>
        <span className="w-cap w-c2">Get rated</span>
        <span className="w-cap w-c3">Share</span>
      </div>
      <p className="visually-hidden">Drippy: snap a mirror selfie, get your fit rated for every occasion, and share it.</p>

      <div style={{ padding: "12px 24px calc(24px + var(--safe-bottom))", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <button type="button" className="btn btn-gold" style={{ width: "100%", height: 58 }} onClick={onStart}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          Allow camera
        </button>
        <button type="button" onClick={onUpload} style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "none", color: "var(--gold-text)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
          Upload a photo
        </button>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#5A6688" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.4-3.4 8.2-8 9-4.6-.8-8-4.6-8-9V6z" /></svg>
          Clothes only, never faces
        </span>
      </div>
    </div>
  );
}
