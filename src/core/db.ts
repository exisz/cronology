/**
 * Cronology Core — Database Layer
 * SQLite persistence for watchers, history, and templates.
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = process.env.CRONOLOGY_DATA_DIR || "./data";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dbPath = path.join(DATA_DIR, "cronology.db");
  db = new Database(dbPath);

  // WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchers (
      name TEXT PRIMARY KEY,
      template TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      interval_ms INTEGER NOT NULL DEFAULT 30000,
      timeout_ms INTEGER NOT NULL DEFAULT 3600000,
      callback_url TEXT,
      callback_token TEXT,
      status TEXT NOT NULL DEFAULT 'polling',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_poll_at TEXT,
      next_poll_at TEXT,
      poll_count INTEGER NOT NULL DEFAULT 0,
      last_result TEXT,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      template TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL,
      result TEXT,
      error TEXT,
      poll_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      duration_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS templates (
      name TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      payload_schema TEXT NOT NULL DEFAULT '{}',
      default_interval_ms INTEGER NOT NULL DEFAULT 30000,
      default_timeout_ms INTEGER NOT NULL DEFAULT 3600000
    );
  `);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// --- Watcher CRUD ---

export interface WatcherRow {
  name: string;
  template: string;
  payload: string;
  interval_ms: number;
  timeout_ms: number;
  callback_url: string | null;
  callback_token: string | null;
  status: string;
  created_at: string;
  last_poll_at: string | null;
  next_poll_at: string | null;
  poll_count: number;
  last_result: string | null;
  error: string | null;
}

export interface HistoryRow {
  id: number;
  name: string;
  template: string;
  payload: string;
  status: string;
  result: string | null;
  error: string | null;
  poll_count: number;
  created_at: string;
  completed_at: string;
  duration_ms: number | null;
}

export function insertWatcher(w: {
  name: string;
  template: string;
  payload: Record<string, unknown>;
  intervalMs: number;
  timeoutMs: number;
  callbackUrl?: string;
  callbackToken?: string;
}): WatcherRow {
  const db = getDb();
  const now = new Date().toISOString();
  const nextPoll = new Date(Date.now() + w.intervalMs).toISOString();

  db.prepare(`
    INSERT INTO watchers (name, template, payload, interval_ms, timeout_ms, callback_url, callback_token, status, created_at, next_poll_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'polling', ?, ?)
  `).run(
    w.name,
    w.template,
    JSON.stringify(w.payload),
    w.intervalMs,
    w.timeoutMs,
    w.callbackUrl || null,
    w.callbackToken || null,
    now,
    nextPoll,
  );

  return db.prepare("SELECT * FROM watchers WHERE name = ?").get(w.name) as WatcherRow;
}

export function getWatcher(name: string): WatcherRow | undefined {
  return getDb().prepare("SELECT * FROM watchers WHERE name = ?").get(name) as WatcherRow | undefined;
}

export function listWatchers(): WatcherRow[] {
  return getDb().prepare("SELECT * FROM watchers ORDER BY created_at DESC").all() as WatcherRow[];
}

export function updateWatcherPoll(name: string, result: unknown, nextPollAt: string): void {
  getDb().prepare(`
    UPDATE watchers SET
      last_poll_at = datetime('now'),
      next_poll_at = ?,
      poll_count = poll_count + 1,
      last_result = ?
    WHERE name = ?
  `).run(nextPollAt, JSON.stringify(result), name);
}

export function completeWatcher(name: string, status: "done" | "timeout" | "error", result?: unknown, error?: string): void {
  const db = getDb();
  const watcher = getWatcher(name);
  if (!watcher) return;

  const now = new Date().toISOString();
  const createdAt = new Date(watcher.created_at).getTime();
  const durationMs = Date.now() - createdAt;

  // Move to history
  db.prepare(`
    INSERT INTO history (name, template, payload, status, result, error, poll_count, created_at, completed_at, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    watcher.name,
    watcher.template,
    watcher.payload,
    status,
    result ? JSON.stringify(result) : null,
    error || null,
    watcher.poll_count,
    watcher.created_at,
    now,
    durationMs,
  );

  // Remove from active watchers
  db.prepare("DELETE FROM watchers WHERE name = ?").run(name);
}

export function removeWatcher(name: string): boolean {
  const result = getDb().prepare("DELETE FROM watchers WHERE name = ?").run(name);
  return result.changes > 0;
}

export function listHistory(limit = 50): HistoryRow[] {
  return getDb().prepare("SELECT * FROM history ORDER BY completed_at DESC LIMIT ?").all(limit) as HistoryRow[];
}

export function clearHistory(): void {
  getDb().prepare("DELETE FROM history").run();
}
