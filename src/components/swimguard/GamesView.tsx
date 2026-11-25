import { useState } from "react";
import { Car, ClipboardList, Gamepad2, Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { RacingGame } from "./RacingGame";
import { RankingsSheet } from "./RankingsSheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GamesView() {
  const [playing, setPlaying] = useState(false);
  const [rankingsOpen, setRankingsOpen] = useState(false);

  return (
    <div className={cn("relative", !playing && "space-y-6 pb-16")}>
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
              <li>
                <Button asChild variant="ghost" className="glass-card group flex h-auto w-full items-center gap-3 rounded-xl p-3 text-left whitespace-normal hover:border-primary/40 hover:bg-accent/30">
                  <Link to="/games/make-set">
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-success/10 text-success"><ClipboardList className="size-6" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Make a set</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Warmup to cool down. Your workout, scored out of 100.</span></span>
                  </Link>
                </Button>
              </li>
            </ul>
          </section>
        </>
      )}

      {/* Rankings floating button — icon only */}
      <Button
        variant="hero"
        size="icon"
        aria-label="Rankings"
        onClick={() => setRankingsOpen(true)}
        className={cn("glow-ring z-30 rounded-full transition-transform active:scale-95", playing ? "absolute top-0 right-0 size-8" : "fixed right-5 bottom-16 size-14 sm:absolute sm:right-0 sm:bottom-4")}
      >
        <Trophy className={playing ? "size-4" : "size-6"} />
      </Button>
      <RankingsSheet open={rankingsOpen} onOpenChange={setRankingsOpen} />
    </div>
  );
}

export { Gamepad2 };
