import { useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";

import { getRaceQuestions } from "@/lib/race/questions.functions";
import { FALLBACK_QUESTIONS, shuffle, type RaceQuestion } from "@/lib/race/questions";

const BATCH_SIZE = 10;
const LOW_WATER = 5;
const RETRY_COOLDOWN_MS = 15000;

const keyOf = (q: RaceQuestion) => q.q.trim().toLowerCase();

/** Never-ending question supply: AI batches, topped up in the background, with built-in questions as backup. */
export function useQuestionFeed() {
  const fetchQuestions = useServerFn(getRaceQuestions);
  const queue = useRef<RaceQuestion[]>([]);
  const recent = useRef<string[]>([]);
  const seen = useRef(new Set<string>());
  const inflight = useRef(false);
  const disabled = useRef(false);
  const cooldownUntil = useRef(0);
  const backupDeck = useRef<RaceQuestion[]>([]);

  const refill = useCallback(async () => {
    if (inflight.current || disabled.current || Date.now() < cooldownUntil.current) return;
    inflight.current = true;
    try {
      const res = await fetchQuestions({
        data: { count: BATCH_SIZE, avoid: recent.current.slice(-30).map((s) => s.slice(0, 200)) },
      });
      if (res.error) {
        if (res.retryable) cooldownUntil.current = Date.now() + RETRY_COOLDOWN_MS;
        else disabled.current = true;
      }
      const queued = new Set(queue.current.map(keyOf));
      for (const q of res.questions) {
        const k = keyOf(q);
        if (seen.current.has(k) || queued.has(k)) continue;
        queued.add(k);
        queue.current.push(q);
      }
    } catch (err) {
      console.error("Question refill failed", err);
      cooldownUntil.current = Date.now() + RETRY_COOLDOWN_MS;
    } finally {
      inflight.current = false;
    }
  }, [fetchQuestions]);

  const next = useCallback((): RaceQuestion => {
    let q = queue.current.shift();
    if (!q) {
      if (backupDeck.current.length === 0) backupDeck.current = shuffle(FALLBACK_QUESTIONS);
      q = backupDeck.current.shift() as RaceQuestion;
    }
    const k = keyOf(q);
    seen.current.add(k);
    recent.current.push(q.q);
    if (queue.current.length < LOW_WATER) void refill();
    return q;
  }, [refill]);

  return { next, prefetch: refill };
}
