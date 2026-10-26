import { describe, expect, it } from "vitest";
import { ArmTracker, angle2, angle3, inTarget, rollAngle, symmetryPct } from "./metrics";

describe("pose geometry", () => {
  it("measures a right angle at the elbow", () => {
    expect(angle2({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(90);
    expect(angle3({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 })).toBeCloseTo(90);
  });

  it("reads 0° roll for flat shoulders and 45° when rotated", () => {
    expect(rollAngle({ x: 0, y: 0, z: -0.2 }, { x: 0, y: 0, z: 0.2 })).toBeCloseTo(0);
    expect(rollAngle({ x: 0, y: 0, z: 0 }, { x: 0, y: 0.2, z: 0.2 })).toBeCloseTo(45);
  });
});

describe("targets", () => {
  it("catch angle target is 90–110°", () => {
    expect(inTarget("catchAngle", 89)).toBe(false);
    expect(inTarget("catchAngle", 90)).toBe(true);
    expect(inTarget("catchAngle", 110)).toBe(true);
    expect(inTarget("catchAngle", 111)).toBe(false);
  });

  it("shoulder roll target is 35–45°", () => {
    expect(inTarget("shoulderRoll", 22)).toBe(false);
    expect(inTarget("shoulderRoll", 40)).toBe(true);
  });

  it("symmetry drops as arms differ", () => {
    expect(symmetryPct(100, 100)).toBe(100);
    expect(symmetryPct(90, 110)).toBeCloseTo(80);
  });
});

describe("arm tracker", () => {
  it("counts a stroke and records the elbow angle under the shoulder", () => {
    const arm = new ArmTracker();
    arm.update(0, 1.5, 0.5, 0.2, 170); // extended in front
    arm.update(0.3, 0.05, 1.2, 0.2, 100); // hand under shoulder
    const ev = arm.update(0.6, -1, 0.8, 0.2, 140); // pushed past
    expect(ev.stroke).toBe(true);
    expect(ev.catchAngle).toBe(100);
  });

  it("flags a dropped elbow once per recovery", () => {
    const arm = new ArmTracker();
    expect(arm.update(0, -1, -0.5, -0.3, 120).droppedElbow).toBe(true);
    expect(arm.update(0.1, 0, -0.6, -0.3, 120).droppedElbow).toBe(false);
  });
});

describe("side swap correction", () => {
  it("detects when MediaPipe swaps left and right limbs between frames", async () => {
    const { isSideSwapped, swapSides } = await import("./metrics");
    const prev = Array.from({ length: 33 }, (_, i) => ({ x: i * 10, y: i % 2 ? 100 : 0 }));
    expect(isSideSwapped(prev, prev)).toBe(false);
    expect(isSideSwapped(prev, swapSides(prev))).toBe(true);
  });
});
