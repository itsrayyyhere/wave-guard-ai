// Swim technique metrics computed from MediaPipe Pose landmarks.
// Pure TypeScript (no DOM) so it can be unit-tested.

export type Landmark = { x: number; y: number; z: number; visibility?: number };
type V2 = { x: number; y: number };
type V3 = { x: number; y: number; z: number };

export const VIS = 0.5; // minimum landmark visibility to trust a joint

export const IDX = {
  nose: 0,
  lEar: 7,
  rEar: 8,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const;

export type MetricKey =
  | "catchAngle"
  | "rightElbow"
  | "leftElbow"
  | "shoulderRoll"
  | "hipRoll"
  | "head"
  | "bodyLine"
  | "kneeBend"
  | "strokeRate"
  | "symmetry";

export type MetricDef = {
  key: MetricKey;
  label: string;
  unit: string;
  /** Inclusive target range; omitted for informational metrics. */
  min?: number;
  max?: number;
  hint: string;
};

export const METRICS: MetricDef[] = [
  { key: "catchAngle", label: "Catch Angle", unit: "°", min: 90, max: 110, hint: "Elbow bend as the hand passes under the shoulder" },
  { key: "shoulderRoll", label: "Shoulder Roll", unit: "°", min: 35, max: 45, hint: "Peak shoulder rotation per stroke" },
  { key: "hipRoll", label: "Hip Roll", unit: "°", min: 25, max: 40, hint: "Peak hip rotation per stroke" },
  { key: "head", label: "Head Alignment", unit: "°", min: 0, max: 25, hint: "Head angle off the spine line (lower = neutral)" },
  { key: "bodyLine", label: "Body Line", unit: "°", min: 160, max: 180, hint: "Shoulder–hip–knee line (180° = flat)" },
  { key: "kneeBend", label: "Kick Knee Bend", unit: "°", min: 15, max: 45, hint: "Peak knee bend during the kick" },
  { key: "symmetry", label: "Arm Symmetry", unit: "%", min: 85, max: 100, hint: "Left vs right catch angle match" },
  { key: "strokeRate", label: "Stroke Rate", unit: "spm", hint: "Full arm cycles per minute" },
  { key: "rightElbow", label: "Right Elbow", unit: "°", hint: "Live elbow angle" },
  { key: "leftElbow", label: "Left Elbow", unit: "°", hint: "Live elbow angle" },
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>;

export function inTarget(key: MetricKey, value: number): boolean | null {
  const d = METRIC_BY_KEY[key];
  if (d.min === undefined || d.max === undefined) return null;
  return value >= d.min && value <= d.max;
}

// ---------- geometry ----------
const DEG = 180 / Math.PI;

export function angle2(a: V2, b: V2, c: V2): number {
  const x1 = a.x - b.x, y1 = a.y - b.y, x2 = c.x - b.x, y2 = c.y - b.y;
  const m = Math.hypot(x1, y1) * Math.hypot(x2, y2);
  if (m === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (x1 * x2 + y1 * y2) / m))) * DEG;
}

export function angle3(a: V3, b: V3, c: V3): number {
  const x1 = a.x - b.x, y1 = a.y - b.y, z1 = a.z - b.z;
  const x2 = c.x - b.x, y2 = c.y - b.y, z2 = c.z - b.z;
  const m = Math.hypot(x1, y1, z1) * Math.hypot(x2, y2, z2);
  if (m === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (x1 * x2 + y1 * y2 + z1 * z2) / m))) * DEG;
}

/** Angle between two direction vectors (0–180°). */
export function vecAngle(u: V2, v: V2): number {
  return angle2({ x: u.x, y: u.y }, { x: 0, y: 0 }, { x: v.x, y: v.y });
}

/**
 * Rotation of a left→right segment (shoulders or hips) away from the horizontal
 * plane, using metric world coordinates (y = vertical for a level camera).
 * 0° = flat on the water, 90° = fully on the side.
 */
export function rollAngle(left: V3, right: V3): number {
  const dx = right.x - left.x, dy = right.y - left.y, dz = right.z - left.z;
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return 0;
  return Math.asin(Math.min(1, Math.abs(dy) / len)) * DEG;
}

const mid2 = (a: V2, b: V2): V2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// ---------- temporal helpers ----------
class RollingPeak {
  private buf: [number, number][] = [];
  constructor(private windowS: number) {}
  push(t: number, v: number) {
    this.buf.push([t, v]);
    while (this.buf.length && this.buf[0]![0] < t - this.windowS) this.buf.shift();
  }
  get(): number | null {
    if (!this.buf.length) return null;
    return this.buf.reduce((m, [, v]) => Math.max(m, v), -Infinity);
  }
  reset() { this.buf = []; }
}

class Ema {
  private v: number | null = null;
  constructor(private alpha = 0.45) {}
  push(x: number | null): number | null {
    if (x === null) return this.v;
    this.v = this.v === null ? x : this.v + this.alpha * (x - this.v);
    return this.v;
  }
  reset() { this.v = null; }
}

export type StatSummary = { n: number; avg: number; min: number; max: number; inRangePct: number | null };

class Stat {
  n = 0; sum = 0; min = Infinity; max = -Infinity; inRange = 0;
  constructor(private key: MetricKey) {}
  add(v: number) {
    this.n++; this.sum += v;
    this.min = Math.min(this.min, v); this.max = Math.max(this.max, v);
    if (inTarget(this.key, v)) this.inRange++;
  }
  summary(): StatSummary | null {
    if (!this.n) return null;
    const hasTarget = inTarget(this.key, 0) !== null;
    return {
      n: this.n,
      avg: this.sum / this.n,
      min: this.min,
      max: this.max,
      inRangePct: hasTarget ? (this.inRange / this.n) * 100 : null,
    };
  }
}

export type ArmPhase = "Entry & Extension" | "Catch" | "Pull-Through" | "Push & Exit" | "Recovery";

/** Tracks one arm through the stroke cycle (side-view, image y points down). */
export class ArmTracker {
  state: "none" | "front" | "back" = "none";
  inRecovery = false;
  private flagged = false;
  private best: { abs: number; elbow: number } | null = null;
  strokeTimes: number[] = [];
  catches: number[] = [];
  phase: ArmPhase | null = null;

  /**
   * forward: wrist position ahead of the shoulder along swim direction, in upper-arm lengths.
   * below: wrist depth below the shoulder, in upper-arm lengths (negative = above).
   * elbowAboveWrist: elbow height above wrist, in upper-arm lengths (negative = dropped elbow).
   */
  update(t: number, forward: number, below: number, elbowAboveWrist: number, elbowAngle: number) {
    const ev = { stroke: false, catchAngle: null as number | null, droppedElbow: false };
    const H = 0.35;

    // Recovery (hand above the shoulder line) with hysteresis
    if (!this.inRecovery && below < -0.15) { this.inRecovery = true; this.flagged = false; }
    else if (this.inRecovery && below > 0.05) this.inRecovery = false;
    if (this.inRecovery && !this.flagged && elbowAboveWrist < -0.1) {
      this.flagged = true;
      ev.droppedElbow = true;
    }

    if (!this.inRecovery && below > 0) {
      if (forward > H && this.state !== "front") { this.state = "front"; this.best = null; }
      if (this.state === "front") {
        const abs = Math.abs(forward);
        if (abs < 1 && (!this.best || abs < this.best.abs)) this.best = { abs, elbow: elbowAngle };
        if (forward < -H) {
          this.state = "back";
          ev.stroke = true;
          this.strokeTimes.push(t);
          if (this.strokeTimes.length > 8) this.strokeTimes.shift();
          if (this.best) {
            ev.catchAngle = this.best.elbow;
            this.catches.push(this.best.elbow);
            if (this.catches.length > 6) this.catches.shift();
          }
          this.best = null;
        }
      } else if (forward < -H) this.state = "back";
    }

    this.phase = this.inRecovery
      ? "Recovery"
      : below <= 0
        ? null
        : forward > H
          ? elbowAngle > 150 ? "Entry & Extension" : "Catch"
          : forward < -H ? "Push & Exit" : "Pull-Through";
    return ev;
  }

  /** Full-cycle stroke rate (cycles/min) from this arm's recent strokes. */
  strokeRate(): number | null {
    const iv: number[] = [];
    for (let i = 1; i < this.strokeTimes.length; i++) {
      const d = this.strokeTimes[i]! - this.strokeTimes[i - 1]!;
      if (d > 0.4 && d < 6) iv.push(d);
    }
    if (!iv.length) return null;
    iv.sort((a, b) => a - b);
    const med = iv[Math.floor(iv.length / 2)]!;
    return 60 / med;
  }

  recentCatch(): number | null {
    const c = this.catches.slice(-3);
    return c.length ? c.reduce((a, b) => a + b, 0) / c.length : null;
  }

  resetTemporal() {
    this.state = "none"; this.inRecovery = false; this.flagged = false; this.best = null;
    this.strokeTimes = []; this.phase = null;
  }
}

export type AnalysisSnapshot = {
  frames: number;
  tracked: number;
  conf: number;
  side: "left" | "right" | null;
  phase: ArmPhase | null;
  values: Record<MetricKey, number | null>;
  strokes: number;
  droppedElbows: number;
  stats: Record<MetricKey, StatSummary | null>;
  score: number | null;
};

const KEYS = METRICS.map((m) => m.key);
const emptyValues = () => Object.fromEntries(KEYS.map((k) => [k, null])) as Record<MetricKey, number | null>;

export class SwimAnalyzer {
  frames = 0;
  tracked = 0;
  private conf = 0;
  private dir = 1; // +1 = swimming toward image right
  private lastT = -1;
  private lastSample = -Infinity;
  private left = new ArmTracker();
  private right = new ArmTracker();
  private shoulderPeak = new RollingPeak(2);
  private hipPeak = new RollingPeak(2);
  private kneePeak = new RollingPeak(1);
  private ema: Record<MetricKey, Ema> = Object.fromEntries(KEYS.map((k) => [k, new Ema()])) as Record<MetricKey, Ema>;
  private stats: Record<MetricKey, Stat> = Object.fromEntries(KEYS.map((k) => [k, new Stat(k)])) as Record<MetricKey, Stat>;
  private values = emptyValues();
  private strokes = 0;
  private dropped = 0;
  private side: "left" | "right" | null = null;
  private phase: ArmPhase | null = null;

  reset() {
    Object.assign(this, new SwimAnalyzer());
  }

  /**
   * @param lm normalized image landmarks (33)
   * @param world metric world landmarks (33)
   * @param t media time in seconds
   * @param W,H video pixel size (to undo aspect-ratio distortion)
   */
  update(lm: Landmark[] | undefined, world: Landmark[] | undefined, t: number, W: number, H: number): void {
    this.frames++;
    if (t < this.lastT - 0.25) {
      // seek backward / replay: restart temporal tracking (and stats if back at the start)
      if (t < 0.3) { this.reset(); this.frames = 1; }
      else this.resetTemporal();
    }
    this.lastT = t;
    if (!lm || lm.length < 33 || !world || world.length < 33) {
      this.phase = null;
      return;
    }
    this.tracked++;

    const vis = (i: number) => lm[i]?.visibility ?? 0;
    const ok = (...ids: number[]) => ids.every((i) => vis(i) >= VIS);
    const p = (i: number): V2 => ({ x: lm[i]!.x * W, y: lm[i]!.y * H });
    const w = (i: number): V3 => world[i]!;
    this.conf = lm.reduce((a, l) => a + (l.visibility ?? 0), 0) / lm.length;

    const raw = emptyValues();

    // Swim direction from head vs hips
    if ((ok(IDX.lHip) || ok(IDX.rHip)) && (ok(IDX.nose) || ok(IDX.lEar) || ok(IDX.rEar))) {
      const hip = ok(IDX.lHip, IDX.rHip) ? mid2(p(IDX.lHip), p(IDX.rHip)) : p(ok(IDX.lHip) ? IDX.lHip : IDX.rHip);
      const head = ok(IDX.nose) ? p(IDX.nose) : p(ok(IDX.lEar) ? IDX.lEar : IDX.rEar);
      const dx = head.x - hip.x;
      if (Math.abs(dx) > 0.05 * W) this.dir = Math.sign(dx);
    }

    // Arms
    const arms = [
      { key: "leftElbow" as const, tr: this.left, s: IDX.lShoulder, e: IDX.lElbow, wr: IDX.lWrist },
      { key: "rightElbow" as const, tr: this.right, s: IDX.rShoulder, e: IDX.rElbow, wr: IDX.rWrist },
    ];
    for (const a of arms) {
      if (!ok(a.s, a.e, a.wr)) continue;
      const elbow = angle3(w(a.s), w(a.e), w(a.wr));
      raw[a.key] = elbow;
      const S = p(a.s), E = p(a.e), Wr = p(a.wr);
      const upper = Math.hypot(E.x - S.x, E.y - S.y) || 1;
      const ev = a.tr.update(
        t,
        ((Wr.x - S.x) * this.dir) / upper,
        (Wr.y - S.y) / upper,
        (Wr.y - E.y) / upper,
        elbow,
      );
      if (ev.droppedElbow) this.dropped++;
      if (ev.stroke) this.strokes++;
      if (ev.catchAngle !== null) {
        this.stats.catchAngle.add(ev.catchAngle);
        this.values.catchAngle = ev.catchAngle;
      }
    }
    const sideVis = (s: number, e: number, wr: number) => vis(s) + vis(e) + vis(wr);
    const lv = sideVis(IDX.lShoulder, IDX.lElbow, IDX.lWrist);
    const rv = sideVis(IDX.rShoulder, IDX.rElbow, IDX.rWrist);
    this.side = lv < VIS * 3 && rv < VIS * 3 ? null : lv > rv ? "left" : "right";
    this.phase = this.side === "left" ? this.left.phase : this.side === "right" ? this.right.phase : null;

    // Rolls (world coords; far side is often estimated so use a lower threshold)
    const roughly = (...ids: number[]) => ids.every((i) => vis(i) >= 0.3);
    if (roughly(IDX.lShoulder, IDX.rShoulder)) this.shoulderPeak.push(t, rollAngle(w(IDX.lShoulder), w(IDX.rShoulder)));
    if (roughly(IDX.lHip, IDX.rHip)) this.hipPeak.push(t, rollAngle(w(IDX.lHip), w(IDX.rHip)));
    raw.shoulderRoll = this.shoulderPeak.get();
    raw.hipRoll = this.hipPeak.get();

    // Torso reference points (2D, aspect-corrected)
    const pick = (l: number, r: number): V2 | null =>
      ok(l, r) ? mid2(p(l), p(r)) : ok(l) ? p(l) : ok(r) ? p(r) : null;
    const sh = pick(IDX.lShoulder, IDX.rShoulder);
    const hp = pick(IDX.lHip, IDX.rHip);
    const kn = pick(IDX.lKnee, IDX.rKnee);
    const ear = pick(IDX.lEar, IDX.rEar);

    if (sh && hp && ear) {
      raw.head = vecAngle({ x: sh.x - hp.x, y: sh.y - hp.y }, { x: ear.x - sh.x, y: ear.y - sh.y });
    }
    if (sh && hp && kn) raw.bodyLine = angle2(sh, hp, kn);

    // Kick
    let knee: number | null = null;
    if (ok(IDX.lHip, IDX.lKnee, IDX.lAnkle)) knee = 180 - angle3(w(IDX.lHip), w(IDX.lKnee), w(IDX.lAnkle));
    if (ok(IDX.rHip, IDX.rKnee, IDX.rAnkle)) knee = Math.max(knee ?? 0, 180 - angle3(w(IDX.rHip), w(IDX.rKnee), w(IDX.rAnkle)));
    if (knee !== null) this.kneePeak.push(t, knee);
    raw.kneeBend = this.kneePeak.get();

    // Stroke rate & symmetry
    const rates = [this.left.strokeRate(), this.right.strokeRate()].filter((x): x is number => x !== null);
    raw.strokeRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    const lc = this.left.recentCatch(), rc = this.right.recentCatch();
    if (lc !== null && rc !== null) raw.symmetry = symmetryPct(lc, rc);

    // Smooth live values
    for (const k of ["leftElbow", "rightElbow", "head", "bodyLine"] as const) {
      this.values[k] = raw[k] === null ? null : this.ema[k].push(raw[k]);
    }
    for (const k of ["shoulderRoll", "hipRoll", "kneeBend", "strokeRate", "symmetry"] as const) {
      if (raw[k] !== null) this.values[k] = raw[k];
    }

    // Session stats: per-frame for live metrics, sampled every 0.5s for peaks/rates
    for (const k of ["leftElbow", "rightElbow", "head", "bodyLine"] as const) {
      const v = this.values[k];
      if (v !== null) this.stats[k].add(v);
    }
    if (t - this.lastSample >= 0.5) {
      this.lastSample = t;
      for (const k of ["shoulderRoll", "hipRoll", "kneeBend", "strokeRate", "symmetry"] as const) {
        if (raw[k] !== null) this.stats[k].add(raw[k]!);
      }
    }
  }

  private resetTemporal() {
    this.left.resetTemporal();
    this.right.resetTemporal();
    this.shoulderPeak.reset(); this.hipPeak.reset(); this.kneePeak.reset();
    for (const e of Object.values(this.ema)) e.reset();
    this.lastSample = -Infinity;
  }

  snapshot(): AnalysisSnapshot {
    const stats = Object.fromEntries(KEYS.map((k) => [k, this.stats[k].summary()])) as Record<MetricKey, StatSummary | null>;
    return {
      frames: this.frames,
      tracked: this.tracked,
      conf: Math.round(this.conf * 100),
      side: this.side,
      phase: this.phase,
      values: { ...this.values },
      strokes: this.strokes,
      droppedElbows: this.dropped,
      stats,
      score: techniqueScore(stats),
    };
  }
}

export function symmetryPct(a: number, b: number): number {
  const mean = (a + b) / 2;
  if (mean === 0) return 100;
  return Math.max(0, Math.min(100, 100 - (Math.abs(a - b) / mean) * 100));
}

/** Average share of samples inside the target range across metrics that have data. */
export function techniqueScore(stats: Record<MetricKey, StatSummary | null>): number | null {
  const pcts = Object.values(stats)
    .map((s) => s?.inRangePct)
    .filter((x): x is number => typeof x === "number");
  if (!pcts.length) return null;
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}
