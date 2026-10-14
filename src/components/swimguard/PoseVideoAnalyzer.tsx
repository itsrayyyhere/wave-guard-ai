import { useEffect, useRef, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LM = { x: number; y: number; z: number; visibility?: number };

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

function angleAt(a: LM, b: LM, c: LM) {
  const x1 = a.x - b.x, y1 = a.y - b.y, x2 = c.x - b.x, y2 = c.y - b.y;
  const dot = x1 * x2 + y1 * y2;
  const m = Math.hypot(x1, y1) * Math.hypot(x2, y2) || 1;
  return (Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180) / Math.PI;
}

export type LiveMetrics = { elbow: number; roll: number; conf: number; frames: number };

export function PoseVideoAnalyzer({
  file,
  playbackRate,
  onMetrics,
}: {
  file: File;
  playbackRate: number;
  onMetrics: (m: LiveMetrics) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, url]);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: LM[][] }; close: () => void } | null = null;
    let frames = 0;
    let lastTime = -1;

    (async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        landmarker = (await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        })) as unknown as typeof landmarker;
        if (cancelled) { (landmarker as { close: () => void } | null)?.close(); return; }
        setStatus("ready");

        const loop = () => {
          raf = requestAnimationFrame(loop);
          const v = videoRef.current;
          const c = canvasRef.current;
          if (!v || !c || !landmarker || v.readyState < 2 || v.currentTime === lastTime) return;
          lastTime = v.currentTime;
          const res = landmarker.detectForVideo(v, performance.now());
          const w = c.clientWidth, h = c.clientHeight;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
          const ctx = c.getContext("2d")!;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          // map normalized coords into object-contain video box
          const s = Math.min(w / v.videoWidth, h / v.videoHeight);
          const vw = v.videoWidth * s, vh = v.videoHeight * s;
          const ox = (w - vw) / 2, oy = (h - vh) / 2;
          const P = (l: LM): [number, number] => [ox + l.x * vw, oy + l.y * vh];
          const raw = res.landmarks[0];
          if (!raw) return;
          const lm = raw as LM[];
          const g = (i: number) => lm[i] as LM;
          frames++;
          ctx.lineCap = "round";
          ctx.strokeStyle = "rgba(56,232,240,0.85)";
          ctx.shadowColor = "rgba(56,232,240,0.9)";
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2.4;
          for (const [a, b] of CONNECTIONS) {
            const [x1, y1] = P(g(a)); const [x2, y2] = P(g(b));
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
          lm.forEach((l, i) => {
            const hot = i === 12 || i === 14;
            const [x, y] = P(l);
            ctx.fillStyle = hot ? "#ff8a7a" : "#eafcff";
            ctx.shadowColor = hot ? "rgba(255,120,110,0.95)" : "rgba(56,232,240,0.95)";
            ctx.beginPath(); ctx.arc(x, y, hot ? 5 : 3.2, 0, Math.PI * 2); ctx.fill();
          });
          ctx.shadowBlur = 0;
          const elbow = angleAt(g(12), g(14), g(16));
          const roll = (Math.atan2(Math.abs(g(12).z - g(11).z), Math.abs(g(12).x - g(11).x) + 1e-6) * 180) / Math.PI;
          const conf = lm.reduce((acc, l) => acc + (l.visibility ?? 0), 0) / lm.length;
          onMetrics({ elbow: Math.round(elbow), roll: Math.round(roll), conf: Math.round(conf * 100), frames });
        };
        loop();
      } catch (e) {
        setStatus("error");
        setErr(e instanceof Error ? e.message : "Failed to load MediaPipe");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      landmarker?.close();
    };
  }, [onMetrics]);

  return (
    <>
      {url && (
        <video
          ref={videoRef}
          src={url}
          className="absolute inset-0 size-full object-contain"
          controls
          muted
          playsInline
          autoPlay
          loop
        />
      )}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
      {status !== "ready" && (
        <div className={cn("absolute inset-0 grid place-items-center bg-background/70 text-sm", status === "error" && "text-destructive")}>
          {status === "loading" ? (
            <span className="flex items-center gap-2 text-primary"><Loader2 className="size-4 animate-spin" /> Loading MediaPipe pose model…</span>
          ) : (
            <span className="flex items-center gap-2"><Activity className="size-4" /> {err}</span>
          )}
        </div>
      )}
    </>
  );
}
