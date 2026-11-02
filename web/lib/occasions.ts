// Ids match the score-fit function (supabase/functions/score-fit/prompt.ts) — keep in sync.
export const OCCASIONS = [
  { id: "work", label: "Work" },
  { id: "formal", label: "Interview" },
  { id: "wedding", label: "Wedding" },
  { id: "party", label: "Party" },
  { id: "date", label: "Date night" },
  { id: "casual", label: "Brunch" },
  { id: "festive", label: "Festive" },
  { id: "gym", label: "Gym" },
] as const;

export type OccasionId = (typeof OCCASIONS)[number]["id"];

export function occasionLabel(id: string): string {
  return OCCASIONS.find((o) => o.id === id)?.label ?? id;
}
