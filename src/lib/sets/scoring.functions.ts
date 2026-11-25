import { createServerFn } from "@tanstack/react-start";
import { setInputSchema } from "./scoring";
import { scoreTrainingSet } from "./scoring.server";

export const scoreSet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => setInputSchema.parse(input))
  .handler(async ({ data }) => scoreTrainingSet(data));