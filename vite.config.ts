import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist/web",
    emptyDirOnBuildStart: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@core": path.resolve(__dirname, "src/core"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:18790",
    },
  },
});
