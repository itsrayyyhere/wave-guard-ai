import { useCallback, useEffect, useRef, useState } from "react";
import { PoseVideoAnalyzer, type PoseModel } from "./PoseVideoAnalyzer";
import { Play, Pause, SkipBack, SkipForward, Gauge, Activity, RotateCw, RefreshCcw, Lightbulb, ScanSearch, Square } from "lucide-react";
import {
  METRICS,
  angle2,
  inTarget,
  techniqueScore,
  type AnalysisSnapshot,
  type ArmPhase,
  type MetricDef,
  type MetricKey,
  type StatSummary,
} from "@/lib/pose/metrics";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import swimmer from "@/assets/swimmer.jpg";

// Normalized MediaPipe-style landmark set (subset of the 33 points, upper body focus)
const BASE: Record<string, [number, number]> = {
  nose: [0.37, 0.44],
  leftEye: [0.35, 0.42],
  rightEye: [0.39, 0.42],
  leftEar: [0.42, 0.43],
  mouth: [0.36, 0.47],
  leftShoulder: [0.48, 0.52],
  rightShoulder: [0.46, 0.44],
  leftElbow: [0.34, 0.28],
  rightElbow: [0.6, 0.62],
  leftWrist: [0.19, 0.12],
  rightWrist: [0.7, 0.7],
  leftHand: [0.13, 0.08],
  rightHand: [0.76, 0.74],
  leftHip: [0.71, 0.63],
  rightHip: [0.69, 0.56],
  leftKnee: [0.86, 0.72],
  rightKnee: [0.85, 0.63],
  leftAnkle: [0.96, 0.79],
  rightAnkle: [0.95, 0.68],
};

const EDGES: [string, string][] = [
  ["leftEye", "rightEye"],
  ["nose", "leftEye"],
  ["nose", "rightEye"],
  ["leftEye", "leftEar"],
  ["nose", "mouth"],
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["leftWrist", "leftHand"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["rightWrist", "rightHand"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

const PHASES: ArmPhase[] = ["Entry & Extension", "Catch", "Pull-Through", "Push & Exit", "Recovery"];

/** Animated sample skeleton points in pixel space. */
function demoPoints(t: number, w: number, h: number) {
  const phase = (t / 100) * Math.PI * 2;
  const pts: Record<string, [number, number]> = {};
  for (const [k, [x, y]] of Object.entries(BASE)) {
    const amp = k.includes("Wrist") || k.includes("Hand") ? 0.05 : k.includes("Elbow") ? 0.032 : 0.014;
    pts[k] = [(x + Math.sin(phase + x * 5) * amp) * w, (y + Math.cos(phase + y * 4) * amp) * h];
  }
  return pts;
}

function demoElbows(t: number) {
  const p = demoPoints(t, 16, 9);
  const at = (s: string, e: string, wr: string) => {
    const a = p[s]!, b = p[e]!, c = p[wr]!;
    return angle2({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, { x: c[0], y: c[1] });
  };
  return {
    left: at("leftShoulder", "leftElbow", "leftWrist"),
    right: at("rightShoulder", "rightElbow", "rightWrist"),
  };
}

/** Sample analysis so every measurement is visible before a video is uploaded. */
function demoSnapshot(t: number): AnalysisSnapshot {
  const p = (t / 100) * Math.PI * 2;
  const elbows = demoElbows(t);
  const S = (avg: number, inRangePct: number | null): StatSummary => ({ n: 48, avg, min: avg - 6, max: avg + 6, inRangePct });
  const stats: Record<MetricKey, StatSummary | null> = {
    catchAngle: S(91, 58),
    rightElbow: S(124, null),
    leftElbow: S(128, null),
    shoulderRoll: S(22, 8),
    hipRoll: S(19, 21),
    head: S(15, 81),
    bodyLine: S(167, 74),
    kneeBend: S(31, 69),
    strokeRate: S(34, null),
    symmetry: S(87, 64),
  };
  return {
    frames: Math.round(t * 25),
    tracked: Math.round(t * 25 * 0.92),
    conf: 92,
    side: "right",
    phase: PHASES[Math.floor((t / 100) * PHASES.length) % PHASES.length] ?? null,
    values: {
      catchAngle: 88 + Math.sin(p) * 6,
      rightElbow: elbows.right,
      leftElbow: elbows.left,
      shoulderRoll: 22 + Math.cos(p) * 4,
      hipRoll: 19 + Math.cos(p) * 3,
      head: 15 + Math.sin(p * 2) * 6,
      bodyLine: 167 + Math.sin(p) * 5,
      kneeBend: 31 + Math.sin(p * 4) * 8,
      strokeRate: 34,
      symmetry: 87,
    },
    strokes: 12 + Math.floor((t / 100) * 12),
    droppedElbows: 4,
    stats,
    score: techniqueScore(stats),
  };
}

const fmtVal = (v: number | null | undefined, unit: string) =>
  v === null || v === undefined ? "—" : `${Math.round(v)}${unit === "°" || unit === "%" ? unit : ` ${unit}`}`;

export function PoseAnalysisView({ file }: { file?: File | null }) {
  const [speed, setSpeed] = useState(0.5);
  const [model, setModel] = useState<PoseModel>("heavy");
  const [snap, setSnap] = useState<AnalysisSnapshot | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [ended, setEnded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const onScanDone = useCallback(() => setScanning(false), []);
  const onSnapshot = useCallback((s: AnalysisSnapshot) => {
    setSnap(s);
    setEnded(false);
  }, []);
  const onEnded = useCallback(() => setEnded(true), []);

  useEffect(() => {
    setSnap(null);
    setEnded(false);
    setScanning(false);
  }, [file]);

  if (!file) return <DemoPoseView />;

  const v = snap?.values;
  const catchOk = v?.catchAngle != null ? inTarget("catchAngle", v.catchAngle) : null;
  const trackedPct = snap && snap.frames ? Math.round((snap.tracked / snap.frames) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="glow-ring relative aspect-video w-full overflow-hidden rounded-2xl border border-primary/20 bg-black">
        <PoseVideoAnalyzer
          file={file}
          playbackRate={speed}
          model={model}
          resetSignal={resetSignal}
          onSnapshot={onSnapshot}
          onEnded={onEnded}
          scanning={scanning}
          onScanProgress={setScanPct}
          onScanDone={onScanDone}
        />
        <div className="pointer-events-none absolute top-2.5 left-2.5 space-y-1.5 sm:top-4 sm:left-4">
          <HudChip
            label="Catch Angle"
            value={fmtVal(v?.catchAngle, "°")}
            sub="Target 90°–110°"
            tone={catchOk === false ? "warn" : "ok"}
          />
        </div>
        <div className="pointer-events-none absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5 sm:top-4 sm:right-4">
          <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/70 px-2.5 py-1 font-mono text-[10px] text-primary backdrop-blur-md">
            <Activity className="size-3" /> {snap?.conf ?? 0}% conf
          </span>
          <div className="rounded-lg border border-primary/30 bg-background/70 px-2.5 py-1.5 text-right backdrop-blur-md">
            <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Stroke Phase{snap?.side ? ` · ${snap.side} arm` : ""}
            </p>
            <p className="font-mono text-xs font-semibold text-primary sm:text-sm">{snap?.phase ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="glass-card space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm">
            <span className="font-medium">{file.name}</span>
            <span className="block text-xs text-muted-foreground">
              {snap?.frames ?? 0} frames · swimmer tracked in {trackedPct}%
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary/60 p-1">
            <Gauge className="mx-1 size-3.5 text-muted-foreground" />
            {[1, 0.5, 0.25].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-xs transition-colors",
                  speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-1">
            {(
              [
                ["heavy", "Precise"],
                ["full", "Balanced"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  model === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={scanning} onClick={() => setResetSignal((n) => n + 1)}>
              <RefreshCcw className="size-3.5" /> Reset
            </Button>
            <Button
              variant={scanning ? "outline" : "hero"}
              size="sm"
              onClick={() => {
                if (!scanning) setScanPct(0);
                setScanning((s) => !s);
              }}
            >
              {scanning ? <Square className="size-3.5" /> : <ScanSearch className="size-3.5" />}
              {scanning ? "Stop" : "Scan every frame"}
            </Button>
          </div>
        </div>
        {scanning && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Scanning frame by frame…</span>
              <span className="font-mono">{Math.round(scanPct)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${scanPct}%` }} />
            </div>
          </div>
        )}
      </div>

      <MetricsPanel snap={snap} ended={ended} />


      <div className="glass-card space-y-1.5 rounded-2xl p-4 text-xs text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Lightbulb className="size-3.5 text-primary" /> For the most accurate results
        </p>
        <p>Film side-on with the camera level and the whole body in frame. For the most precise numbers, tap “Scan every frame” — it steps through the whole video so no frame is skipped.</p>
        <p>Faded joints are low-confidence and are left out of the numbers. Roll angles are estimated from depth and are less precise than joint angles.</p>
        <p className="flex items-center gap-2 pt-1">
          <RotateCw className="size-3.5 shrink-0 text-primary" />
          MediaPipe Pose runs on your device — the video never leaves your browser.
        </p>
      </div>
    </div>
  );
}

function MetricTile({ def, value, stat }: { def: MetricDef; value: number | null; stat: StatSummary | null }) {
  const ok = value === null ? null : inTarget(def.key, value);
  const hasTarget = def.min !== undefined && def.max !== undefined;
  return (
    <div
      className={cn(
        "rounded-xl border bg-secondary/40 p-3",
        ok === false ? "border-warning/40" : ok === true ? "border-success/40" : "border-border",
      )}
    >
      <p className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">{def.label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-lg font-semibold",
          ok === false ? "text-warning" : ok === true ? "text-success" : "text-primary",
        )}
      >
        {fmtVal(value, def.unit)}
      </p>
      {hasTarget && (
        <p className="truncate text-[10px] font-medium text-muted-foreground">
          Target {def.min}–{def.max}
          {def.unit}
        </p>
      )}
      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground/80">{def.hint}</p>
      {stat && (
        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
          avg {fmtVal(stat.avg, def.unit)}
          {stat.inRangePct !== null && ` · ${Math.round(stat.inRangePct)}% in range`}
        </p>
      )}
    </div>
  );
}

function EventTile({ label, value, hint, warn }: { label: string; value: number; hint: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-secondary/40 p-3", warn ? "border-warning/40" : "border-border")}>
      <p className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn("mt-0.5 font-mono text-lg font-semibold", warn ? "text-warning" : "text-primary")}>{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function SessionSummary({ snap, ended, demo }: { snap: AnalysisSnapshot | null; ended: boolean; demo?: boolean }) {
  const rows = METRICS.filter((m) => m.min !== undefined && snap?.stats[m.key]);
  return (
    <section className="glass-card space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Session summary</h3>
          <p className="text-xs text-muted-foreground">
            {demo
              ? "Sample session — averages and % of time in target range."
              : ended
                ? "Analysis complete — full video processed."
                : "Updates as the video plays."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">Technique score</p>
          <p className="font-mono text-2xl font-bold text-gradient-cyan">{snap?.score ?? "—"}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Play the video to collect stroke data.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((m) => {
            const s = snap!.stats[m.key]!;
            const pct = Math.round(s.inRangePct ?? 0);
            return (
              <div key={m.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{m.label}</span>
                  <span className="font-mono text-muted-foreground">
                    avg {fmtVal(s.avg, m.unit)} · {pct}% in range
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full", pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DemoPoseView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.5);
  const [t, setT] = useState(32);

  // playback clock
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setT((v) => (v + speed * 0.6) % 100);
    }, 40);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  // skeleton renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pts = demoPoints(t, w, h);

    ctx.lineCap = "round";
    for (const [a, b] of EDGES) {
      const p1 = pts[a];
      const p2 = pts[b];
      if (!p1 || !p2) continue;
      ctx.strokeStyle = "rgba(56, 232, 240, 0.85)";
      ctx.shadowColor = "rgba(56, 232, 240, 0.9)";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }

    for (const [k, p] of Object.entries(pts)) {
      const hot = k === "rightShoulder" || k === "rightElbow";
      ctx.shadowBlur = 12;
      ctx.shadowColor = hot ? "rgba(255,120,110,0.95)" : "rgba(56,232,240,0.95)";
      ctx.fillStyle = hot ? "#ff8a7a" : "#eafcff";
      ctx.beginPath();
      ctx.arc(p[0], p[1], hot ? 5 : 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // live elbow angle labels
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    const ang = demoElbows(t);
    for (const [el, value] of [["leftElbow", ang.left], ["rightElbow", ang.right]] as const) {
      const p = pts[el];
      if (!p) continue;
      const label = `${Math.round(value)}°`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(8,16,24,0.75)";
      ctx.fillRect(p[0] + 8, p[1] - 18, tw + 8, 16);
      ctx.fillStyle = "#38e8f0";
      ctx.fillText(label, p[0] + 12, p[1] - 6);
    }
  }, [t]);

  const demo = demoSnapshot(t);
  const elbowAngle = Math.round(demo.values.catchAngle ?? 0);
  const bodyRoll = Math.round(demo.values.shoulderRoll ?? 0);
  const strokePhase = demo.phase;

  const fmt = (v: number) => {
    const secs = (v / 100) * 84;
    return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div
        ref={wrapRef}
        className="glow-ring relative aspect-video w-full overflow-hidden rounded-2xl border border-primary/20 bg-black"
      >
        <img
          src={swimmer}
          alt="Underwater freestyle stroke frame under pose analysis"
          width={1280}
          height={720}
          className="absolute inset-0 size-full object-cover opacity-90"
        />
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />

        {/* HUD */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <HudChip label="Elbow Catch Angle" value={`${elbowAngle}°`} sub="Target 90°–110°" tone={elbowAngle < 90 ? "warn" : "ok"} />
              <HudChip label="Body Roll Angle" value={`${bodyRoll}°`} sub="WARN: Low Roll" tone="warn" />
            </div>
            <div className="rounded-lg border border-primary/30 bg-background/70 px-2.5 py-1.5 text-right backdrop-blur-md">
              <p className="text-[10px] tracking-wider text-muted-foreground uppercase">Stroke Phase</p>
              <p className="font-mono text-xs font-semibold text-primary sm:text-sm">{strokePhase}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/70 px-2.5 py-1 font-mono text-[10px] text-primary backdrop-blur-md">
              <Activity className="size-3" /> 33 landmarks · 92% conf
            </span>
            <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur-md">
              {fmt(t)} / 01:24
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card space-y-4 rounded-2xl p-4">
        <Slider value={[t]} onValueChange={([v]) => setT(v ?? 0)} max={100} step={0.5} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => setT((v) => Math.max(0, v - 5))}>
              <SkipBack className="size-4" />
            </Button>
            <Button variant="hero" size="icon" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setT((v) => Math.min(100, v + 5))}>
              <SkipForward className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-1">
            <Gauge className="mx-1 size-3.5 text-muted-foreground" />
            {[1, 0.5, 0.25].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-xs transition-colors",
                  speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <MetricsPanel snap={demo} ended={false} demo />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <RotateCw className="size-3.5 shrink-0 text-primary" />
        Sample session shown. Upload a swim video on the Upload tab to measure your own stroke.
      </p>
    </div>
  );
}

function HudChip({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/70 px-2.5 py-1.5 backdrop-blur-md">
      <p className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className="font-mono text-sm font-semibold sm:text-base">
        {value}{" "}
        <span className={cn("text-[10px] font-medium", tone === "warn" ? "text-warning" : "text-success")}>
          {sub}
        </span>
      </p>
    </div>
  );
}

function MetricsPanel({ snap, ended, demo }: { snap: AnalysisSnapshot | null; ended: boolean; demo?: boolean }) {
  return (
    <>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {demo ? "Technique metrics · sample" : "Live technique metrics"}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {METRICS.map((m) => (
            <MetricTile key={m.key} def={m} value={snap?.values[m.key] ?? null} stat={snap?.stats[m.key] ?? null} />
          ))}
          <EventTile label="Strokes Counted" value={snap?.strokes ?? 0} hint="Hand passes under the shoulder" />
          <EventTile
            label="Dropped Elbows"
            value={snap?.droppedElbows ?? 0}
            hint="Wrist above elbow on recovery"
            warn={(snap?.droppedElbows ?? 0) > 0}
          />
        </div>
      </section>
      <SessionSummary snap={snap} ended={ended} demo={demo} />
    </>
  );
}
