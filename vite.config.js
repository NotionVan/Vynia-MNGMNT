import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";

function gitInfo() {
  try {
    const date = execSync("git log -1 --format=%cI", { encoding: "utf8" }).trim();
    const body = execSync("git log -1 --format=%B", { encoding: "utf8" }).trim();
    return { date, body };
  } catch { return { date: new Date().toISOString(), body: "" }; }
}
const git = gitInfo();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "0.0.0"),
    __APP_BUILD_DATE__: JSON.stringify(git.date),
    __APP_CHANGELOG__: JSON.stringify(git.body),
  },
  plugins: [
    react(),
    {
      name: "version-json",
      configureServer(server) {
        server.middlewares.use("/version.json", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ version: process.env.npm_package_version || "0.0.0" }));
        });
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ version: process.env.npm_package_version || "0.0.0" }),
        });
      },
    },
  ],
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
});
