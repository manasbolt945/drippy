"use client";

import { useEffect, useState } from "react";
import { listScans } from "@/lib/backend";
import { occasionLabel } from "@/lib/occasions";
import { type ScanWithPhoto, scoreColor } from "@/lib/types";

function when(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1 && new Date().getDate() === d.getDate()) return "Today";
  if (days < 2) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function History({ onDone, onOpen }: { onDone: () => void; onOpen: (item: ScanWithPhoto) => void }) {
  const [items, setItems] = useState<ScanWithPhoto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    listScans().then(setItems).catch(() => setError(true));
  }, []);

  const scores = (items ?? []).map((i) => i.scan.overall ?? 0);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores) : 0;

  return (
    <div className="screen sky scroll" style={{ padding: "calc(12px + var(--safe-top)) 16px calc(28px + var(--safe-bottom))", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="display" style={{ margin: 0, fontSize: 30 }}>Your fits</h1>
        <button type="button" className="btn btn-outline" style={{ height: 44 }} onClick={onDone}>Done</button>
      </div>

      {items && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <Stat value={String(items.length)} label="Fits rated" />
          <Stat value={String(avg)} label="Average" />
          <Stat value={String(best)} label="Best ever" color="var(--gold)" />
        </div>
      )}

      {error && <p className="muted" style={{ margin: 0 }}>We couldn&apos;t load your fits. Check your connection and try again.</p>}
      {!items && !error && <p className="muted" style={{ margin: 0 }}>Loading…</p>}
      {items?.length === 0 && (
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <span className="display" style={{ fontSize: 20 }}>No fits yet</span>
          <span className="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>Snap your first outfit and its score shows up here.</span>
          <button type="button" className="btn btn-gold" style={{ marginTop: 8, height: 48, fontSize: 15 }} onClick={onDone}>Rate a fit</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items?.map((item) => {
          const s = item.scan;
          const top = [...(s.occasions ?? [])].sort((a, b) => b.score - a.score)[0];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onOpen(item)}
              className="card"
              style={{ display: "flex", alignItems: "center", gap: 14, padding: 10, border: 0, textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ flexShrink: 0, width: 56, height: 72, borderRadius: 12, overflow: "hidden", background: "var(--surface-2)" }}>
                {item.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{s.headline}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {when(s.created_at)}
                  {top ? ` · Best for ${occasionLabel(top.occasion)}` : ""}
                </span>
              </div>
              <span className="display" style={{ flexShrink: 0, width: 52, textAlign: "center", fontSize: 26, color: scoreColor(s.overall ?? 0) }}>
                {s.overall}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="card" style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="display" style={{ fontSize: 26, color }}>{value}</span>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
    </div>
  );
}
