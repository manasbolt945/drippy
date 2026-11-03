import { logoDataUrl } from "./logo";
import { moodFor, moodSvgDataUrl } from "./mood";
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

/** Rounded-rectangle path drawn with arcs (older WebViews have no roundRect()). */
function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, bottom = true) {
  const rb = bottom ? r : 0;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - rb);
  if (rb) ctx.arc(x + w - rb, y + h - rb, rb, 0, Math.PI / 2);
  ctx.lineTo(x + rb, y + h);
  if (rb) ctx.arc(x + rb, y + h - rb, rb, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

/**
 * Liquid glass on a canvas: the photo behind the shape, blurred, then a tint, a soft sheen and a light rim.
 * Where canvas blur isn't supported (older Safari), the tint is simply a bit stronger.
 */
function glass(ctx: CanvasRenderingContext2D, bg: HTMLCanvasElement, shape: () => void, dark: boolean) {
  const canBlur = "filter" in ctx;
  ctx.save();
  shape();
  ctx.clip();
  if (canBlur) {
    ctx.filter = "blur(36px) saturate(160%)";
    ctx.drawImage(bg, 0, 0);
    ctx.filter = "none";
  }
  ctx.fillStyle = dark ? (canBlur ? "rgba(10,15,36,0.46)" : "rgba(10,15,36,0.78)") : canBlur ? "rgba(255,255,255,0.08)" : "rgba(30,38,72,0.7)";
  ctx.fillRect(0, 0, W, H);
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, "rgba(255,255,255,0.16)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.03)");
  sheen.addColorStop(1, "rgba(255,255,255,0.08)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  shape();
  ctx.lineWidth = 3;
  ctx.strokeStyle = dark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.26)";
  ctx.stroke();
  ctx.restore();
}

/**
 * The 9:16 story image, matching the result screen: full photo, a glass sheet with the score ring on its edge,
 * the mascot perched on top (in its mood for this score), the verdict as its thought (unless the user hid it), and the best occasions.
 */
export async function renderShareCard(
  scan: Scan,
  photoUrl: string | null,
  siteHost: string,
  { showVerdict = true }: { showVerdict?: boolean } = {},
): Promise<Blob> {
  const display = cssFont("--font-display", "sans-serif");
  const body = cssFont("--font-body", "sans-serif");
  await loadFonts([`800 100px ${display}`, `700 40px ${body}`]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const value = scan.overall ?? 0;

  // Photo, full bleed, with a soft darkening towards the bottom
  ctx.fillStyle = "#0B1026";
  ctx.fillRect(0, 0, W, H);
  if (photoUrl) {
    try {
      const img = await loadPhoto(photoUrl);
      const scale = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * scale) / 2, (H - img.height * scale) / 4, img.width * scale, img.height * scale);
    } catch {
      // No photo: the night background alone still makes a valid card.
    }
  }
  const fade = ctx.createLinearGradient(0, H * 0.5, 0, H);
  fade.addColorStop(0, "rgba(7,11,26,0)");
  fade.addColorStop(1, "rgba(7,11,26,0.6)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);
  const bg = document.createElement("canvas");
  bg.width = W;
  bg.height = H;
  bg.getContext("2d")!.drawImage(canvas, 0, 0);

  // Top: logo in a glass pill
  glass(ctx, bg, () => roundedPath(ctx, 44, 44, 330, 112, 56), false);
  try {
    ctx.drawImage(await loadImage(logoDataUrl()), 64, 60, 80, 80);
  } catch {
    // Card still works with just the name.
  }
  ctx.fillStyle = "#F4EFE3";
  ctx.font = `800 54px ${display}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("Drippy", 162, 102);

  // Bottom: the glass sheet
  const sheetTop = 1390;
  glass(ctx, bg, () => roundedPath(ctx, 0, sheetTop, W, H - sheetTop + 90, 90, false), true);

  // Best for: three glass tiles
  const best = [...(scan.occasions ?? [])].sort((a, b) => b.score - a.score).slice(0, 3);
  const gap = 24;
  const tw = (W - 96 - gap * 2) / 3;
  const ty = sheetTop + 172;
  best.forEach((o, i) => {
    const x = 48 + i * (tw + gap);
    glass(ctx, bg, () => roundedPath(ctx, x, ty, tw, 172, 52), false);
    ctx.textAlign = "center";
    ctx.fillStyle = scoreHex(o.score);
    ctx.font = `800 66px ${display}`;
    ctx.fillText(String(o.score), x + tw / 2, ty + 68);
    ctx.fillStyle = "#F4EFE3";
    ctx.font = `600 34px ${body}`;
    ctx.fillText(occasionLabel(o.occasion), x + tw / 2, ty + 128);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#F2CD6B";
  ctx.font = `700 36px ${body}`;
  ctx.fillText(`What's your score? Try Drippy · ${siteHost}`, W / 2, H - 92);

  // Score ring in a glass circle, sitting on the sheet's edge
  const cx = W / 2;
  const cy = sheetTop;
  glass(ctx, bg, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  }, false);
  const r = 104;
  ctx.lineCap = "round";
  ctx.lineWidth = 24;
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = scoreHex(value);
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * value) / 100);
  ctx.stroke();
  ctx.fillStyle = "#F4EFE3";
  ctx.font = `800 92px ${display}`;
  ctx.fillText(String(value), cx, cy - 6);
  ctx.fillStyle = "rgba(244,239,227,0.75)";
  ctx.font = `700 24px ${body}`;
  ctx.fillText("O V E R A L L", cx, cy + 56);

  // Mascot perched on top of the ring, in its mood for this score (drawn 130/100 larger to fit its effects)
  const m = 176;
  const mTop = cy - 140 - m + 48;
  try {
    const big = (m * 130) / 100;
    ctx.drawImage(await loadImage(moodSvgDataUrl(moodFor(value))), cx - big / 2, mTop - (big - m) / 2, big, big);
  } catch {
    // Card still works without the mascot.
  }

  // The verdict as the mascot's thought: a glass cloud above it, with two little bubbles trailing down
  if (showVerdict && scan.headline) {
    ctx.font = `700 50px ${display}`;
    const lines = wrapLines(ctx, scan.headline, 780, 3);
    const lh = 62;
    const cw = Math.min(900, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 104);
    const ch = lines.length * lh + 80;
    const cBottom = mTop - 34;
    const cTop = cBottom - ch;
    glass(ctx, bg, () => roundedPath(ctx, cx - cw / 2, cTop, cw, ch, 68), true);
    glass(ctx, bg, () => { ctx.beginPath(); ctx.arc(cx + 92, cBottom + 22, 19, 0, Math.PI * 2); }, true);
    glass(ctx, bg, () => { ctx.beginPath(); ctx.arc(cx + 72, cBottom + 58, 11, 0, Math.PI * 2); }, true);
    ctx.fillStyle = "#F4EFE3";
    lines.forEach((line, i) => ctx.fillText(line, cx, cTop + 40 + lh / 2 + i * lh));
  }

  return exportJpeg(canvas);
}
