import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the logic in lib/, plus render smoke tests for components
// (no browser, no database).
// Database rules are tested separately: npm run test:db
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
    environment: "node",
  },
});
