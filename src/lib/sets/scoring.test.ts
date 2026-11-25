import { describe, expect, it } from "vitest";
import { overallScore, prepareSet, setReportSchema, CRITERIA } from "./scoring";

function report(score: number) {
  return setReportSchema.parse({ validSet: true, summary: "Balanced swimming session.", categories: Object.fromEntries(CRITERIA.map((c) => [c.id, { score, feedback: "Appropriate for the stated goal." }])), strengths: ["Progressive warmup"], improvements: ["Specify effort"], assumptions: ["Healthy adult swimmer"], lactateDemand: "Moderate", injuryConcern: "Lower" });
}
describe("Make a set scoring", () => {
  it("scores a perfect set out of 100", () => { expect(overallScore(report(100))).toBe(100); });
  it("uses the six weighted criteria", () => {
    const r = report(0); r.categories.safety.score = 100; r.categories.lactate.score = 100;
    expect(overallScore(r)).toBe(45);
  });
  it("does not award a score for non-swimming content", () => { expect(overallScore({ ...report(100), validSet: false })).toBeNull(); });
  it("requires warmup, pre set, main set and cool down", () => {
    for (const id of ["warmup", "preset", "main", "cooldown"] as const) {
      const sections = { warmup: ["400m easy"], preset: ["4x50 build"], main: ["8x100 steady"], cooldown: ["200m easy"] };
      sections[id] = ["  "];
      expect(() => prepareSet("", "", sections)).toThrow();
    }
  });
  it("accepts many text boxes per section and ignores empty extra boxes", () => {
    const lines = Array.from({ length: 120 }, (_, i) => `${i + 1} × 25m easy`);
    expect(prepareSet("", "", { warmup: [...lines, ""], preset: lines, main: lines, cooldown: lines }).sections.warmup).toHaveLength(120);
  });
  it("rejects scores outside 0–100", () => { expect(() => report(101)).toThrow(); expect(() => report(-1)).toThrow(); });
});