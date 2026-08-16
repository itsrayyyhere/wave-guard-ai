import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, ScanLine, HeartPulse, Waves, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { DashboardView } from "@/components/swimguard/DashboardView";
import { PoseAnalysisView } from "@/components/swimguard/PoseAnalysisView";
import { ReportView } from "@/components/swimguard/ReportView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwimGuard AI — Swim Stroke & Injury Risk Analysis" },
      {
        name: "description",
        content:
          "AI pose analysis for swimmers: 33-point stroke tracking, catch angle and body roll metrics, and shoulder injury risk reports with corrective drills.",
      },
      { property: "og:title", content: "SwimGuard AI — Swim Stroke & Injury Risk Analysis" },
      {
        property: "og:description",
        content:
          "Upload swim video for pose analysis, review live stroke metrics, and get a biomechanical injury risk report.",
      },
    ],
  }),
  component: SwimGuard,
});

const TABS = [
  { id: "dashboard", label: "Upload", Icon: LayoutDashboard },
  { id: "analysis", label: "Analysis", Icon: ScanLine },
  { id: "report", label: "Risk", Icon: HeartPulse },
] as const;

type TabId = (typeof TABS)[number]["id"];

function SwimGuard() {
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen w-full max-w-2xl border-border/60 sm:border-x">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="glow-ring grid size-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-cyan)] text-primary-foreground">
                <Waves className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold">
                  Swim<span className="text-gradient-cyan">Guard</span> AI
                </h1>
                <p className="truncate text-[11px] text-muted-foreground">Stroke mechanics · Injury prevention</p>
              </div>
            </div>
            <button className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-secondary/60 py-1 pr-3 pl-1 transition-colors hover:border-primary/50">
              <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary">
                <User className="size-4" />
              </span>
              <span className="hidden text-xs font-medium sm:block">M. Reyes</span>
              <span className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
            </button>
          </div>

          <nav className="flex gap-1 px-3 pb-2">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                  tab === id
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
                {tab === id && (
                  <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </nav>
        </header>

        <main key={tab} className="animate-in fade-in slide-in-from-bottom-2 px-4 py-5 duration-300">
          {tab === "dashboard" && <DashboardView onOpenSession={() => setTab("analysis")} />}
          {tab === "analysis" && <PoseAnalysisView />}
          {tab === "report" && <ReportView />}
        </main>

        <footer className="px-4 pb-8 text-center text-[11px] text-muted-foreground">
          Analysis is simulated for demonstration and is not medical advice.
        </footer>
      </div>
      <Toaster />
    </div>
  );
}
