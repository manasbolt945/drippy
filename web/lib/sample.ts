import type { OccasionId } from "./occasions";
import type { Scan } from "./types";

/** The result demo mode returns: the navy-shirt / olive-trousers fit from the UX prototype. */
export function sampleScan(occasionHint: OccasionId | null): Scan {
  return {
    id: crypto.randomUUID(),
    user_id: "demo",
    image_path: null,
    occasion_hint: occasionHint,
    status: "scored",
    message: "",
    overall: 74,
    headline: "Sharp shirt, but the olive trousers fight the navy",
    breakdown: { color_harmony: 62, fit: 84, styling: 70, cohesion: 72 },
    occasions: [
      { occasion: "work", score: 80, reason: "Crisp navy shirt reads office-ready. A matching belt would finish it." },
      { occasion: "date", score: 76, reason: "Clean and intentional. Roll the sleeves to relax it." },
      { occasion: "casual", score: 72, reason: "Works, but a tee or knit would feel less stiff." },
      { occasion: "formal", score: 68, reason: "Olive undercuts the shirt. Charcoal trousers would look boardroom-ready." },
      { occasion: "party", score: 61, reason: "Safe colors. A bolder layer or accessory would help it stand out." },
      { occasion: "wedding", score: 58, reason: "Too plain for a celebration. Add a blazer and dress shoes." },
      { occasion: "diwali", score: 47, reason: "Neat, but Diwali calls for richer color, like a silk kurta or a festive jacket." },
      { occasion: "festive", score: 42, reason: "Missing the color and detail festive wear calls for." },
      { occasion: "gym", score: 12, reason: "A button-up and trousers are not made for working out." },
    ],
    tips: [
      "Swap the olive trousers for charcoal or beige so they stop fighting the navy.",
      "Switch the black belt for brown leather to match your shoes.",
      "Roll the sleeves twice for a more relaxed date-night look.",
    ],
    model: "demo",
    created_at: new Date().toISOString(),
  };
}
