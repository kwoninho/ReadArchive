import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.tsx"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/lib/**", "src/stores/**", "src/components/**"],
      exclude: ["src/components/ui/**"],
    },
  },
});
