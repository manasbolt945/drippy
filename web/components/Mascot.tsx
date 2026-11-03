import { MASCOT_SVG } from "@/lib/mascotSvg";
import { moodFor, moodMarkup } from "@/lib/mood";

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
  return (
    <svg
      className={`dm${moves}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ overflow: "visible" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: mood ? moodMarkup(mood) : MASCOT_SVG }}
    />
  );
}
