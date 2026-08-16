import { useCallback, useState } from "react";
import {
  UploadCloud,
  Video,
  Wifi,
  ChevronRight,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileVideo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Session = {
  id: string;
  name: string;
  date: string;
  duration: string;
  risk: "low" | "high" | "moderate";
};

const sessions: Session[] = [
  {
    id: "s1",
    name: "Morning Freestyle Set",
    date: "Today · 06:412",
    duration: "01:24",
    risk: "high",
  },
  { id: "s2", name: "Threshold 400m Pace", date: "Yesterday · 17:10", duration: "02:03", risk: "moderate" },
  { id: "s3", name: "Technique Drill Block", date: "Aug 14 · 07:55", duration: "00:48", risk: "low" },
  { id: "s4", name: "Sprint 50m Repeats", date: "Aug 12 · 18:22", duration: "00:36", risk: "low" },
];

const riskMeta = {
  low: { label: "Low Injury Risk", cls: "bg-success/15 text-success border-success/30", Icon: ShieldCheck },
  moderate: { label: "Moderate Risk", cls: "bg-warning/15 text-warning border-warning/30", Icon: AlertTriangle },
  high: { label: "High Shoulder Risk", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertTriangle },
} as const;

export function DashboardView({ onOpenSession }: { onOpenSession: () => void }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      toast.success("Video queued for pose analysis", {
        description: "Running MediaPipe 33-point extraction…",
      });
      onOpenSession();
    },
    [onOpenSession],
  );

  return (
    <div className="space-y-6">
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "bg-grid relative overflow-hidden rounded-2xl border border-dashed p-8 text-center transition-all duration-300",
          dragging
            ? "glow-ring scale-[1.01] border-primary bg-primary/5"
            : "border-border bg-card/60 hover:border-primary/50",
        )}
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/30">
          <UploadCloud className="size-8" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Upload Swim Video for Pose Analysis</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Drag &amp; drop underwater or deck footage. MP4 / MOV up to 2 GB, 60fps recommended.
        </p>
        <Button variant="hero" size="lg" className="mt-5" onClick={onOpenSession}>
          <FileVideo className="size-4" />
          Browse Files
        </Button>
      </section>

      <Button variant="outlineGlow" size="lg" className="w-full" onClick={() => toast("Scanning local network for RTSP streams…")}>
        <Wifi className="size-4" />
        Connect Underwater Camera (RTSP / Wi-Fi)
      </Button>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Recent Sessions
          </h3>
          <span className="text-xs text-muted-foreground">{sessions.length} runs</span>
        </div>
        <ul className="space-y-2.5">
          {sessions.map((s) => {
            const meta = riskMeta[s.risk];
            return (
              <li key={s.id}>
                <button
                  onClick={onOpenSession}
                  className="glass-card group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:border-primary/40 hover:bg-accent/30"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Video className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      {s.date} · {s.duration}
                    </span>
                    <span
                      className={cn(
                        "mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        meta.cls,
                      )}
                    >
                      <meta.Icon className="size-3" />
                      {meta.label}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
