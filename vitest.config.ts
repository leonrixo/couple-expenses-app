import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    passWithNoTests: true,
    // Carga .env.local (y variantes) a process.env para los tests, igual que
    // hace Next.js en dev/build — Vitest no lo hace automáticamente.
    env: loadEnv(mode, process.cwd(), ""),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
}));
