/**
 * Built-in Template: file-watch
 * Polls for file existence or modification.
 */

import fs from "node:fs";
import { type WatcherTemplate, type PollContext, type PollResult } from "../templates.ts";

interface FileWatchPayload {
  path: string;
  condition?: "exists" | "not-exists" | "modified-after";
  after?: string; // ISO timestamp for modified-after
}

export const fileWatchTemplate: WatcherTemplate = {
  name: "file-watch",
  description: "Watch for file existence, absence, or modification after a given time",
  payloadSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to watch" },
      condition: {
        type: "string",
        enum: ["exists", "not-exists", "modified-after"],
        description: "Condition to check (default: exists)",
      },
      after: { type: "string", description: "ISO timestamp for modified-after condition" },
    },
    required: ["path"],
  },
  defaults: {
    intervalMs: 10_000, // 10s
    timeoutMs: 1_800_000, // 30min
  },

  async poll(payload: unknown, _ctx: PollContext): Promise<PollResult> {
    const p = payload as FileWatchPayload;
    const condition = p.condition || "exists";

    try {
      const fileExists = fs.existsSync(p.path);

      if (condition === "exists") {
        if (fileExists) {
          const stat = fs.statSync(p.path);
          return {
            done: true,
            data: { exists: true, size: stat.size, mtime: stat.mtime.toISOString() },
            message: `✅ File found: ${p.path} (${stat.size} bytes)`,
          };
        }
        return {
          done: false,
          data: { exists: false },
          message: `⏳ Waiting for file: ${p.path}`,
        };
      }

      if (condition === "not-exists") {
        if (!fileExists) {
          return {
            done: true,
            data: { exists: false },
            message: `✅ File gone: ${p.path}`,
          };
        }
        return {
          done: false,
          data: { exists: true },
          message: `⏳ File still exists: ${p.path}`,
        };
      }

      if (condition === "modified-after") {
        if (!fileExists) {
          return {
            done: false,
            data: { exists: false },
            message: `⏳ File doesn't exist yet: ${p.path}`,
          };
        }
        const stat = fs.statSync(p.path);
        const afterDate = p.after ? new Date(p.after) : new Date(0);
        const modified = stat.mtime > afterDate;
        return {
          done: modified,
          data: { exists: true, mtime: stat.mtime.toISOString(), after: p.after },
          message: modified
            ? `✅ File modified after ${p.after}: ${p.path}`
            : `⏳ File not modified since ${p.after}: ${p.path}`,
        };
      }

      return { done: false, message: `Unknown condition: ${condition}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        done: false,
        data: { error: msg },
        message: `❌ Error checking ${p.path}: ${msg}`,
      };
    }
  },

  format(payload: unknown, result: unknown): string {
    const p = payload as FileWatchPayload;
    const r = result as { exists?: boolean; error?: string };
    if (r.error) return `File watch error for ${p.path}: ${r.error}`;
    return `File ${p.path}: ${r.exists ? "exists" : "not found"}`;
  },
};
