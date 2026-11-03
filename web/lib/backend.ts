import { createClient, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import { blobToBase64, thumbnailDataUrl } from "./image";
import type { OccasionId } from "./occasions";
import { sampleScan } from "./sample";
import type { Scan, ScanWithPhoto } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Without Supabase settings the app runs on sample results so every screen can be tried. */
export const DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export type ScoreErrorKind = "limit" | "busy" | "failed" | "network";

export class ScoreError extends Error {
  constructor(public kind: ScoreErrorKind, message: string) {
    super(message);
  }
}

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  return client;
}

/** Every visitor gets an anonymous account on first use, so their scans stay theirs. */
async function ensureSession(): Promise<void> {
  const { data } = await supabase().auth.getSession();
  if (data.session) return;
  const { error } = await supabase().auth.signInAnonymously();
  if (error) throw new ScoreError("network", "We couldn't connect. Check your internet and try again.");
}

export async function scoreFit(photo: Blob, occasionHint: OccasionId | null): Promise<Scan> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 4200));
    const scan = sampleScan(occasionHint);
    await saveDemoScan(scan, photo);
    return scan;
  }

  await ensureSession();
  const image_base64 = await blobToBase64(photo);
  const { data, error } = await supabase().functions.invoke<Scan>("score-fit", {
    body: { image_base64, occasion_hint: occasionHint },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = (error.context as Response).status;
      if (status === 429) {
        throw new ScoreError("limit", "You've used today's free checks. Come back tomorrow for more.");
      }
      if (status === 503) throw new ScoreError("busy", "Our stylist is busy right now. Try again in a minute.");
      throw new ScoreError("failed", "Something went wrong rating this photo. Please try again.");
    }
    throw new ScoreError("network", "We couldn't connect. Check your internet and try again.");
  }
  // The server never keeps the photo, so History's thumbnail lives on this phone only.
  if (data?.status === "scored") await saveThumbnail(data.id, photo);
  return data!;
}

export async function listScans(): Promise<ScanWithPhoto[]> {
  if (DEMO_MODE) return readDemoScans();

  await ensureSession();
  const { data, error } = await supabase()
    .from("scans")
    .select("*")
    .eq("status", "scored")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new ScoreError("network", "We couldn't load your fits.");
  const thumbs = readThumbnails();
  return ((data ?? []) as Scan[]).map((scan) => ({ scan, photoUrl: thumbs[scan.id] ?? null }));
}

// --- Thumbnails of your own fits, kept in this browser only ------------------------

const THUMBS_KEY = "drippy.thumbs";
const MAX_THUMBS = 24;

function readThumbnails(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(THUMBS_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveThumbnail(scanId: string, photo: Blob): Promise<void> {
  try {
    const entries = Object.entries(readThumbnails()).slice(-(MAX_THUMBS - 1));
    entries.push([scanId, await thumbnailDataUrl(photo)]);
    localStorage.setItem(THUMBS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Storage full or blocked: this fit just shows without a thumbnail.
  }
}

// --- Demo-mode history, kept in this browser only --------------------------------

const DEMO_KEY = "drippy.demoScans";

function readDemoScans(): ScanWithPhoto[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]") as ScanWithPhoto[];
  } catch {
    return [];
  }
}

async function saveDemoScan(scan: Scan, photo: Blob): Promise<void> {
  try {
    const entry: ScanWithPhoto = { scan, photoUrl: await thumbnailDataUrl(photo) };
    localStorage.setItem(DEMO_KEY, JSON.stringify([entry, ...readDemoScans()].slice(0, 20)));
  } catch {
    // Storage full or blocked: history just won't include this scan.
  }
}
