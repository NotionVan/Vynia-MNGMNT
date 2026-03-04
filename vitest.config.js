import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify("0.0.0-test"),
    __APP_BUILD_DATE__: JSON.stringify("2026-01-01T00:00:00Z"),
    __APP_CHANGELOG__: JSON.stringify("test"),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./__tests__/setup.js",
    restoreMocks: true,
  },
});
