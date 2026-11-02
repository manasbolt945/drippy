"use client";

import { useEffect, useState } from "react";
import { scoreColor } from "@/lib/types";

const R = 70;
const C = 2 * Math.PI * R;

/** Ring that fills to `value` (0–100) on mount and when the value changes. */
export default function ScoreRing({ value, label, size = 176 }: { value: number; label: string; size?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <svg width={size} height={size} viewBox="0 0 176 176" role="img" aria-label={`Score ${value}, ${label.toLowerCase()}`}>
      <circle cx="88" cy="88" r="86" fill="var(--bg)" />
      <circle cx="88" cy="88" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="13" />
      <circle
        className="ring-arc"
        cx="88"
        cy="88"
        r={R}
        fill="none"
        stroke={scoreColor(value)}
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - shown / 100)}
        transform="rotate(-90 88 88)"
      />
      <text x="88" y="98" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-display)" fontWeight="800" fontSize="58">
        {value}
      </text>
      <text x="88" y="122" textAnchor="middle" fill="var(--muted)" fontFamily="var(--font-body)" fontWeight="700" fontSize="11" letterSpacing="1.5">
        {label}
      </text>
    </svg>
  );
}
