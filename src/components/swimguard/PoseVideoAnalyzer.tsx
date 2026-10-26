import { useEffect, useRef, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SwimAnalyzer, VIS, angle3, type AnalysisSnapshot, type Landmark } from "@/lib/pose/metrics";

const MP_VERSION = "1.1.0";
const MODELS = {
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  heavy: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
} as const;
export type PoseModel = keyof typeof MODELS;

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: Landmark[][]; worldLandmarks: Landmark[][] };
  close: () => void;
};

export function PoseVideoAnalyzer({
  file,
  playbackRate,
  model,
  resetSignal,
  onSnapshot,
  onEnded,
}: {
  file: File;
  playbackRate: number;
  model: PoseModel;
  resetSignal: number;
  onSnapshot: (s: AnalysisSnapshot) => void;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyzerRef = useRef(new SwimAnalyzer());
  const onSnapRef = useRef(onSnapshot);
  onSnapRef.current = onSnapshot;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    analyzerRef.current.reset();
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (resetSignal === 0) return;
    analyzerRef.current.reset();
    onSnapRef.current(analyzerRef.current.snapshot());
  }, [resetSignal]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, url]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let raf = 0;
    let vfc = 0;
    let vfcVideo: HTMLVideoElement | null = null;
    let landmarker: Landmarker | null = null;
    let lastMedia = -1;
    let lastTs = 0;
    let lastEmit = 0;
    setStatus("loading");

    const draw = (v: HTMLVideoElement, lm: Landmark[] | undefined, world: Landmark[] | undefined) => {
      const c = canvasRef.current;
      if (!c) return;
      const w = c.clientWidth, h = c.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!lm || !v.videoWidth) return;
      // map normalized coords into the object-contain video box
      const s = Math.min(w / v.videoWidth, h / v.videoHeight);
      const vw = v.videoWidth * s, vh = v.videoHeight * s;
      const ox = (w - vw) / 2, oy = (h - vh) / 2;
      const P = (l: Landmark): [number, number] => [ox + l.x * vw, oy + l.y * vh];
      const vis = (i: number) => lm[i]?.visibility ?? 0;

      ctx.lineCap = "round";
      ctx.lineWidth = 2.4;
      for (const [a, b] of CONNECTIONS) {
        const la = lm[a], lb = lm[b];
        if (!la || !lb) continue;
        const good = vis(a) >= VIS && vis(b) >= VIS;
        ctx.strokeStyle = good ? "rgba(56,232,240,0.9)" : "rgba(56,232,240,0.25)";
        ctx.shadowColor = "rgba(56,232,240,0.9)";
        ctx.shadowBlur = good ? 10 : 0;
        const [x1, y1] = P(la); const [x2, y2] = P(lb);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      lm.forEach((l, i) => {
        const good = vis(i) >= VIS;
        const hot = i === 12 || i === 14 || i === 11 || i === 13;
        const [x, y] = P(l);
        ctx.globalAlpha = good ? 1 : 0.3;
        ctx.fillStyle = hot ? "#ff8a7a" : "#eafcff";
        ctx.shadowColor = hot ? "rgba(255,120,110,0.95)" : "rgba(56,232,240,0.95)";
        ctx.shadowBlur = good ? 12 : 0;
        ctx.beginPath(); ctx.arc(x, y, hot ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // elbow angle labels
      if (world) {
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        for (const [sh, el, wr] of [[11, 13, 15], [12, 14, 16]] as const) {
          if (vis(sh) < VIS || vis(el) < VIS || vis(wr) < VIS) continue;
          const ang = Math.round(angle3(world[sh]!, world[el]!, world[wr]!));
          const [x, y] = P(lm[el]!);
          const label = `${ang}°`;
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(8,16,24,0.75)";
          ctx.fillRect(x + 8, y - 18, tw + 8, 16);
          ctx.fillStyle = "#38e8f0";
          ctx.fillText(label, x + 12, y - 6);
        }
      }
    };

    const process = (v: HTMLVideoElement, mediaTime: number) => {
      if (!landmarker || v.readyState < 2 || mediaTime === lastMedia) return;
      lastMedia = mediaTime;
      const ts = Math.max(performance.now(), lastTs + 1); // must strictly increase
      lastTs = ts;
      const res = landmarker.detectForVideo(v, ts);
      const lm = res.landmarks[0];
      const world = res.worldLandmarks[0];
      analyzerRef.current.update(lm, world, mediaTime, v.videoWidth, v.videoHeight);
      draw(v, lm, world);
      const now = performance.now();
      if (now - lastEmit > 120) {
        lastEmit = now;
        onSnapRef.current(analyzerRef.current.snapshot());
      }
    };

    const schedule = () => {
      if (cancelled) return;
      const v = videoRef.current;
      if (v && typeof v.requestVideoFrameCallback === "function") {
        // fires once per decoded frame → no skipped frames when detection keeps up
        vfcVideo = v;
        vfc = v.requestVideoFrameCallback((_now, meta) => {
          process(v, meta.mediaTime);
          schedule();
        });
      } else {
        raf = requestAnimationFrame(() => {
          if (v) process(v, v.currentTime);
          schedule();
        });
      }
    };

    (async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`,
        );
        const create = (delegate: "GPU" | "CPU") =>
          PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODELS[model], delegate },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.6,
          });
        let lmk;
        try {
          lmk = await create("GPU");
        } catch {
          lmk = await create("CPU");
        }
        landmarker = lmk as unknown as Landmarker;
        if (cancelled) { landmarker.close(); return; }
        setStatus("ready");
        // analyse the current frame immediately (paused video / after model switch)
        if (videoRef.current) { lastMedia = -1; process(videoRef.current, videoRef.current.currentTime); }
        schedule();
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setErr(e instanceof Error ? e.message : "Failed to load MediaPipe");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (vfcVideo && vfc) vfcVideo.cancelVideoFrameCallback(vfc);
      landmarker?.close();
    };
  }, [model, url]);

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
          onEnded={onEnded}
        />
      )}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
      {status !== "ready" && (
        <div className={cn("absolute inset-0 grid place-items-center bg-background/70 text-sm", status === "error" && "text-destructive")}>
          {status === "loading" ? (
            <span className="flex items-center gap-2 text-primary">
              <Loader2 className="size-4 animate-spin" /> Loading {model === "heavy" ? "precise" : "balanced"} pose model…
            </span>
          ) : (
            <span className="flex items-center gap-2"><Activity className="size-4" /> {err}</span>
          )}
        </div>
      )}
    </>
  );
}
