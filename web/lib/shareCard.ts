import { logoDataUrl } from "./logo";
import { occasionLabel } from "./occasions";
import { type Scan, scoreHex } from "./types";

const W = 1080;
const H = 1920;

function cssFont(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** The photo is a local blob: or data: URL, so it never taints the canvas. */
async function loadPhoto(photoUrl: string): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(await (await fetch(photoUrl)).blob());
    } catch {
      // Some in-app browsers (e.g. Instagram's on Android) lack this path; fall back to an <img>.
    }
  }
  return loadImage(photoUrl);
}

/** Waits for the app fonts, but never longer than a moment: an in-app browser may never resolve this. */
async function loadFonts(specs: string[]): Promise<void> {
  try {
    if (!document.fonts?.load) return;
    await Promise.race([Promise.all(specs.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    // Canvas falls back to the system font.
  }
}

/** JPEG keeps the card small (~300 KB) for sharing; toDataURL covers browsers where toBlob fails. */
async function exportJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    } catch {
      resolve(null);
    }
  });
  if (blob) return blob;
  const [meta, data] = canvas.toDataURL("image/jpeg", 0.92).split(",");
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: meta.slice(5).split(";")[0] || "image/jpeg" });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, "")}…`;
    return kept;
  }
  return lines;
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  // Drawn with arcs rather than roundRect(), which older WebViews don't have.
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
}

/** Draws the 9:16 story image: photo, Drippy logo, score ring, verdict, best occasions. */
export async function renderShareCard(scan: Scan, photoUrl: string | null, siteHost: string): Promise<Blob> {
  const display = cssFont("--font-display", "sans-serif");
  const body = cssFont("--font-body", "sans-serif");
  await loadFonts([`800 100px ${display}`, `700 40px ${body}`]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0B1026";
  ctx.fillRect(0, 0, W, H);
  if (photoUrl) {
    try {
      const img = await loadPhoto(photoUrl);
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2.6, dw, dh);
    } catch {
      // No photo: the night background alone still makes a valid card.
    }
  }

  // Top: logo
  const top = ctx.createLinearGradient(0, 0, 0, 260);
  top.addColorStop(0, "rgba(7,11,26,0.55)");
  top.addColorStop(1, "rgba(7,11,26,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, 260);
  try {
    ctx.drawImage(await loadImage(logoDataUrl()), 54, 54, 80, 80);
  } catch {
    // Card still works with just the name.
  }
  ctx.fillStyle = "#F4EFE3";
  ctx.font = `800 54px ${display}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Drippy", 154, 95);

  // Bottom: fade, ring, verdict
  const fade = ctx.createLinearGradient(0, H * 0.42, 0, H);
  fade.addColorStop(0, "rgba(7,11,26,0)");
  fade.addColorStop(0.4, "rgba(7,11,26,0.9)");
  fade.addColorStop(1, "rgba(7,11,26,0.97)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, H * 0.42, W, H * 0.58);

  const value = scan.overall ?? 0;
  const cx = W / 2;
  const cy = 1180;
  const r = 170;
  ctx.fillStyle = "rgba(7,11,26,0.8)";
  ctx.beginPath();
  ctx.arc(cx, cy, r + 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 32;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1F2A4A";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = scoreHex(value);
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * value) / 100);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#F4EFE3";
  ctx.font = `800 150px ${display}`;
  ctx.fillText(String(value), cx, cy - 4);
  ctx.fillStyle = "#98A2C0";
  ctx.font = `700 30px ${body}`;
  ctx.fillText("O V E R A L L", cx, cy + 82);

  ctx.fillStyle = "#F4EFE3";
  ctx.font = `700 58px ${display}`;
  const lines = wrapLines(ctx, scan.headline ?? "", W - 160, 3);
  let y = 1440;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += 70;
  }

  // Best three occasions as chips
  const best = [...(scan.occasions ?? [])].sort((a, b) => b.score - a.score).slice(0, 3);
  ctx.font = `600 34px ${body}`;
  const labels = best.map((o) => `${occasionLabel(o.occasion)} ${o.score}`);
  const widths = labels.map((l) => ctx.measureText(l).width + 56);
  const gap = 18;
  let x = cx - (widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1)) / 2;
  y += 40;
  labels.forEach((label, i) => {
    ctx.fillStyle = "rgba(244,239,227,0.16)";
    pill(ctx, x, y - 34, widths[i], 68);
    ctx.fillStyle = "#F4EFE3";
    ctx.fillText(label, x + widths[i] / 2, y + 1);
    x += widths[i] + gap;
  });

  ctx.fillStyle = "#E6B547";
  ctx.font = `700 36px ${body}`;
  ctx.fillText(`What's your score? Try Drippy · ${siteHost}`, cx, H - 110);

  return exportJpeg(canvas);
}
