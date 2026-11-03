import { logoDataUrl } from "@/lib/logo";

type P = { size?: number };
const base = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Close = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2.2" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Share = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
  </svg>
);
export const HistoryIcon = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </svg>
);
export const Flash = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
  </svg>
);
export const Gallery = ({ size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
export const Flip = ({ size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2" />
    <path d="M20 4v4h-4M4 20v-4h4" />
  </svg>
);
export const Sparkle = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2.2" aria-hidden="true">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </svg>
);
export const Check = ({ size = 20, color = "var(--gold)" }: P & { color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth="2.6" aria-hidden="true">
    <path d="M5 12l4 4 10-10" />
  </svg>
);
export const Star = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke="var(--gold)" strokeWidth="2" aria-hidden="true">
    <path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z" />
  </svg>
);
export const Plus = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke="var(--gold)" strokeWidth="2" aria-hidden="true">
    <path d="M4 12h16M12 4v16" />
  </svg>
);
export const ShareGold = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke="var(--gold)" strokeWidth="2" aria-hidden="true">
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
  </svg>
);
export const Download = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
);

export const Report = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2.2" aria-hidden="true">
    <path d="M5 20V11M12 20V5M19 20v-6" />
  </svg>
);
export const Palette = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.4-9-7.4z" />
    <circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14.5" cy="7" r="1" />
  </svg>
);
export const Ruler = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <path d="M3 17L17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" />
  </svg>
);
export const Layers = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2" aria-hidden="true">
    <path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" />
  </svg>
);

/** The Mirror Selfie Star tile next to the name. */
export function Logo({ size = 40, wordSize = 22 }: { size?: number; wordSize?: number }) {
  return (
    <div className="logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoDataUrl()} alt="" width={size} height={size} style={{ borderRadius: size * 0.23, boxShadow: "0 0 0 1px #1D2748" }} />
      <span className="display" style={{ fontSize: wordSize }}>Drippy</span>
    </div>
  );
}
