import { Router } from "express";
import {
  getHealth,
  getTemplates,
  getTemplateInfo,
  addWatcher,
  getActiveWatchers,
  getWatcherStatus,
  removeActiveWatcher,
  getWatcherHistory,
  clearWatcherHistory,
} from "../../core/index.ts";

const router = Router();

// --- Health ---

router.get("/health", (_req, res) => {
  res.json(getHealth());
});

// --- Templates ---

router.get("/templates", (_req, res) => {
  res.json(getTemplates());
});

router.get("/templates/:name", (req, res) => {
  const info = getTemplateInfo(req.params.name);
  if (!info) {
    res.status(404).json({ error: `Template not found: ${req.params.name}` });
    return;
  }
  res.json(info);
});

// --- Watchers ---

router.post("/watchers", (req, res) => {
  try {
    const { template, name, payload, intervalMs, timeoutMs, callbackUrl, callbackToken } = req.body;

    if (!template || !name) {
      res.status(400).json({ error: "Missing required fields: template, name" });
      return;
    }

    const watcher = addWatcher({
      template,
      name,
      payload,
      intervalMs,
      timeoutMs,
      callbackUrl,
      callbackToken,
    });

    res.status(201).json(watcher);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

router.get("/watchers", (_req, res) => {
  res.json(getActiveWatchers());
});

router.get("/watchers/:name", (req, res) => {
  const watcher = getWatcherStatus(req.params.name);
  if (!watcher) {
    res.status(404).json({ error: `Watcher not found: ${req.params.name}` });
    return;
  }
  res.json(watcher);
});

router.delete("/watchers/:name", (req, res) => {
  const removed = removeActiveWatcher(req.params.name);
  if (!removed) {
    res.status(404).json({ error: `Watcher not found: ${req.params.name}` });
    return;
  }
  res.json({ ok: true, message: `Watcher removed: ${req.params.name}` });
});

// --- History ---

router.get("/history", (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  res.json(getWatcherHistory(limit));
});

router.delete("/history", (_req, res) => {
  clearWatcherHistory();
  res.json({ ok: true, message: "History cleared" });
});

export default router;
