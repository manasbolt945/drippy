import { MASCOT_SVG, MASCOT_SVG_ROUND_EYES, MOOD_EXTRAS } from "./mascotSvg";

export type Mood = "meh" | "okay" | "love" | "iconic";

/** How the mascot reacts to a score: meh <60 · okay 60–74 · love 75–89 · iconic 90+. */
export function moodFor(score: number): Mood {
  return score >= 90 ? "iconic" : score >= 75 ? "love" : score >= 60 ? "okay" : "meh";
}

const EXTRAS_KEY = { meh: "low", okay: "mid", love: "good", iconic: "top" } as const;

/** Mascot markup for a mood: round eyes when it's meh, plus that mood's extra effects. */
export function moodMarkup(mood: Mood): string {
  return (mood === "meh" ? MASCOT_SVG_ROUND_EYES : MASCOT_SVG) + MOOD_EXTRAS[EXTRAS_KEY[mood]];
}

/**
 * A standalone SVG of the mascot frozen in a mood, for drawing on a canvas (the share card).
 * No animation there, so hide the phone flash and confetti, and show the happy glow only for good moods.
 */
export function moodSvgDataUrl(mood: Mood): string {
  const hide = [".m-flash", ".fx-conf", ...(mood === "love" || mood === "iconic" ? [] : [".happy"])].join(",");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -15 130 130"><style>${hide}{display:none}</style>${moodMarkup(mood)}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
