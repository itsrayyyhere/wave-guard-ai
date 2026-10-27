import { Car, Medal, Trophy } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOT_LEVELS, type BotLevel } from "@/lib/race/questions";
import { SECOND_OF_FOUR_POINTS, WIN_POINTS } from "@/lib/race/ranking";
import { useRanking } from "@/lib/race/ranking-store";

const LEVELS: BotLevel[] = ["rookie", "pro", "olympian"];

function placeLabel(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

export function RankingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const ranking = useRanking();
  const winRate = ranking.played ? Math.round((ranking.wins / ranking.played) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88vh] max-w-lg overflow-y-auto rounded-t-3xl border-border p-5"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-warning" /> Rankings
          </SheetTitle>
          <SheetDescription>Earn points by beating bots in Racing.</SheetDescription>
        </SheetHeader>

        <section className="glass-card mt-4 rounded-2xl p-5 text-center">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Your points</p>
          <p className="text-gradient-cyan font-display text-5xl font-bold">{ranking.total}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Races" value={ranking.played} />
            <Stat label="Wins" value={ranking.wins} />
            <Stat label="Win rate" value={`${winRate}%`} />
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            How to earn points
          </h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Per bot beaten</th>
                  <th className="px-3 py-2 text-right font-medium">Win</th>
                  <th className="px-3 py-2 text-right font-medium">2nd of 4</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((l) => (
                  <tr key={l} className="border-t border-border">
                    <td className="px-3 py-2">{BOT_LEVELS[l].label}</td>
                    <td className="px-3 py-2 text-right font-mono text-primary">+{WIN_POINTS[l]}</td>
                    <td className="px-3 py-2 text-right font-mono text-primary">
                      +{SECOND_OF_FOUR_POINTS[l]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            2nd place only scores in a 4-car race (3 bots). Other places score 0.
          </p>
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Recent races
          </h3>
          {ranking.races.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No races yet. Finish a race to get on the board.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {ranking.races.map((r) => (
                <li
                  key={r.at}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2"
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg",
                      r.place === 1 ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {r.place === 1 ? <Medal className="size-4" /> : <Car className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {placeLabel(r.place)} of {r.field}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      vs {r.opponents.map((l) => BOT_LEVELS[l].label).join(", ")} ·{" "}
                      {new Date(r.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold",
                      r.points > 0 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {r.points > 0 ? `+${r.points}` : "0"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary/40 py-2">
      <p className="font-mono text-base font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
