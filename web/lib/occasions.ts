// Ids match the score-fit function (supabase/functions/score-fit/prompt.ts) — keep in sync.
export type OccasionId = "diwali" | "work" | "formal" | "wedding" | "party" | "date" | "casual" | "festive" | "gym";

// `featured`: a seasonal occasion shown first, as a glowing chip (Diwali edition).
export const OCCASIONS: readonly { id: OccasionId; label: string; featured?: boolean }[] = [
  { id: "diwali", label: "Diwali", featured: true },
  { id: "work", label: "Work" },
  { id: "formal", label: "Interview" },
  { id: "wedding", label: "Wedding" },
  { id: "party", label: "Party" },
  { id: "date", label: "Date night" },
  { id: "casual", label: "Brunch" },
  { id: "festive", label: "Festive" },
  { id: "gym", label: "Gym" },
];

export function occasionLabel(id: string): string {
  return OCCASIONS.find((o) => o.id === id)?.label ?? id;
}
