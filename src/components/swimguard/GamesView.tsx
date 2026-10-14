import { Gamepad2, Trophy } from "lucide-react";
import { toast } from "sonner";

const games = [
  {
    id: "g1",
    name: "Catch Angle Challenge",
    description: "Hold your catch angle inside the target zone across 10 strokes.",
    icon: "🎯",
    level: "Level 3",
  },
  {
    id: "g2",
    name: "Body Roll Balance",
    description: "Match the ideal 35–45° trunk rotation on both sides.",
    icon: "🌀",
    level: "Level 2",
  },
  {
    id: "g3",
    name: "Recovery Rhythm",
    description: "Keep a smooth, high-elbow recovery for a full 50m rep.",
    icon: "⏱️",
    level: "Level 4",
  },
];

export function GamesView() {
  return (
    <div className="relative space-y-6 pb-16">
      <section className="glass-card rounded-2xl p-5 text-center">
        <h2 className="text-lg font-semibold">Stroke Games</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Turn your stroke metrics into challenges. Beat your form scores, streak by streak.
        </p>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Available Games
        </h3>
        <ul className="space-y-2.5">
          {games.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => toast(`${g.name} — coming soon`, {
                  description: "Play it right after your next uploaded session.",
                })}
                className="glass-card group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:border-primary/40 hover:bg-accent/30"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-xl">
                  {g.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{g.name}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {g.description}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {g.level}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Rankings floating button — icon only */}
      <button
        aria-label="Rankings"
        onClick={() => toast("Rankings", {
          description: "Leaderboard unlocks after your first analyzed session.",
        })}
        className="glow-ring fixed right-5 bottom-16 z-30 grid size-14 place-items-center rounded-full bg-[image:var(--gradient-cyan)] text-primary-foreground shadow-lg transition-transform active:scale-95 sm:absolute sm:right-0 sm:bottom-4"
      >
        <Trophy className="size-6" />
      </button>
    </div>
  );
}

export { Gamepad2 };
