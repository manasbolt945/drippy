import { MASCOT_SVG } from "@/lib/mascotSvg";

/** The starfish mascot. `mode` picks its moves (see app/mascot.css); "still" just stands there. */
export default function Mascot({ size, mode = "still" }: { size: number; mode?: "session" | "celebrate" | "still" }) {
  const moves = mode === "session" ? " dm-session" : mode === "celebrate" ? " dm-celebrate" : "";
  return (
    <svg
      className={`dm${moves}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ overflow: "visible" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: MASCOT_SVG }}
    />
  );
}
