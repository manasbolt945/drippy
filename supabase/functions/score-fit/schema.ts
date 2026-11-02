import { z } from "zod";
import { OCCASION_IDS } from "./prompt.ts";

// JSON schema sent to Claude as the structured-output format.
// Numeric ranges are enforced by the zod check below, not in the schema.
export const FIT_RATING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "message", "overall", "headline", "breakdown", "occasions", "tips"],
  properties: {
    status: { type: "string", enum: ["scored", "not_scorable"] },
    message: { type: "string" },
    overall: { type: "integer" },
    headline: { type: "string" },
    breakdown: {
      type: "object",
      additionalProperties: false,
      required: ["color_harmony", "fit", "styling", "cohesion"],
      properties: {
        color_harmony: { type: "integer" },
        fit: { type: "integer" },
        styling: { type: "integer" },
        cohesion: { type: "integer" },
      },
    },
    occasions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["occasion", "score", "reason"],
        properties: {
          occasion: { type: "string", enum: OCCASION_IDS },
          score: { type: "integer" },
          reason: { type: "string" },
        },
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
} as const;

const score = z.number().int().transform((n) => Math.min(100, Math.max(0, n)));

const FitRating = z.object({
  status: z.enum(["scored", "not_scorable"]),
  message: z.string(),
  overall: score,
  headline: z.string(),
  breakdown: z.object({
    color_harmony: score,
    fit: score,
    styling: score,
    cohesion: score,
  }),
  occasions: z.array(z.object({
    occasion: z.enum(OCCASION_IDS),
    score,
    reason: z.string(),
  })),
  tips: z.array(z.string()),
});

export type FitRating = z.infer<typeof FitRating>;

/** Parses Claude's JSON text and checks every occasion appears exactly once. */
export function parseFitRating(text: string): FitRating {
  const rating = FitRating.parse(JSON.parse(text));
  if (rating.status === "scored") {
    const seen = new Set(rating.occasions.map((o) => o.occasion));
    if (seen.size !== OCCASION_IDS.length || rating.occasions.length !== OCCASION_IDS.length) {
      throw new Error(`expected one score per occasion, got ${rating.occasions.length}`);
    }
    rating.occasions.sort((a, b) => b.score - a.score);
  }
  return rating;
}
