import { createContext, useContext, useState, type ReactNode } from "react";
import { SET_SECTIONS, type SectionId, type SetReport } from "@/lib/sets/scoring";

export type SetDraft = { goal: string; swimmer: string; sections: Record<SectionId, { id: string; text: string }[]> };
function emptyDraft(): SetDraft {
  return { goal: "", swimmer: "", sections: { warmup: [{ id: "warmup-1", text: "" }], preset: [{ id: "preset-1", text: "" }], main: [{ id: "main-1", text: "" }], cooldown: [{ id: "cooldown-1", text: "" }] } };
}
type SetContext = { draft: SetDraft; setDraft: React.Dispatch<React.SetStateAction<SetDraft>>; report: SetReport | null; setReport: React.Dispatch<React.SetStateAction<SetReport | null>>; reset: () => void };
const Context = createContext<SetContext | null>(null);
export function SetGameProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [report, setReport] = useState<SetReport | null>(null);
  function reset() { setDraft(emptyDraft()); setReport(null); }
  return <Context.Provider value={{ draft, setDraft, report, setReport, reset }}>{children}</Context.Provider>;
}
export function useSetGame() {
  const context = useContext(Context);
  if (!context) throw new Error("Set game provider is missing");
  return context;
}
export function draftLines(draft: SetDraft): Record<SectionId, string[]> {
  return { warmup: draft.sections.warmup.map((r) => r.text), preset: draft.sections.preset.map((r) => r.text), main: draft.sections.main.map((r) => r.text), cooldown: draft.sections.cooldown.map((r) => r.text) };
}
export function filledSections(draft: SetDraft) { return SET_SECTIONS.filter(({ id }) => draft.sections[id].some((r) => r.text.trim())).length; }