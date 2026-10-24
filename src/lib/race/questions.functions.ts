import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateRaceQuestions } from "./questions.server";
import type { RaceQuestionsResult } from "./questions";

export const getRaceQuestions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        count: z.number().int().min(1).max(15),
        avoid: z.array(z.string().max(200)).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<RaceQuestionsResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { questions: [], error: "AI questions are not configured.", retryable: false };
    }
    return generateRaceQuestions(apiKey, data.count, data.avoid);
  });
