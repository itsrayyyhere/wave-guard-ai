import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Car, Check, Flag, Minus, Plus, RotateCcw, Timer, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BOT_LEVELS,
  MAX_OPPONENTS,
  MIN_OPPONENTS,
  RACE_GOAL,
  WRONG_PENALTY_MS,
  type BotLevel,
  type RaceQuestion,
} from "@/lib/race/questions";
import { racePoints } from "@/lib/race/ranking";
import { recordRace, useRanking } from "@/lib/race/ranking-store";
import { useQuestionFeed } from "./useQuestionFeed";

type Phase = "lobby" | "countdown" | "racing" | "done";

type Racer = {
  id: string;
  name: string;
  level: BotLevel | null;
  position: number;
  finishedAt: number | null;
};

const PLAYER_ID = "you";
const BOT_NAMES = ["Torpedo", "Riptide", "Splash"];
const LANE_STYLES = [
  "bg-[image:var(--gradient-cyan)] text-primary-foreground glow-ring",
  "bg-success text-success-foreground",
  "bg-warning text-warning-foreground",
  "bg-chart-5 text-foreground",
];
const LEVEL_ORDER: BotLevel[] = ["rookie", "pro", "olympian"];

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function makeRacers(levels: BotLevel[]): Racer[] {
  return [
    { id: PLAYER_ID, name: "You", level: null, position: 0, finishedAt: null },
    ...levels.map((level, i) => ({
      id: `bot-${i}`,
      name: BOT_NAMES[i] ?? `Bot ${i + 1}`,
      level,
      position: 0,
      finishedAt: null,
    })),
  ];
}

function rankRacers(racers: Racer[]) {
  return [...racers].sort((a, b) => {
    if (a.finishedAt != null && b.finishedAt != null) return a.finishedAt - b.finishedAt;
    if (a.finishedAt != null) return -1;
    if (b.finishedAt != null) return 1;
    return b.position - a.position;
  });
}

export function RacingGame({ onExit }: { onExit: () => void }) {
  const feed = useQuestionFeed();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [opponents, setOpponents] = useState<BotLevel[]>(["pro"]);
  const [racers, setRacers] = useState<Racer[]>(() => makeRacers(["pro"]));
  const [count, setCount] = useState(3);
  const [now, setNow] = useState(0);
  const [question, setQuestion] = useState<RaceQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [penaltyEnd, setPenaltyEnd] = useState<number | null>(null);
  const [earned, setEarned] = useState(0);

  const startRef = useRef(0);
  const playerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedRef = useRef(false);

  // Warm up the question supply as soon as the game opens.
  useEffect(() => {
    void feed.prefetch();
  }, [feed.prefetch]);

  useEffect(
    () => () => {
      if (playerTimer.current) clearTimeout(playerTimer.current);
    },
    [],
  );

  // Countdown 3-2-1-GO
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      startRef.current = performance.now();
      setNow(0);
      setQuestion(feed.next());
      setPhase("racing");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count, feed]);

  // Race clock
  useEffect(() => {
    if (phase !== "racing") return;
    const id = setInterval(() => setNow(performance.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [phase]);

  // Bots answer on their own schedule
  useEffect(() => {
    if (phase !== "racing") return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    opponents.forEach((level, i) => {
      const id = `bot-${i}`;
      const cfg = BOT_LEVELS[level];
      let pos = 0;
      const step = (extra: number) => {
        const t = setTimeout(() => {
          timers.delete(t);
          if (Math.random() < cfg.accuracy) {
            pos += 1;
            const at = performance.now() - startRef.current;
            const p = pos;
            setRacers((rs) =>
              rs.map((r) =>
                r.id === id ? { ...r, position: p, finishedAt: p >= RACE_GOAL ? at : null } : r,
              ),
            );
            if (pos < RACE_GOAL) step(0);
          } else {
            step(WRONG_PENALTY_MS);
          }
        }, randomBetween(cfg.minMs, cfg.maxMs) + extra);
        timers.add(t);
      };
      step(0);
    });
    return () => timers.forEach(clearTimeout);
  }, [phase, opponents]);

  // End of race: you finished, or every bot already did
  useEffect(() => {
    if (phase !== "racing") return;
    const me = racers.find((r) => r.id === PLAYER_ID);
    const bots = racers.filter((r) => r.id !== PLAYER_ID);
    if (me?.finishedAt != null || bots.every((b) => b.finishedAt != null)) {
      if (playerTimer.current) clearTimeout(playerTimer.current);
      setNow(performance.now() - startRef.current);
      setPhase("done");
      if (!recordedRef.current) {
        recordedRef.current = true;
        const ranked = rankRacers(racers);
        const idx = ranked.findIndex((r) => r.id === PLAYER_ID);
        const beaten = ranked
          .slice(idx + 1)
          .map((r) => r.level)
          .filter((l): l is BotLevel => l != null);
        const points = racePoints({ place: idx + 1, opponents, beaten });
        recordRace({
          at: Date.now(),
          place: idx + 1,
          field: racers.length,
          opponents: [...opponents],
          points,
        });
        setEarned(points);
      }
    }
  }, [racers, phase, opponents]);

  function startRace() {
    if (playerTimer.current) clearTimeout(playerTimer.current);
    recordedRef.current = false;
    setEarned(0);
    setRacers(makeRacers(opponents));
    setPicked(null);
    setPenaltyEnd(null);
    setQuestion(null);
    setCount(3);
    setPhase("countdown");
  }

  function answer(i: number) {
    if (phase !== "racing" || !question || picked !== null) return;
    setPicked(i);
    if (i === question.answer) {
      const at = performance.now() - startRef.current;
      setRacers((rs) =>
        rs.map((r) => {
          if (r.id !== PLAYER_ID) return r;
          const p = r.position + 1;
          return { ...r, position: p, finishedAt: p >= RACE_GOAL ? at : null };
        }),
      );
      playerTimer.current = setTimeout(() => {
        setPicked(null);
        setQuestion(feed.next());
      }, 450);
    } else {
      setPenaltyEnd(performance.now() + WRONG_PENALTY_MS);
      playerTimer.current = setTimeout(() => {
        setPicked(null);
        setPenaltyEnd(null);
        setQuestion(feed.next());
      }, WRONG_PENALTY_MS);
    }
  }

  const me = racers.find((r) => r.id === PLAYER_ID);
  const penaltyLeft =
    penaltyEnd != null ? Math.max(0, penaltyEnd - (startRef.current + now)) : 0;

  // ---------- Lobby ----------
  if (phase === "lobby") {
    return (
      <div className="space-y-5 pb-16">
        <BackButton onClick={onExit} label="Games" />
        <section className="glass-card rounded-2xl p-5 text-center">
          <span className="glow-ring mx-auto grid size-12 place-items-center rounded-xl bg-[image:var(--gradient-cyan)] text-primary-foreground">
            <Car className="size-7" />
          </span>
          <h2 className="mt-3 text-lg font-semibold">Drag Race</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            First to {RACE_GOAL} correct answers wins. A wrong answer locks you out for{" "}
            {WRONG_PENALTY_MS / 1000}s.
          </p>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Opponents</h3>
            <span className="text-xs text-muted-foreground">{opponents.length + 1} tracks</span>
          </div>
          <ul className="space-y-2">
            {opponents.map((level, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-2">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", LANE_STYLES[i + 1])}>
                  <Car className="size-4" />
                </span>
                <span className="w-16 shrink-0 truncate text-sm font-medium">{BOT_NAMES[i]}</span>
                <div className="flex flex-1 gap-1">
                  {LEVEL_ORDER.map((l) => (
                    <button
                      key={l}
                      onClick={() =>
                        setOpponents((ops) => ops.map((o, j) => (j === i ? l : o)))
                      }
                      className={cn(
                        "flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-medium transition-colors",
                        level === l
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {BOT_LEVELS[l].label}
                    </button>
                  ))}
                </div>
                <button
                  aria-label={`Remove ${BOT_NAMES[i]}`}
                  disabled={opponents.length <= MIN_OPPONENTS}
                  onClick={() => setOpponents((ops) => ops.filter((_, j) => j !== i))}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  <Minus className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {opponents.length < MAX_OPPONENTS && (
            <button
              onClick={() => setOpponents((ops) => [...ops, "pro"])}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="size-4" /> Add opponent
            </button>
          )}
        </section>

        <button
          onClick={startRace}
          className="glow-ring flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-cyan)] py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Flag className="size-4" /> Start race
        </button>
      </div>
    );
  }

  // ---------- Countdown / Racing / Done ----------
  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center justify-between">
        <BackButton onClick={() => setPhase("lobby")} label={phase === "done" ? "Lobby" : "Quit"} />
        <span className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
          <Timer className="size-4" />
          {fmt(phase === "countdown" ? 0 : now)}
        </span>
      </div>

      <section className="glass-card space-y-3 rounded-2xl p-4">
        {racers.map((r, i) => (
          <Lane key={r.id} racer={r} style={LANE_STYLES[i] ?? ""} />
        ))}
      </section>

      {phase === "countdown" && (
        <section className="glass-card grid h-48 place-items-center rounded-2xl">
          <span key={count} className="animate-in zoom-in-50 fade-in text-gradient-cyan font-display text-6xl font-bold duration-300">
            {count > 0 ? count : "GO"}
          </span>
        </section>
      )}

      {phase === "racing" && question && (
        <section className="glass-card relative space-y-4 overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Your progress</span>
            <span className="font-medium text-primary">
              {me?.position ?? 0} / {RACE_GOAL}
            </span>
          </div>
          <p className="text-base leading-snug font-medium">{question.q}</p>
          <ul className="grid gap-2">
            {question.options.map((opt, i) => {
              const isCorrect = i === question.answer;
              const isPicked = i === picked;
              const revealed = picked !== null;
              return (
                <li key={`${question.q}-${i}`}>
                  <button
                    onClick={() => answer(i)}
                    disabled={revealed}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                      !revealed && "border-border bg-secondary/40 hover:border-primary/50 hover:bg-accent/30",
                      revealed && isCorrect && "border-success/60 bg-success/15",
                      revealed && isPicked && !isCorrect && "border-destructive/60 bg-destructive/15",
                      revealed && !isPicked && !isCorrect && "border-border bg-secondary/20 opacity-60",
                    )}
                  >
                    <span>{opt}</span>
                    {revealed && isCorrect && <Check className="size-4 shrink-0 text-success" />}
                    {revealed && isPicked && !isCorrect && <X className="size-4 shrink-0 text-destructive" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {picked !== null && (
            <p
              className={cn(
                "text-center text-sm font-medium",
                picked === question.answer ? "text-success" : "text-destructive",
              )}
            >
              {picked === question.answer
                ? "Correct — your car moves forward!"
                : `Wrong — penalty ${(penaltyLeft / 1000).toFixed(1)}s`}
            </p>
          )}
        </section>
      )}

      {phase === "done" && (
        <Results
          racers={racers}
          earned={earned}
          onRestart={startRace}
          onLobby={() => setPhase("lobby")}
        />
      )}
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}

function Lane({ racer, style }: { racer: Racer; style: string }) {
  const pct = (racer.position / RACE_GOAL) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-medium">
          {racer.name}
          {racer.level && (
            <span className="rounded-full bg-secondary px-1.5 py-px text-[10px] text-muted-foreground">
              {BOT_LEVELS[racer.level].label}
            </span>
          )}
        </span>
        <span className="font-mono text-muted-foreground">
          {racer.finishedAt != null ? fmt(racer.finishedAt) : `${racer.position}/${RACE_GOAL}`}
        </span>
      </div>
      <div className="relative h-11 rounded-lg border border-border bg-secondary/50">
        <div className="absolute inset-y-0 right-6 left-6 flex justify-between">
          {Array.from({ length: RACE_GOAL + 1 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "w-px bg-border",
                i === RACE_GOAL && "w-1.5 bg-[repeating-linear-gradient(0deg,var(--foreground)_0_5px,transparent_5px_10px)]",
              )}
            />
          ))}
        </div>
        <div className="absolute inset-y-0 right-6 left-6">
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
            style={{ left: `${pct}%` }}
          >
            <span className={cn("grid size-8 place-items-center rounded-lg", style)}>
              <Car className="size-5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Results({
  racers,
  earned,
  onRestart,
  onLobby,
}: {
  racers: Racer[];
  earned: number;
  onRestart: () => void;
  onLobby: () => void;
}) {
  const ranking = useRanking();
  const ranked = rankRacers(racers);
  const place = ranked.findIndex((r) => r.id === PLAYER_ID) + 1;
  const won = place === 1 && ranked[0]?.finishedAt != null;
  return (
    <section className="glass-card space-y-4 rounded-2xl p-5">
      <div className="text-center">
        <Trophy className={cn("mx-auto size-8", won ? "text-warning" : "text-muted-foreground")} />
        <h2 className="mt-2 text-lg font-semibold">
          {won ? "You won the race!" : `You placed #${place}`}
        </h2>
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
            earned > 0 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
          )}
        >
          {earned > 0 ? `+${earned} ranking points` : "No ranking points this race"}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Total: <span className="font-mono text-foreground">{ranking.total}</span> pts
        </p>
      </div>
      <ol className="space-y-1.5">
        {ranked.map((r, i) => (
          <li
            key={r.id}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
              r.id === PLAYER_ID ? "bg-primary/12 text-primary" : "bg-secondary/40",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="w-5 font-mono text-xs text-muted-foreground">#{i + 1}</span>
              {r.name}
            </span>
            <span className="font-mono text-xs">
              {r.finishedAt != null ? fmt(r.finishedAt) : `${r.position}/${RACE_GOAL}`}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <button
          onClick={onLobby}
          className="flex-1 rounded-full border border-border py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Change opponents
        </button>
        <button
          onClick={onRestart}
          className="glow-ring flex flex-1 items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-cyan)] py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <RotateCcw className="size-4" /> Race again
        </button>
      </div>
    </section>
  );
}
