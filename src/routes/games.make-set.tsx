import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ClipboardList, LoaderCircle, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { draftLines, filledSections, useSetGame } from "@/components/swimguard/SetGameProvider";
import { prepareSet, SET_SECTIONS, type SectionId } from "@/lib/sets/scoring";
import { scoreSet } from "@/lib/sets/scoring.functions";

export const Route = createFileRoute("/games/make-set")({
  head: () => ({ meta: [
    { title: "Make a set — SwimGuard AI" },
    { name: "description", content: "Design a swimming workout with warmup, pre set, main set and cool down, then receive an AI training-design review." },
    { property: "og:title", content: "Make a set — SwimGuard AI" },
    { property: "og:description", content: "Build your swimming set and review training balance, recovery and injury-risk considerations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MakeSetPage,
});

function MakeSetPage() {
  const { draft, setDraft, setReport } = useSetGame();
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const score = useServerFn(scoreSet);
  const navigate = useNavigate();
  const complete = filledSections(draft);
  function add(id: SectionId) {
    setDraft((old) => ({ ...old, sections: { ...old.sections, [id]: [...old.sections[id], { id: crypto.randomUUID(), text: "" }] } }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    let input;
    try { input = prepareSet(draft.goal, draft.swimmer, draftLines(draft)); }
    catch { setError(complete < 4 ? "Add at least one entry in each of the four sections." : "This set is too long to review. Shorten the entries and try again."); return; }
    busy.current = true; setPending(true); setError(null);
    try {
      const result = await score({ data: input });
      if (!result.report) { setError(result.error); return; }
      setReport(result.report);
      await navigate({ to: "/games/set-score" });
    } catch { setError("The review could not be completed. Your set is still here; please try again later."); }
    finally { busy.current = false; setPending(false); }
  }
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-10 text-foreground">
      <header className="flex items-center justify-between border-b border-border py-4">
        <Button asChild variant="ghost" size="sm"><Link to="/" search={{ tab: "games" }}><ArrowLeft />Games</Link></Button>
        <span className="text-sm font-semibold text-primary">SwimGuard AI</span>
      </header>
      <div className="flex items-start gap-3 py-6">
        <ClipboardList className="mt-1 size-7 shrink-0 text-primary" />
        <div><h1 className="text-2xl font-bold tracking-normal">Make a set</h1><p className="mt-1 text-sm text-muted-foreground">Your session, from first lap to last.</p></div>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={pending} className="space-y-6">
          <section className="grid gap-4 border-b border-border pb-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm"><span className="block font-medium">Training goal <span className="text-xs text-muted-foreground">(optional)</span></span><Input value={draft.goal} maxLength={500} placeholder="e.g. 100m freestyle speed" onChange={(e) => setDraft((old) => ({ ...old, goal: e.target.value }))} /></label>
            <label className="space-y-2 text-sm"><span className="block font-medium">Swimmer context <span className="text-xs text-muted-foreground">(optional)</span></span><Input value={draft.swimmer} maxLength={500} placeholder="e.g. Intermediate, 3 sessions/week" onChange={(e) => setDraft((old) => ({ ...old, swimmer: e.target.value }))} /></label>
          </section>
          {SET_SECTIONS.map(({ id, label, example }, index) => (
            <section key={id} aria-labelledby={`${id}-heading`} className="space-y-3 border-b border-border pb-5">
              <div className="flex items-center gap-3"><span className="font-mono text-sm text-primary">0{index + 1}</span><h2 id={`${id}-heading`} className="flex-1 text-lg font-semibold tracking-normal">{label}</h2><span className="text-xs text-muted-foreground">{draft.sections[id].filter((r) => r.text.trim()).length} entries</span></div>
              {draft.sections[id].map((row, rowIndex) => (
                <div key={row.id} className="flex items-start gap-2">
                  <Textarea aria-label={`${label} entry ${rowIndex + 1}`} value={row.text} placeholder={example} className="min-h-20 resize-y bg-surface/60" onChange={(e) => setDraft((old) => ({ ...old, sections: { ...old.sections, [id]: old.sections[id].map((r) => r.id === row.id ? { ...r, text: e.target.value } : r) } }))} />
                  <Button type="button" variant="ghost" size="icon" title={`Remove ${label} entry ${rowIndex + 1}`} aria-label={`Remove ${label} entry ${rowIndex + 1}`} disabled={draft.sections[id].length === 1} className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDraft((old) => ({ ...old, sections: { ...old.sections, [id]: old.sections[id].filter((r) => r.id !== row.id) } }))}><Trash2 /></Button>
                </div>
              ))}
              <Button type="button" variant="outlineGlow" size="sm" onClick={() => add(id)}><Plus />Add entry<span className="sr-only"> to {label}</span></Button>
            </section>
          ))}
        </fieldset>
        {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{complete}/4 sections ready</span><span>AI review · /100</span></div>
          <Button type="submit" variant="hero" disabled={pending} className="h-12 w-full">{pending ? <><LoaderCircle className="animate-spin motion-reduce:animate-none" />Scoring your set…</> : <>Submit set<ArrowRight /></>}</Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">AI feedback is educational, not medical advice. Lactate demand and injury concern are estimates from your written plan.</p>
        </div>
      </form>
    </main>
  );
}