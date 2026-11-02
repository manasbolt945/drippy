import type { OccasionId } from "./occasions";

export type ScanStatus = "scored" | "not_scorable" | "refused";

export interface OccasionScore {
  occasion: OccasionId;
  score: number;
  reason: string;
}

/** A row of the `scans` table, as returned by the score-fit function. */
export interface Scan {
  id: string;
  user_id: string;
  image_path: string | null;
  occasion_hint: OccasionId | null;
  status: ScanStatus;
  message: string | null;
  overall: number | null;
  headline: string | null;
  breakdown: { color_harmony: number; fit: number; styling: number; cohesion: number } | null;
  occasions: OccasionScore[] | null;
  tips: string[] | null;
  model: string | null;
  created_at: string;
}

/** A scan the UI can show, with a URL for its photo when we have one. */
export interface ScanWithPhoto {
  scan: Scan;
  photoUrl: string | null;
}

export function scoreColor(v: number): string {
  return v >= 75 ? "var(--gold)" : v >= 60 ? "var(--blue)" : "var(--coral)";
}

/** Same thresholds as scoreColor, as literal colors for canvas drawing. */
export function scoreHex(v: number): string {
  return v >= 75 ? "#E6B547" : v >= 60 ? "#8FA8FF" : "#FF7A66";
}
