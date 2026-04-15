import express from "express";
import compression from "compression";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import apiRouter from "./routes/api.ts";
import { startEngine, stopEngine } from "../core/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "18790", 10);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

// Middleware
app.use(compression());
app.use(express.json());

// API routes
app.use("/api", apiRouter);

// Serve static web GUI (Vite build output)
const webDistDir = path.resolve(__dirname, "../web");

if (fs.existsSync(webDistDir)) {
  app.use(express.static(webDistDir));
  // SPA fallback — all non-API routes serve index.html
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(webDistDir, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.json({
      message: "Cronology is running. Web GUI not built yet. Run: pnpm build:web",
      api: "/api/health",
      docs: "https://github.com/exisz/cronology",
    });
  });
}

// Start the watcher engine
startEngine();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down cronology...");
  stopEngine();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopEngine();
  process.exit(0);
});

app.listen(PORT, HOST, () => {
  console.log(`⏱️  Cronology running on http://${HOST}:${PORT}`);
  console.log(`   API:       http://${HOST}:${PORT}/api/health`);
  console.log(`   Dashboard: http://${HOST}:${PORT}/dashboard`);
});
