import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ClipboardList, Pencil, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSetGame } from "@/components/swimguard/SetGameProvider";
import { CRITERIA, overallScore, SET_SECTIONS } from "@/lib/sets/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/set-score")({
  head: () => ({ meta: [
    { title: "Your set score — SwimGuard AI" },
    { name: "description", content: "Review your swimming workout score and AI feedback on injury-risk management, lactate demand, recovery and training design." },
    { property: "og:title", content: "Your set score — SwimGuard AI" },
    { property: "og:description", content: "A six-criterion review of your swimming set with practical training improvements." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: SetScorePage,
});
function SetScorePage() {
  const { report, draft, reset } = useSetGame();
  const navigate = useNavigate();
  if (!report) return <main className="mx-auto max-w-2xl space-y-4 px-4 py-16 text-center"><ClipboardList className="mx-auto size-10 text-primary" /><h1 className="text-2xl font-semibold tracking-normal">No set scored yet</h1><p className="text-sm text-muted-foreground">Create and submit a swimming set to receive your review.</p><Button asChild variant="hero"><Link to="/games/make-set">Make a set</Link></Button></main>;
  const total = overallScore(report);
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-10">
      <header className="flex items-center justify-between border-b border-border py-4"><Button asChild variant="ghost" size="sm"><Link to="/" search={{ tab: "games" }}><ArrowLeft />Games</Link></Button><span className="text-sm font-semibold text-primary">SwimGuard AI</span></header>
      <section className="border-b border-border py-7 text-center">
        <p className="flex items-center justify-center gap-2 text-xs font-medium uppercase text-primary"><Sparkles className="size-4" />AI set review</p>
        <h1 className="mt-3 text-2xl font-bold tracking-normal">{total === null ? "Your set needs another look" : "Your set score"}</h1>
        {total !== null && <p className={cn("mt-4 font-mono text-6xl font-bold", total >= 70 ? "text-primary" : "text-warning")}><span>{total}</span><span className="ml-1 text-lg font-normal text-muted-foreground">/100</span></p>}
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-muted-foreground">Estimated lactate demand</p><p className="mt-1 font-semibold">{report.lactateDemand}</p></div><div><p className="text-xs text-muted-foreground">Estimated injury concern</p><p className={cn("mt-1 font-semibold", report.injuryConcern === "Higher" ? "text-destructive" : "text-foreground")}>{report.injuryConcern}</p></div></div>
      </section>
      {total !== null && <section className="space-y-3 py-6"><div className="flex justify-between"><h2 className="text-lg font-semibold tracking-normal">Score breakdown</h2><span className="self-center text-xs text-muted-foreground">Higher = better design</span></div>{CRITERIA.map((c) => <article key={c.id} className="rounded-lg border border-border bg-surface/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold tracking-normal">{c.label}</h3><p className="mt-0.5 text-xs text-muted-foreground">{c.weight}% of total</p></div><span className="shrink-0 font-mono text-lg text-primary">{report.categories[c.id].score}<span className="text-xs text-muted-foreground">/100</span></span></div><progress className="set-score-progress my-3 h-1.5 w-full" aria-label={`${c.label} score`} max={100} value={report.categories[c.id].score} /><p className="text-sm leading-relaxed text-muted-foreground">{report.categories[c.id].feedback}</p></article>)}</section>}
      <section className="space-y-5 border-b border-border py-5">
        {[{ title: "What works", items: report.strengths, Icon: Check, tone: "text-success" }, { title: "Make it stronger", items: report.improvements, Icon: TriangleAlert, tone: "text-warning" }].map(({ title, items, Icon, tone }) => <div key={title}><h2 className="mb-3 text-lg font-semibold tracking-normal">{title}</h2><ul className="space-y-3">{items.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm leading-relaxed"><Icon className={cn("mt-0.5 size-4 shrink-0", tone)} /><span>{item}</span></li>)}</ul></div>)}
      </section>
      <section className="space-y-3 py-5"><h2 className="text-base font-semibold tracking-normal">Assumptions & missing details</h2><ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">{report.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul><p className="rounded-lg border border-warning/25 bg-warning/10 p-3 text-xs leading-relaxed text-warning">This score evaluates workout design, not your health or actual blood lactate. It cannot predict injury or certify a workout as safe. Review demanding sets with a qualified coach; stop if you feel pain.</p></section>
      <details className="border-y border-border py-4"><summary className="cursor-pointer text-sm font-semibold">Your submitted set</summary><div className="mt-4 space-y-4">{SET_SECTIONS.map(({ id, label }) => <div key={id}><h3 className="text-sm font-medium text-primary">{label}</h3><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{draft.sections[id].filter((r) => r.text.trim()).map((r) => <li key={r.id} className="whitespace-pre-wrap break-words">{r.text}</li>)}</ul></div>)}</div></details>
      <div className="mt-6 flex gap-3"><Button asChild variant="hero" className="flex-1"><Link to="/games/make-set"><Pencil />Edit set</Link></Button><Button variant="outline" className="flex-1" onClick={() => { reset(); void navigate({ to: "/games/make-set" }); }}><RotateCcw />New set</Button></div>
    </main>
  );
}