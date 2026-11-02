"use client";

import Mascot from "./Mascot";

/**
 * Shown while the score-fit request runs: the mascot dances through selfie sessions over the photo.
 * When the score is back (`finishing`), it switches to a happy bounce and the progress bar completes.
 */
export default function Scanning({ photoUrl, finishing = false }: { photoUrl: string; finishing?: boolean }) {
  return (
    <div className="screen" style={{ background: "#0B1026" }} role="status" aria-busy={!finishing} aria-label={finishing ? "Your score is ready" : "Rating your fit"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(7,11,26,0.62)" }} />
      {!finishing && <div className="scanline" />}
      {!finishing && (
        <div className="dm-flash-glow" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 42%, rgba(255,244,214,.75), rgba(255,244,214,.2) 35%, rgba(255,244,214,0) 70%)" }} />
      )}

      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", marginTop: -150, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className={finishing ? undefined : "dm-dance"}>
          <Mascot size={260} mode={finishing ? "celebrate" : "session"} />
        </div>
        <div className={finishing ? undefined : "dm-floor"} style={{ width: 160, height: 18, marginTop: -26, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,.7), rgba(0,0,0,0))" }} />
      </div>

      <div style={{ position: "absolute", left: "50%", width: 150, marginLeft: -75, bottom: "calc(48px + var(--safe-bottom))", height: 5, borderRadius: 999, background: "rgba(244,239,227,.14)", overflow: "hidden" }}>
        <div className={`dm-progress ${finishing ? "done" : "wait"}`} />
      </div>
    </div>
  );
}
