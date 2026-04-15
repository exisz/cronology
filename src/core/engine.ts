/**
 * Cronology Core — Watcher Engine
 * Manages the polling lifecycle of all active watchers.
 */

import { Cron } from "croner";
import {
  listWatchers,
  getWatcher,
  updateWatcherPoll,
  completeWatcher,
  type WatcherRow,
} from "./db.ts";
import { getTemplate, type PollContext } from "./templates.ts";

interface RunningWatcher {
  name: string;
  cron: Cron;
}

const running = new Map<string, RunningWatcher>();

/**
 * Start polling a watcher by name.
 */
export function startWatcher(name: string): void {
  const watcher = getWatcher(name);
  if (!watcher) throw new Error(`Watcher not found: ${name}`);
  if (running.has(name)) return; // Already running

  const template = getTemplate(watcher.template);
  if (!template) {
    completeWatcher(name, "error", undefined, `Template not found: ${watcher.template}`);
    return;
  }

  const intervalSec = Math.max(1, Math.floor(watcher.interval_ms / 1000));

  // Use croner to schedule polling
  const cron = new Cron(`*/${intervalSec} * * * * *`, { maxRuns: Infinity }, async () => {
    try {
      const current = getWatcher(name);
      if (!current || current.status !== "polling") {
        stopWatcher(name);
        return;
      }

      // Check timeout
      const elapsed = Date.now() - new Date(current.created_at).getTime();
      if (elapsed > current.timeout_ms) {
        stopWatcher(name);
        completeWatcher(name, "timeout", current.last_result ? JSON.parse(current.last_result) : undefined);
        await fireCallback(current, "timeout", current.last_result ? JSON.parse(current.last_result) : undefined);
        console.log(`⏰ Watcher timed out: ${name}`);
        return;
      }

      // Poll
      const payload = JSON.parse(current.payload);
      const ctx: PollContext = {
        pollCount: current.poll_count,
        startedAt: new Date(current.created_at),
        timeoutMs: current.timeout_ms,
        intervalMs: current.interval_ms,
      };

      const result = await template.poll(payload, ctx);
      const nextPollAt = new Date(Date.now() + current.interval_ms).toISOString();
      updateWatcherPoll(name, result.data, nextPollAt);

      if (result.message) {
        console.log(`[${name}] ${result.message}`);
      }

      if (result.done) {
        stopWatcher(name);
        completeWatcher(name, "done", result.data);
        await fireCallback(current, "done", result.data);
        console.log(`✅ Watcher completed: ${name}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${name}] Poll error: ${msg}`);
      // Don't stop on poll errors — let it retry
    }
  });

  running.set(name, { name, cron });
  console.log(`🔄 Watcher started: ${name} (every ${intervalSec}s, timeout ${Math.round(watcher.timeout_ms / 1000)}s)`);
}

/**
 * Stop a running watcher (does NOT complete it).
 */
export function stopWatcher(name: string): void {
  const w = running.get(name);
  if (w) {
    w.cron.stop();
    running.delete(name);
  }
}

/**
 * Resume all active watchers from the database.
 * Called on server startup.
 */
export function resumeAllWatchers(): void {
  const watchers = listWatchers();
  let resumed = 0;
  for (const w of watchers) {
    if (w.status === "polling") {
      startWatcher(w.name);
      resumed++;
    }
  }
  if (resumed > 0) {
    console.log(`📋 Resumed ${resumed} active watcher(s)`);
  }
}

/**
 * Stop all running watchers.
 */
export function stopAllWatchers(): void {
  for (const [name] of running) {
    stopWatcher(name);
  }
}

/**
 * Get count of running watchers.
 */
export function getRunningCount(): number {
  return running.size;
}

/**
 * Fire callback webhook when watcher completes or times out.
 */
async function fireCallback(
  watcher: WatcherRow,
  status: "done" | "timeout",
  result?: unknown,
): Promise<void> {
  if (!watcher.callback_url) return;

  const body = {
    event: "watcher.completed",
    watcher: watcher.name,
    template: watcher.template,
    status,
    result,
    pollCount: watcher.poll_count,
    createdAt: watcher.created_at,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - new Date(watcher.created_at).getTime(),
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (watcher.callback_token) {
      headers["Authorization"] = `Bearer ${watcher.callback_token}`;
    }

    const res = await fetch(watcher.callback_url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    console.log(`📡 Callback sent to ${watcher.callback_url}: ${res.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`📡 Callback failed for ${watcher.name}: ${msg}`);
  }
}
