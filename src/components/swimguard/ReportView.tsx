import { Activity, ArrowRight, CircleAlert, Dumbbell, TriangleAlert, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCORE = 64;

function Gauge() {
  const r = 70;
  const c = Math.PI * r; // half circle
  const pct = SCORE / 100;
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 180 100" className="w-full">
        <path
          d="M 20 92 A 70 70 0 0 1 160 92"
          fill="none"
          stroke="var(--secondary)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 20 92 A 70 70 0 0 1 160 92"
          fill="none"
          stroke="var(--warning)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--warning) 60%, transparent))" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="font-mono text-4xl font-bold text-warning">{SCORE}</p>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Moderate Risk · /100</p>
      </div>
    </div>
  );
}

const flags = [
  {
    tone: "high" as const,
    title: "Dropped Elbow on Recovery",
    count: "Detected 4 times",
    desc: "Wrist elevated above elbow during recovery phase, increasing internal rotation load on the supraspinatus.",
  },
  {
    tone: "warn" as const,
    title: "Insufficient Trunk Rotation",
    count: "Persistent across 82% of strokes",
    desc: "Average roll 22° (Recommended: 35°–45°). Low roll forces the shoulder to compensate at catch.",
  },
];

const drills = [
  { name: "Fingertip Drag Drill", focus: "High-elbow recovery", sets: "4 × 50m" },
  { name: "Kick on Side", focus: "Trunk rotation & balance", sets: "6 × 25m" },
  { name: "Sculling at Front Quadrant", focus: "Catch mechanics", sets: "3 × 30s" },
];

export function ReportView() {
  return (
    <div className="space-y-5">
      <section className="glass-card rounded-2xl p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Injury Risk Score</h2>
            <p className="text-xs text-muted-foreground">Session · Morning Freestyle Set</p>
          </div>
          <span className="shrink-0 rounded-full border border-warning/30 bg-warning/15 px-2.5 py-1 text-[11px] font-medium text-warning">
            Moderate
          </span>
        </div>
        <div className="mt-3">
          <Gauge />
        </div>
        <div className="mt-3 rounded-xl border border-warning/25 bg-warning/10 p-3">
          <p className="flex items-start gap-2 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>
              Primary concern: <strong>Right Shoulder Subacromial Impingement</strong> — driven by recovery
              mechanics and limited body roll.
            </span>
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Flagged Mechanics
        </h3>
        {flags.map((f) => (
          <article
            key={f.title}
            className={cn(
              "rounded-2xl border p-4",
              f.tone === "high"
                ? "border-destructive/30 bg-destructive/8"
                : "border-warning/30 bg-warning/8",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                  f.tone === "high" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning",
                )}
              >
                <TriangleAlert className="size-4" />
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold">{f.title}</h4>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-[11px]",
                    f.tone === "high" ? "text-destructive" : "text-warning",
                  )}
                >
                  {f.count}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Drill Recommendations</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          3 corrective drills for shoulder clearance and rotation.
        </p>
        <ul className="mt-3 space-y-2">
          {drills.map((d, i) => (
            <li
              key={d.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 font-mono text-xs text-primary">
                0{i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">{d.focus}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-primary">{d.sets}</span>
            </li>
          ))}
        </ul>
        <Button variant="hero" className="mt-4 w-full">
          Add to Training Plan
          <ArrowRight className="size-4" />
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-3">
          <Waves className="size-4 text-primary" />
          <p className="mt-2 font-mono text-lg font-semibold">22°</p>
          <p className="text-xs text-muted-foreground">Avg Body Roll</p>
        </div>
        <div className="glass-card rounded-xl p-3">
          <Activity className="size-4 text-primary" />
          <p className="mt-2 font-mono text-lg font-semibold">88°</p>
          <p className="text-xs text-muted-foreground">Avg Catch Angle</p>
        </div>
      </section>
    </div>
  );
}
