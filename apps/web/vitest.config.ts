import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@buzrr/contract": fileURLToPath(
        new URL("../../packages/contract/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.spec.ts"],
  },
});
