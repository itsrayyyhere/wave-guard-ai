import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, jsonSchema, streamText } from "ai";

import { createLovableAiGatewayRunIdFetch } from "./run-id.server";
import type { RaceQuestion, RaceQuestionsResult } from "./questions";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

type RawOutput = {
  questions: { question: string; options: string[]; correctIndex: number }[];
};

const schema = jsonSchema<RawOutput>({
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "correctIndex"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
        },
      },
    },
  },
});

const INSTRUCTIONS = `You write quick-fire multiple-choice quiz questions for a swimming racing game.
Topics: swim stroke technique (freestyle, backstroke, breaststroke, butterfly), body position, catch and pull, recovery, kicking, breathing, turns, drills, swimmer anatomy, and swimming injury prevention (especially shoulder health).
Rules:
- Each question is short (under 110 characters) and readable in a few seconds.
- Exactly 4 options per question, each under 40 characters, with exactly one clearly correct answer.
- Facts must be accurate and widely accepted by swim coaches.
- Vary topics and difficulty; never repeat a question you were told to avoid.`;

function shuffleOptions(options: string[], correctIndex: number) {
  const items = options.map((text, i) => ({ text, correct: i === correctIndex }));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return { options: items.map((x) => x.text), answer: items.findIndex((x) => x.correct) };
}

function normalize(raw: RawOutput | undefined): RaceQuestion[] {
  const out: RaceQuestion[] = [];
  for (const item of raw?.questions ?? []) {
    const q = item.question?.trim();
    const options = (item.options ?? []).map((o) => String(o).trim());
    const unique = new Set(options.map((o) => o.toLowerCase()));
    if (!q || options.length !== 4 || unique.size !== 4 || options.some((o) => !o)) continue;
    if (!Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex > 3) continue;
    const shuffled = shuffleOptions(options, item.correctIndex);
    out.push({ q, ...shuffled });
  }
  return out;
}

export async function generateRaceQuestions(
  apiKey: string,
  count: number,
  avoid: string[],
): Promise<RaceQuestionsResult> {
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const avoidText = avoid.length
    ? `\n\nDo not repeat or rephrase any of these questions:\n${avoid.map((a) => `- ${a}`).join("\n")}`
    : "";

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions: INSTRUCTIONS,
      messages: [{ role: "user", content: `Write ${count} new questions.${avoidText}` }],
      output: Output.object({ schema }),
      maxRetries: 0,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const output = await result.output;
    const questions = normalize(output);
    if (questions.length === 0) {
      return { questions: [], error: "No questions were generated.", retryable: true };
    }
    return { questions, error: null, retryable: true };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("Race questions: invalid AI output", error.text?.slice(0, 300));
      return { questions: [], error: "The AI returned unreadable questions.", retryable: true };
    }
    const status = APICallError.isInstance(error) ? error.statusCode : undefined;
    console.error("Race questions: AI request failed", status, error);
    const retryable = status === undefined || status === 429 || status >= 500;
    return { questions: [], error: "Couldn't load new questions right now.", retryable };
  }
}
