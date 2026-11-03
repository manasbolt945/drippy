"use client";

import { occasionLabel } from "@/lib/occasions";
import { type Scan, scoreColor } from "@/lib/types";
import { Layers, Palette, Ruler, Sparkle } from "./icons";

const BARS = [
  ["color_harmony", "Color harmony", <Palette key="p" />],
  ["fit", "Fit", <Ruler key="r" />],
  ["styling", "Styling", <Sparkle key="s" size={18} />],
  ["cohesion", "Cohesion", <Layers key="l" />],
] as const;

/** The full report: verdict, breakdown, every occasion with its reason, and tips. Shown when the result sheet slides up. */
export default function ReportContent({ scan }: { scan: Scan }) {
  const occasions = [...(scan.occasions ?? [])].sort((a, b) => b.score - a.score);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {scan.headline && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="label">Verdict</span>
          <p className="display" style={{ margin: 0, fontWeight: 700, fontSize: 18, lineHeight: 1.25 }}>{scan.headline}</p>
        </section>
      )}

      {scan.breakdown && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="label">Breakdown</span>
          {BARS.map(([key, label, icon]) => {
            const v = scan.breakdown![key];
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="muted" style={{ display: "flex" }}>{icon}</span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${v}%`, background: scoreColor(v) }} /></div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="label">Every occasion</span>
        {occasions.map((o) => (
          <div key={o.occasion} className="glass" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16 }}>
            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{occasionLabel(o.occasion)}</span>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>{o.reason}</span>
            </div>
            <span className="display" style={{ flexShrink: 0, fontSize: 22, color: scoreColor(o.score) }}>{o.score}</span>
          </div>
        ))}
      </section>

      {!!scan.tips?.length && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="label">Level it up</span>
          {scan.tips.map((tip, i) => (
            <div key={tip} className="glass" style={{ display: "flex", gap: 12, padding: 14, borderRadius: 16, fontSize: 14, lineHeight: 1.45 }}>
              <span className="tip-num">{i + 1}</span>
              <span>{tip}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
