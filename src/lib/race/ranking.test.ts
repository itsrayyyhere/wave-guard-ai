import { describe, expect, it } from "vitest";
import { EMPTY_RANKING, addRace, racePoints } from "./ranking";

describe("race ranking points", () => {
  it("gives +3 for beating a rookie, +8 for a pro, +15 for an olympian", () => {
    expect(racePoints({ place: 1, opponents: ["rookie"], beaten: ["rookie"] })).toBe(3);
    expect(racePoints({ place: 1, opponents: ["pro"], beaten: ["pro"] })).toBe(8);
    expect(racePoints({ place: 1, opponents: ["olympian"], beaten: ["olympian"] })).toBe(15);
  });

  it("adds up win points per bot against two bots", () => {
    expect(racePoints({ place: 1, opponents: ["pro", "olympian"], beaten: ["pro", "olympian"] })).toBe(23);
  });

  it("gives nothing for 2nd place against 1–2 bots", () => {
    expect(racePoints({ place: 2, opponents: ["olympian"], beaten: [] })).toBe(0);
    expect(racePoints({ place: 2, opponents: ["pro", "olympian"], beaten: ["pro"] })).toBe(0);
  });

  it("gives +1 / +6 / +10 per beaten bot for 2nd out of four", () => {
    const opponents = ["rookie", "pro", "olympian"] as const;
    expect(racePoints({ place: 2, opponents, beaten: ["rookie", "pro"] })).toBe(7);
    expect(racePoints({ place: 2, opponents, beaten: ["olympian", "pro"] })).toBe(16);
    expect(racePoints({ place: 2, opponents, beaten: ["rookie", "rookie"] })).toBe(2);
  });

  it("gives nothing for 3rd or 4th out of four", () => {
    const opponents = ["olympian", "olympian", "olympian"] as const;
    expect(racePoints({ place: 3, opponents, beaten: ["olympian"] })).toBe(0);
    expect(racePoints({ place: 4, opponents, beaten: [] })).toBe(0);
  });

  it("accumulates totals and wins", () => {
    let s = addRace(EMPTY_RANKING, { at: 1, place: 1, field: 2, opponents: ["pro"], points: 8 });
    s = addRace(s, { at: 2, place: 2, field: 2, opponents: ["pro"], points: 0 });
    expect(s).toMatchObject({ total: 8, played: 2, wins: 1 });
  });
});
