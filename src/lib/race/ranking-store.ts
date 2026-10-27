import { useSyncExternalStore } from "react";
import { EMPTY_RANKING, addRace, type RaceRecord, type RankingState } from "./ranking";

const KEY = "swimguard:race-ranking:v1";
const listeners = new Set<() => void>();
let cache: RankingState | null = null;

function read(): RankingState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as RankingState) : null;
    cache = parsed && typeof parsed.total === "number" ? parsed : EMPTY_RANKING;
  } catch {
    cache = EMPTY_RANKING;
  }
  return cache;
}

function write(next: RankingState) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked — keep the in-memory value
  }
  listeners.forEach((l) => l());
}

export function recordRace(race: RaceRecord) {
  write(addRace(read(), race));
}

export function resetRanking() {
  write(EMPTY_RANKING);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRanking(): RankingState {
  return useSyncExternalStore(subscribe, read, () => EMPTY_RANKING);
}
