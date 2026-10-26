import { defineConfig } from "vitest/config";

// Unit tests for pure logic only; kept separate from the app's Vite/TanStack config.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
