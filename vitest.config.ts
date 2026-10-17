import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ esbuild: { jsx: "automatic" }, resolve: { alias: { "@": path.resolve(__dirname) } }, test: { setupFiles: ["tests/setup.ts"], environment: "jsdom", include: ["tests/**/*.test.{ts,tsx}"] } });
