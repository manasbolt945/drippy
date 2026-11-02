"use client";

import { useEffect, useState } from "react";
import Mascot from "./Mascot";

const SESSION = 3.6; // seconds: one quick selfie session, ending on the happy sparkle
const CAPTIONS = ["Polishing the mirror…", "Finding your best light…", "Practising some angles…", "Strike a pose…", "Ready when you are!"];
const STARS: [number, number, number, number][] = [
  [9, 13, 3, 0], [85, 10, 2, .6], [20, 30, 2, 1.2], [82, 36, 3, .3], [13, 71, 2, .9], [87, 76, 2, 1.6], [48, 8, 2, 2], [67, 88, 3, 1.1],
];

/** App-opening screen: the mascot runs one selfie session, then the app fades in. Tap to skip. */
export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const leave = setTimeout(() => setLeaving(true), reduce ? 900 : SESSION * 1000);
    return () => clearTimeout(leave);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const done = setTimeout(onDone, 350);
    return () => clearTimeout(done);
  }, [leaving, onDone]);

  return (
    <div
      className="screen sky"
      role="status"
      aria-label="Drippy is loading"
      onClick={() => setLeaving(true)}
      style={{
        zIndex: 30,
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        animation: leaving ? "dm-fade-out .35s ease-out forwards" : undefined,
        ["--dm-loop" as string]: `${SESSION}s`,
        ["--dm-runs" as string]: 1,
      }}
    >
      {STARS.map(([x, y, s, d]) => (
        <span key={`${x}-${y}`} className="dm-star" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }} />
      ))}
      <div style={{ position: "absolute", left: "50%", top: "15%", width: 280, height: 400, marginLeft: -140, border: "2px solid rgba(244,239,227,.12)", borderBottom: 0, borderRadius: "140px 140px 0 0" }} />
      <div className="dm-flash-glow" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 36%, rgba(255,244,214,.9), rgba(255,244,214,.25) 35%, rgba(255,244,214,0) 70%)" }} />

      <div style={{ position: "relative", marginTop: -40 }}>
        <Mascot size={240} mode="session" />
      </div>
      <span className="display" style={{ position: "relative", marginTop: 44, fontSize: 46, letterSpacing: "-0.03em" }}>Drippy</span>
      <div style={{ position: "relative", width: "100%", height: 22, marginTop: 12, textAlign: "center" }}>
        {CAPTIONS.map((t, i) => (
          <span key={t} className={`dm-cap c${i} muted`} style={{ fontSize: 15 }}>{t}</span>
        ))}
      </div>
      <div style={{ position: "absolute", left: "50%", width: 180, marginLeft: -90, bottom: "calc(64px + var(--safe-bottom))", height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
        <div className="dm-progress loop" />
      </div>
    </div>
  );
}
