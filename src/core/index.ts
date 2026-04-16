/**
 * Cronology Core — Public API
 * All business logic lives here. CLI and API are thin wrappers.
 */

import os from "node:os";
import {
  insertWatcher,
  getWatcher,
  listWatchers,
  listHistory,
  removeWatcher as dbRemoveWatcher,
  clearHistory as dbClearHistory,
  type WatcherRow,
  type HistoryRow,
} from "./db.ts";
import { listTemplates, getTemplate, type WatcherTemplate } from "./templates.ts";
import { registerBuiltinTemplates } from "./templates/index.ts";
import { startWatcher, stopWatcher, resumeAllWatchers, stopAllWatchers, getRunningCount } from "./engine.ts";

// Initialize templates on import
registerBuiltinTemplates();

export function getVersion(): string {
  return "0.1.0";
}

// --- Health ---

export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  version: string;
  uptime: number;
  timestamp: string;
  hostname: string;
  node: string;
  activeWatchers: number;
  memory: {
    used: number;
    total: number;
    percent: number;
  };
}

const startTime = Date.now();

export function getHealth(): HealthStatus {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    status: "ok",
    version: getVersion(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    node: process.version,
    activeWatchers: getRunningCount(),
    memory: {
      used: Math.round(usedMem / 1024 / 1024),
      total: Math.round(totalMem / 1024 / 1024),
      percent: Math.round((usedMem / totalMem) * 100),
    },
  };
}

// --- Templates ---

export interface TemplateInfo {
  name: string;
  description: string;
  payloadSchema: Record<string, unknown>;
  defaults: { intervalMs: number; timeoutMs: number };
}

export function getTemplates(): TemplateInfo[] {
  return listTemplates().map((t) => ({
    name: t.name,
    description: t.description,
    payloadSchema: t.payloadSchema,
    defaults: t.defaults,
  }));
}

export function getTemplateInfo(name: string): TemplateInfo | undefined {
  const t = getTemplate(name);
  if (!t) return undefined;
  return {
    name: t.name,
    description: t.description,
    payloadSchema: t.payloadSchema,
    defaults: t.defaults,
  };
}

// --- Watchers ---

export interface AddWatcherOptions {
  template: string;
  name: string;
  payload?: Record<string, unknown>;
  intervalMs?: number;
  timeoutMs?: number;
  callbackUrl?: string;
  callbackToken?: string;
  callbackChannel?: string;
  callbackTo?: string;
}

export function addWatcher(opts: AddWatcherOptions): WatcherRow {
  const template = getTemplate(opts.template);
  if (!template) {
    throw new Error(`Unknown template: ${opts.template}. Available: ${listTemplates().map((t) => t.name).join(", ")}`);
  }

  const existing = getWatcher(opts.name);
  if (existing) {
    throw new Error(`Watcher already exists: ${opts.name}`);
  }

  // Fall back to env defaults for callback
  const callbackUrl = opts.callbackUrl || process.env.OPENCLAW_HOOK_URL;
  const callbackToken = opts.callbackToken || process.env.OPENCLAW_HOOK_TOKEN;

  const watcher = insertWatcher({
    name: opts.name,
    template: opts.template,
    payload: opts.payload || {},
    intervalMs: opts.intervalMs || template.defaults.intervalMs,
    timeoutMs: opts.timeoutMs || template.defaults.timeoutMs,
    callbackUrl,
    callbackToken,
  });

  // Start polling immediately
  startWatcher(opts.name);

  return watcher;
}

export function getWatcherStatus(name: string): WatcherRow | undefined {
  return getWatcher(name);
}

export function getActiveWatchers(): WatcherRow[] {
  return listWatchers();
}

export function removeActiveWatcher(name: string): boolean {
  stopWatcher(name);
  return dbRemoveWatcher(name);
}

export function getWatcherHistory(limit?: number): HistoryRow[] {
  return listHistory(limit);
}

export function clearWatcherHistory(): void {
  dbClearHistory();
}

// --- Lifecycle ---

export function startEngine(): void {
  resumeAllWatchers();
}

export function stopEngine(): void {
  stopAllWatchers();
}

// Re-exports for type consumers
export type { WatcherRow, HistoryRow, WatcherTemplate };
