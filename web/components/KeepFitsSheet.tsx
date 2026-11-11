"use client";

import { PROVIDERS, type Provider } from "@/lib/backend";
import Mascot from "./Mascot";
import { ProviderIcon } from "./ProviderIcon";

interface Props {
  onEmail: () => void;
  onProvider: (p: Provider) => void;
  onLater: () => void;
}

/** The mascot in sunglasses: a peek at dressing up your Drippy once you have an account. */
export function StyledMascot({ size }: { size: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Kept still so the glasses stay on its eyes. */}
      <Mascot size={size} />
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d="M33.5 35.5h33" stroke="#F8DC86" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="34.5" y="32" width="14" height="9.5" rx="4.2" fill="#0A0F24" stroke="#F8DC86" strokeWidth="1.3" />
        <rect x="51.5" y="32" width="14" height="9.5" rx="4.2" fill="#0A0F24" stroke="#F8DC86" strokeWidth="1.3" />
        <path d="M37 34.5l3 -1.2" stroke="#FFF4D6" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M54 34.5l3 -1.2" stroke="#FFF4D6" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Screen 4: after a guest's score, offer to keep their fits (and tease mascot styling). */
export default function KeepFitsSheet({ onEmail, onProvider, onLater }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onLater}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Keep your fits" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <StyledMascot size={88} />
        <h2 className="display" style={{ margin: 0, fontSize: 24 }}>Keep your fits</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14, textAlign: "center" }}>Scores and history on every device</p>
        <span className="soon-chip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></svg>
          Dress up your Drippy · soon
        </span>

        {PROVIDERS.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 14, paddingTop: 4 }}>
            {PROVIDERS.map((p) => (
              <button key={p} type="button" className="provider-btn" aria-label={`Continue with ${p[0].toUpperCase()}${p.slice(1)}`} onClick={() => onProvider(p)}>
                <ProviderIcon provider={p} size={22} />
              </button>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-gold" style={{ width: "100%" }} onClick={onEmail}>
          <ProviderIcon provider="email" />
          Continue with email
        </button>
        <button type="button" className="link-btn muted-link" onClick={onLater}>Not now</button>
      </div>
    </div>
  );
}
