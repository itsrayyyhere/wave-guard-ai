import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Car, Check, Flag, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = { q: string; options: string[]; answer: number };

const QUESTIONS: Question[] = [
  {
    q: "What is the recommended trunk rotation (body roll) range in freestyle?",
    options: ["10–20°", "35–45°", "60–75°", "90°"],
    answer: 1,
  },
  {
    q: "During the recovery phase, where should the elbow be relative to the wrist?",
    options: ["Below the wrist", "Level with the wrist", "Above the wrist", "It doesn't matter"],
    answer: 2,
  },
  {
    q: "A dropped elbow during the pull most often stresses which joint?",
    options: ["Knee", "Shoulder", "Ankle", "Hip"],
    answer: 1,
  },
  {
    q: "Which drill is used to train a high-elbow recovery?",
    options: ["Fingertip Drag", "Flip turn", "Breaststroke kick", "Treading water"],
    answer: 0,
  },
  {
    q: "Crossing the hand over the midline at entry can lead to…",
    options: ["Faster kick", "Shoulder impingement", "Better breathing", "Longer glide"],
    answer: 1,
  },
  {
    q: "Where should the hand enter the water in freestyle?",
    options: ["Behind the head", "In line with the shoulder", "Across the centerline", "Next to the hip"],
    answer: 1,
  },
  {
    q: "What does the 'catch' phase of the stroke refer to?",
    options: [
      "Breathing to the side",
      "Pushing off the wall",
      "Setting the forearm to grip the water",
      "Kicking from the hips",
    ],
    answer: 2,
  },
  {
    q: "Insufficient body roll forces the swimmer to…",
    options: [
      "Recover with a straighter, wider arm",
      "Kick less",
      "Breathe more easily",
      "Float higher",
    ],
    answer: 0,
  },
  {
    q: "Which drill improves balance and rotation on the side?",
    options: ["Kick on Side", "Butterfly kick", "Sculling on back", "Dolphin dive"],
    answer: 0,
  },
  {
    q: "Where should a swimmer's head be during freestyle?",
    options: ["Lifted looking forward", "Neutral, eyes looking down", "Tilted far back", "Turned to one side"],
    answer: 1,
  },
  {
    q: "Which muscles help stabilize the shoulder blade during the pull?",
    options: ["Calves", "Quadriceps", "Scapular stabilizers", "Hamstrings"],
    answer: 2,
  },
  {
    q: "A common sign of shoulder overload in swimmers is…",
    options: ["Pain at the front/top of the shoulder", "Tingling toes", "Sore jaw", "Stiff ankles"],
    answer: 0,
  },
];

const TRACK_STEPS = 8;
const QUESTIONS_PER_RACE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

function newRace() {
  return shuffle(QUESTIONS).slice(0, QUESTIONS_PER_RACE);
}

export function RacingGame({ onExit }: { onExit: () => void }) {
  const [questions, setQuestions] = useState<Question[]>(() => newRace());
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const finished = position >= TRACK_STEPS;
  const outOfQuestions = index >= questions.length;
  const done = finished || outOfQuestions;
  const current = questions[index];

  function answer(i: number) {
    if (picked !== null || done || !current) return;
    setPicked(i);
    const correct = i === current.answer;
    if (correct) setPosition((p) => Math.min(p + 1, TRACK_STEPS));
    timer.current = setTimeout(() => {
      setPicked(null);
      setIndex((n) => n + 1);
    }, 1000);
  }

  function restart() {
    if (timer.current) clearTimeout(timer.current);
    setQuestions(newRace());
    setIndex(0);
    setPosition(0);
    setPicked(null);
  }

  const progressPct = (position / TRACK_STEPS) * 100;

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Games
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          {done ? "Race over" : `Question ${index + 1} / ${questions.length}`}
        </span>
      </div>

      {/* Drag strip */}
      <section className="glass-card overflow-hidden rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <span>Start</span>
          <span>
            {position} / {TRACK_STEPS}
          </span>
          <span className="flex items-center gap-1">
            <Flag className="size-3.5" /> Finish
          </span>
        </div>

        <div className="relative h-20 rounded-xl border border-border bg-secondary/50">
          {/* step markers */}
          <div className="absolute inset-y-0 right-10 left-10 flex justify-between">
            {Array.from({ length: TRACK_STEPS + 1 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "w-px",
                  i === TRACK_STEPS ? "w-1.5 bg-[repeating-linear-gradient(0deg,var(--foreground)_0_6px,transparent_6px_12px)]" : "bg-border",
                  i <= position && i !== TRACK_STEPS && "bg-primary/40",
                )}
              />
            ))}
          </div>
          {/* centre dashes */}
          <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-[repeating-linear-gradient(90deg,var(--muted-foreground)_0_10px,transparent_10px_20px)] opacity-40" />

          {/* car */}
          <div className="absolute inset-y-0 right-10 left-10">
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out"
              style={{ left: `${progressPct}%` }}
            >
              <span
                className={cn(
                  "glow-ring grid size-12 place-items-center rounded-xl bg-[image:var(--gradient-cyan)] text-primary-foreground",
                  picked !== null && picked === current?.answer && "animate-pulse",
                )}
              >
                <Car className="size-7" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {done || !current ? (
        <section className="glass-card space-y-3 rounded-2xl p-5 text-center">
          <h2 className="text-lg font-semibold">
            {finished ? "You crossed the finish line!" : "Out of questions"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {finished
              ? `Finished in ${index} questions.`
              : `Your car made it ${position} of ${TRACK_STEPS} steps.`}
          </p>
          <button
            onClick={restart}
            className="glow-ring mx-auto inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-cyan)] px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            <RotateCcw className="size-4" />
            Race again
          </button>
        </section>
      ) : (
        <section className="glass-card space-y-4 rounded-2xl p-5">
          <p className="text-base leading-snug font-medium">{current.q}</p>
          <ul className="grid gap-2">
            {current.options.map((opt, i) => {
              const isCorrect = i === current.answer;
              const isPicked = i === picked;
              const revealed = picked !== null;
              return (
                <li key={opt}>
                  <button
                    onClick={() => answer(i)}
                    disabled={revealed}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                      !revealed && "border-border bg-secondary/40 hover:border-primary/50 hover:bg-accent/30",
                      revealed && isCorrect && "border-success/60 bg-success/15 text-foreground",
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
                picked === current.answer ? "text-success" : "text-destructive",
              )}
            >
              {picked === current.answer ? "Correct — car moves forward!" : "Wrong — car stays put."}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
