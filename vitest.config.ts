import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = process.cwd();

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(rootDir)}${path.sep}` }],
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
