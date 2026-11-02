"use client";

import { Close } from "./icons";

interface Props {
  title: string;
  message: string;
  tips?: boolean;
  primary: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  onClose: () => void;
}

const TIPS: [React.ReactNode, string][] = [
  [<path key="a" d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />, "Step back so your whole outfit is in frame"],
  [
    <g key="b"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></g>,
    "Find good light, facing a window works best",
  ],
  [<g key="c"><rect x="5" y="2" width="14" height="20" rx="3" /><path d="M9 18h6" /></g>, "A mirror selfie is perfect"],
];

/** Full-screen message: "can't rate this photo", daily limit, connection problems. */
export default function Notice({ title, message, tips, primary, secondary, onClose }: Props) {
  return (
    <div className="screen sky" style={{ padding: "calc(12px + var(--safe-top)) 20px calc(28px + var(--safe-bottom))", gap: 24 }}>
      <div style={{ display: "flex" }}>
        <button type="button" className="icon-btn solid" aria-label="Close" onClick={onClose}><Close /></button>
      </div>

      <div className="card" style={{ height: 200, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
          <circle cx="12" cy="9" r="2.2" />
          <path d="M8.5 17c.5-2.5 1.8-4 3.5-4s3 1.5 3.5 4" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>{title}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>{message}</p>
      </div>

      {tips && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 15 }}>
          {TIPS.map(([icon, text]) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ flexGrow: 1 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button type="button" className="btn btn-gold" onClick={primary.onClick}>{primary.label}</button>
        {secondary && <button type="button" className="btn btn-outline" onClick={secondary.onClick}>{secondary.label}</button>}
      </div>
    </div>
  );
}
