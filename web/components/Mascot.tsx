import { MASCOT_SVG, MASCOT_SVG_ROUND_EYES, MOOD_EXTRAS } from "@/lib/mascotSvg";

export type Mood = "meh" | "okay" | "love" | "iconic";

/** How the mascot reacts to a score: meh <60 · okay 60–74 · love 75–89 · iconic 90+. */
export function moodFor(score: number): Mood {
  return score >= 90 ? "iconic" : score >= 75 ? "love" : score >= 60 ? "okay" : "meh";
}

const EXTRAS_KEY = { meh: "low", okay: "mid", love: "good", iconic: "top" } as const;

interface Props {
  size: number;
  /** "session" = selfie session loop, "celebrate" = happy bounce, "mood" = react to `score`. */
  mode?: "session" | "celebrate" | "still" | "mood";
  score?: number;
}

/** The starfish mascot. `mode` picks its moves (see app/mascot.css). */
export default function Mascot({ size, mode = "still", score = 0 }: Props) {
  const mood = mode === "mood" ? moodFor(score) : null;
  const moves = mode === "session" ? " dm-session" : mode === "celebrate" ? " dm-celebrate" : mood ? ` dm-mood dm-mood-${mood}` : "";
  const svg = (mood === "meh" ? MASCOT_SVG_ROUND_EYES : MASCOT_SVG) + (mood ? MOOD_EXTRAS[EXTRAS_KEY[mood]] : "");
  return (
    <svg
      className={`dm${moves}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ overflow: "visible" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
