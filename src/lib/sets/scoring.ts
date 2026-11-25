import { z } from "zod";

export const SET_SECTIONS = [
  { id: "warmup", label: "Warmup", example: "400m easy freestyle + 4 × 50m drill, 15s rest" },
  { id: "preset", label: "Pre set", example: "4 × 50m build to 80%, 20s rest" },
  { id: "main", label: "Main set", example: "8 × 100m freestyle at threshold effort, 20s rest" },
  { id: "cooldown", label: "Cool down", example: "200m easy choice, relaxed breathing" },
] as const;
export type SectionId = (typeof SET_SECTIONS)[number]["id"];
export const CRITERIA = [
  { id: "safety", label: "Injury-risk management", weight: 25 },
  { id: "lactate", label: "Lactate & intensity balance", weight: 20 },
  { id: "progression", label: "Warmup & progression", weight: 15 },
  { id: "recovery", label: "Rest & cool down", weight: 15 },
  { id: "purpose", label: "Training purpose & volume", weight: 15 },
  { id: "clarity", label: "Set clarity & technique", weight: 10 },
] as const;
const rows = z.array(z.string().trim().min(1)).min(1);
export const setInputSchema = z.object({
  goal: z.string().trim().max(500),
  swimmer: z.string().trim().max(500),
  sections: z.object({ warmup: rows, preset: rows, main: rows, cooldown: rows }),
}).refine((value) => JSON.stringify(value).length <= 30000, "This set is too long to score in one submission. Shorten the entries and try again.");
export type SetInput = z.infer<typeof setInputSchema>;
const categorySchema = z.object({ score: z.number().int().min(0).max(100), feedback: z.string().min(1) });
export const setReportSchema = z.object({
  validSet: z.boolean(),
  summary: z.string().min(1),
  categories: z.object({ safety: categorySchema, lactate: categorySchema, progression: categorySchema, recovery: categorySchema, purpose: categorySchema, clarity: categorySchema }),
  strengths: z.array(z.string()).min(1).max(4),
  improvements: z.array(z.string()).min(1).max(4),
  assumptions: z.array(z.string()).min(1).max(4),
  lactateDemand: z.enum(["Low", "Moderate", "High", "Unclear"]),
  injuryConcern: z.enum(["Lower", "Moderate", "Higher", "Unclear"]),
});
export type SetReport = z.infer<typeof setReportSchema>;
export function overallScore(report: SetReport): number | null {
  if (!report.validSet) return null;
  return Math.round(CRITERIA.reduce((sum, c) => sum + report.categories[c.id].score * c.weight / 100, 0));
}
export function prepareSet(goal: string, swimmer: string, sections: Record<SectionId, string[]>): SetInput {
  return setInputSchema.parse({ goal, swimmer, sections: Object.fromEntries(SET_SECTIONS.map(({ id }) => [id, sections[id].map((s) => s.trim()).filter(Boolean)])) });
}