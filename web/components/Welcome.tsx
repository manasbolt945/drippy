"use client";

import { Logo, Plus, ShareGold, Star } from "./icons";

export default function Welcome({ onStart, onUpload }: { onStart: () => void; onUpload: () => void }) {
  return (
    <div className="screen sky" style={{ padding: "calc(40px + var(--safe-top)) 24px calc(28px + var(--safe-bottom))", gap: 26 }}>
      <Logo size={52} wordSize={26} />

      <div className="card" style={{ position: "relative", height: 250, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <svg width="100%" height="100%" viewBox="0 0 358 250" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
          <g fill="#F4EFE3">
            <circle cx="34" cy="62" r="1.2" opacity=".7" /><circle cx="88" cy="28" r="1" opacity=".5" />
            <circle cx="140" cy="52" r="1.4" opacity=".8" /><circle cx="214" cy="22" r="1" opacity=".6" />
            <circle cx="262" cy="46" r="1.2" opacity=".5" /><circle cx="318" cy="120" r="1.4" opacity=".7" />
            <circle cx="302" cy="204" r="1" opacity=".5" /><circle cx="58" cy="168" r="1" opacity=".6" />
            <circle cx="24" cy="226" r="1.3" opacity=".7" /><circle cx="188" cy="236" r="1" opacity=".5" />
          </g>
          <path d="M318 26a16 16 0 1 0 14 24a13 13 0 1 1 -14 -24z" fill="#F2D27A" opacity=".9" />
        </svg>
        <svg width="170" height="170" viewBox="0 0 190 190" role="img" aria-label="Example score of 88" style={{ position: "relative" }}>
          <circle cx="95" cy="95" r="78" fill="none" stroke="var(--track)" strokeWidth="14" />
          <circle cx="95" cy="95" r="78" fill="none" stroke="var(--gold)" strokeWidth="14" strokeLinecap="round" strokeDasharray="490.1" strokeDashoffset="58.8" transform="rotate(-90 95 95)" />
          <text x="95" y="104" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-display)" fontWeight="800" fontSize="64">88</text>
          <text x="95" y="130" textAnchor="middle" fill="var(--muted)" fontFamily="var(--font-body)" fontWeight="700" fontSize="11" letterSpacing="1.5">OVERALL</text>
        </svg>
        <Badge style={{ left: 16, top: 18 }}>Work 92</Badge>
        <Badge style={{ right: 16, top: 64 }}>Date night 89</Badge>
        <Badge style={{ left: 28, bottom: 22 }}>Wedding 74</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 36, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
          Snap your fit.<br />Get your score.
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
          AI rates your outfit for work, weddings, dates and more, and tells you how to level it up.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 15 }}>
        <Feature icon={<Star />}>Scores for 8 occasions</Feature>
        <Feature icon={<Plus />}>Quick tips to fix what's off</Feature>
        <Feature icon={<ShareGold />}>Share your score to your story</Feature>
      </div>

      <div style={{ flexGrow: 1 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button type="button" className="btn btn-gold" onClick={onStart}>Allow camera &amp; start</button>
        <button type="button" className="btn btn-outline" onClick={onUpload}>Upload a photo instead</button>
        <p className="muted" style={{ margin: "4px 0 0", textAlign: "center", fontSize: 12 }}>
          We rate the clothes, never your body or face.
        </p>
      </div>
    </div>
  );
}

function Badge({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", padding: "6px 12px", borderRadius: 999, background: "var(--surface-2)", fontSize: 13, fontWeight: 600, ...style }}>
      {children}
    </div>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {icon}
      <span>{children}</span>
    </div>
  );
}
