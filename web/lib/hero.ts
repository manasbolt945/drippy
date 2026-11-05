import { occasionLabel } from "./occasions";
import type { OccasionScore, Scan } from "./types";

/** Occasions scoring below this aren't suggested in the "best for" tiles. */
const MIN_TILE_SCORE = 50;

export interface Hero {
  /** The occasion the big score is for, or null for the overall score. */
  occasion: string | null;
  value: number;
  label: string;
  /** The verdict for the overall score, or the occasion's own reason. */
  text: string | null;
}

export function sortedOccasions(scan: Scan): OccasionScore[] {
  return [...(scan.occasions ?? [])].sort((a, b) => b.score - a.score);
}

/**
 * The occasion the result opens on: the one picked before rating ("Headed to"), else none (overall).
 * Only counts if the rating actually scored it.
 */
export function defaultHeroOccasion(scan: Scan): string | null {
  const hint = scan.occasion_hint;
  return hint && scan.occasions?.some((o) => o.occasion === hint) ? hint : null;
}

/** The big score: an occasion's score and reason, or the overall score and verdict. */
export function heroFor(scan: Scan, occasion: string | null): Hero {
  const o = occasion ? scan.occasions?.find((x) => x.occasion === occasion) : undefined;
  if (o) return { occasion: o.occasion, value: o.score, label: occasionLabel(o.occasion).toUpperCase(), text: o.reason };
  return { occasion: null, value: scan.overall ?? 0, label: "OVERALL", text: scan.headline };
}

/**
 * The "best for" tiles: the next best occasions after the big score's occasion, highest first,
 * leaving out poor fits (can be empty when nothing else suits the outfit).
 */
export function bestTiles(scan: Scan, exclude: string | null, count = 3): OccasionScore[] {
  return sortedOccasions(scan)
    .filter((o) => o.occasion !== exclude && o.score >= MIN_TILE_SCORE)
    .slice(0, count);
}
