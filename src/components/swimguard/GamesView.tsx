import { useState } from "react";
import { Car, Gamepad2, Trophy } from "lucide-react";
import { RacingGame } from "./RacingGame";
import { RankingsSheet } from "./RankingsSheet";

export function GamesView() {
  const [playing, setPlaying] = useState(false);
  const [rankingsOpen, setRankingsOpen] = useState(false);

  return (
    <div className="relative space-y-6 pb-16">
      {playing ? (
        <RacingGame onExit={() => setPlaying(false)} />
      ) : (
        <>
          <section className="glass-card rounded-2xl p-5 text-center">
            <h2 className="text-lg font-semibold">Stroke Games</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Test your swim knowledge and race to the finish line.
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Available Games
            </h3>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => setPlaying(true)}
                  className="glass-card group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:border-primary/40 hover:bg-accent/30"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Car className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">Racing</span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      Drag race against 1–3 bots. First to 10 correct answers wins — wrong answers cost a short penalty.
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </>
      )}

      {/* Rankings floating button — icon only */}
      <button
        aria-label="Rankings"
        onClick={() => setRankingsOpen(true)}
        className="glow-ring fixed right-5 bottom-16 z-30 grid size-14 place-items-center rounded-full bg-[image:var(--gradient-cyan)] text-primary-foreground shadow-lg transition-transform active:scale-95 sm:absolute sm:right-0 sm:bottom-4"
      >
        <Trophy className="size-6" />
      </button>
      <RankingsSheet open={rankingsOpen} onOpenChange={setRankingsOpen} />
    </div>
  );
}

export { Gamepad2 };
