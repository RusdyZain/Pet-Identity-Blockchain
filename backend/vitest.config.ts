import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globals: false,
    restoreMocks: true,
    clearMocks: true,
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
