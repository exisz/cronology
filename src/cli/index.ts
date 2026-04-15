#!/usr/bin/env node
/**
 * Cronology CLI — Ephemeral Task Watcher
 */

import { Command } from "commander";
import { getVersion } from "../core/index.ts";

const program = new Command();

program
  .name("cronology")
  .description("Ephemeral task watcher service — zero-cost polling daemon with webhook callbacks")
  .version(getVersion());

// --- serve ---
program
  .command("serve")
  .description("Start the cronology daemon (API + GUI)")
  .option("-p, --port <port>", "Port to listen on", "18790")
  .option("--host <host>", "Host to bind to", "0.0.0.0")
  .action(async (opts) => {
    process.env.PORT = opts.port;
    process.env.HOST = opts.host;
    await import("../server/index.ts");
  });

// --- add ---
program
  .command("add <template> <name>")
  .description("Register a new watcher")
  .option("--payload <json>", "JSON payload for the template", "{}")
  .option("--interval <duration>", "Poll interval (e.g. 30s, 3m, 1h)", "30s")
  .option("--timeout <duration>", "Watcher timeout (e.g. 30m, 2h)", "1h")
  .option("--callback-url <url>", "Webhook URL to call on completion")
  .option("--callback-token <token>", "Bearer token for callback")
  .action(async (template, name, opts) => {
    const baseUrl = getBaseUrl();
    try {
      const body = {
        template,
        name,
        payload: JSON.parse(opts.payload),
        intervalMs: parseDuration(opts.interval),
        timeoutMs: parseDuration(opts.timeout),
        callbackUrl: opts.callbackUrl,
        callbackToken: opts.callbackToken,
      };

      const res = await fetch(`${baseUrl}/api/watchers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(`❌ ${(data as { error: string }).error}`);
        process.exit(1);
      }

      console.log(`✅ Watcher registered: ${name}`);
      console.log(`   Template:  ${template}`);
      console.log(`   Interval:  ${opts.interval}`);
      console.log(`   Timeout:   ${opts.timeout}`);
      if (opts.callbackUrl) console.log(`   Callback:  ${opts.callbackUrl}`);
    } catch (err) {
      console.error(`❌ Failed to connect to cronology at ${baseUrl}`);
      console.error(`   Is the daemon running? Start with: cronology serve`);
      process.exit(1);
    }
  });

// --- list ---
program
  .command("list")
  .alias("ls")
  .description("List active watchers")
  .action(async () => {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/watchers`);
      const watchers = (await res.json()) as Array<{
        name: string;
        template: string;
        status: string;
        poll_count: number;
        created_at: string;
        last_poll_at: string | null;
        interval_ms: number;
      }>;

      if (watchers.length === 0) {
        console.log("No active watchers.");
        return;
      }

      console.log(`Active watchers (${watchers.length}):\n`);
      for (const w of watchers) {
        const age = timeSince(w.created_at);
        console.log(`  📡 ${w.name}`);
        console.log(`     Template: ${w.template} | Status: ${w.status} | Polls: ${w.poll_count}`);
        console.log(`     Interval: ${formatMs(w.interval_ms)} | Running: ${age}`);
        if (w.last_poll_at) console.log(`     Last poll: ${timeSince(w.last_poll_at)} ago`);
        console.log();
      }
    } catch {
      console.error(`❌ Failed to connect to cronology at ${baseUrl}`);
      process.exit(1);
    }
  });

// --- status ---
program
  .command("status <name>")
  .description("Get watcher details")
  .action(async (name) => {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/watchers/${name}`);
      if (res.status === 404) {
        console.error(`❌ Watcher not found: ${name}`);
        process.exit(1);
      }
      const w = (await res.json()) as {
        name: string;
        template: string;
        status: string;
        poll_count: number;
        created_at: string;
        last_poll_at: string | null;
        next_poll_at: string | null;
        interval_ms: number;
        timeout_ms: number;
        callback_url: string | null;
        payload: string;
        last_result: string | null;
      };

      console.log(`📡 ${w.name}`);
      console.log(`   Template:    ${w.template}`);
      console.log(`   Status:      ${w.status}`);
      console.log(`   Poll count:  ${w.poll_count}`);
      console.log(`   Interval:    ${formatMs(w.interval_ms)}`);
      console.log(`   Timeout:     ${formatMs(w.timeout_ms)}`);
      console.log(`   Created:     ${w.created_at}`);
      if (w.last_poll_at) console.log(`   Last poll:   ${w.last_poll_at}`);
      if (w.next_poll_at) console.log(`   Next poll:   ${w.next_poll_at}`);
      if (w.callback_url) console.log(`   Callback:    ${w.callback_url}`);
      console.log(`   Payload:     ${w.payload}`);
      if (w.last_result) console.log(`   Last result: ${w.last_result}`);
    } catch {
      console.error(`❌ Failed to connect to cronology at ${baseUrl}`);
      process.exit(1);
    }
  });

// --- remove ---
program
  .command("remove <name>")
  .alias("rm")
  .description("Remove an active watcher")
  .action(async (name) => {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/watchers/${name}`, { method: "DELETE" });
      if (res.status === 404) {
        console.error(`❌ Watcher not found: ${name}`);
        process.exit(1);
      }
      console.log(`✅ Watcher removed: ${name}`);
    } catch {
      console.error(`❌ Failed to connect to cronology at ${baseUrl}`);
      process.exit(1);
    }
  });

// --- history ---
program
  .command("history")
  .description("Show completed/timed-out watchers")
  .option("-n, --limit <count>", "Number of entries", "20")
  .action(async (opts) => {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/history?limit=${opts.limit}`);
      const history = (await res.json()) as Array<{
        name: string;
        template: string;
        status: string;
        poll_count: number;
        created_at: string;
        completed_at: string;
        duration_ms: number | null;
      }>;

      if (history.length === 0) {
        console.log("No history.");
        return;
      }

      console.log(`History (${history.length} entries):\n`);
      for (const h of history) {
        const icon = h.status === "done" ? "✅" : h.status === "timeout" ? "⏰" : "❌";
        const duration = h.duration_ms ? formatMs(h.duration_ms) : "?";
        console.log(`  ${icon} ${h.name} (${h.template})`);
        console.log(`     Status: ${h.status} | Polls: ${h.poll_count} | Duration: ${duration}`);
        console.log(`     Completed: ${h.completed_at}`);
        console.log();
      }
    } catch {
      console.error(`❌ Failed to connect to cronology at ${baseUrl}`);
      process.exit(1);
    }
  });

// --- templates ---
program
  .command("templates")
  .description("List available watcher templates")
  .action(async () => {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/templates`);
      const templates = (await res.json()) as Array<{
        name: string;
        description: string;
        defaults: { intervalMs: number; timeoutMs: number };
      }>;

      console.log(`Available templates (${templates.length}):\n`);
      for (const t of templates) {
        console.log(`  📋 ${t.name}`);
        console.log(`     ${t.description}`);
        console.log(`     Defaults: interval=${formatMs(t.defaults.intervalMs)}, timeout=${formatMs(t.defaults.timeoutMs)}`);
        console.log();
      }
    } catch {
      console.error(`❌ Failed to connect to cronology at ${baseUrl}`);
      process.exit(1);
    }
  });

// --- health ---
program
  .command("health")
  .description("Check daemon health")
  .action(async () => {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      const h = (await res.json()) as {
        status: string;
        version: string;
        uptime: number;
        activeWatchers: number;
        hostname: string;
        memory: { used: number; total: number; percent: number };
      };
      console.log(`⏱️  Cronology v${h.version}`);
      console.log(`   Status:     ${h.status}`);
      console.log(`   Uptime:     ${formatMs(h.uptime * 1000)}`);
      console.log(`   Watchers:   ${h.activeWatchers} active`);
      console.log(`   Memory:     ${h.memory.used}MB / ${h.memory.total}MB (${h.memory.percent}%)`);
      console.log(`   Hostname:   ${h.hostname}`);
    } catch {
      console.error(`❌ Cronology is not running at ${baseUrl}`);
      console.error(`   Start with: cronology serve`);
      process.exit(1);
    }
  });

// --- install-service ---
program
  .command("install-service")
  .description("Generate systemd unit file for cronology")
  .option("--data-dir <path>", "Data directory", "/var/lib/cronology")
  .option("--port <port>", "Port", "18790")
  .action((opts) => {
    const execPath = process.argv[1];
    const workDir = process.cwd();
    const unit = `[Unit]
Description=Cronology — Ephemeral Task Watcher
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/env node ${execPath} serve --port ${opts.port}
WorkingDirectory=${workDir}
Restart=always
RestartSec=5
Environment=PORT=${opts.port}
Environment=CRONOLOGY_DATA_DIR=${opts.dataDir}

[Install]
WantedBy=multi-user.target
`;
    console.log("# Systemd unit file for cronology");
    console.log("# Save to: /etc/systemd/system/cronology.service");
    console.log("# Then: sudo systemctl enable --now cronology");
    console.log();
    console.log(unit);
  });

// --- Helpers ---

function getBaseUrl(): string {
  const port = process.env.CRONOLOGY_PORT || "18790";
  const host = process.env.CRONOLOGY_HOST || "localhost";
  return `http://${host}:${port}`;
}

function parseDuration(s: string): number {
  const match = s.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    const num = parseInt(s, 10);
    if (!isNaN(num)) return num;
    throw new Error(`Invalid duration: ${s}. Use format like 30s, 3m, 1h`);
  }
  const [, val, unit] = match;
  const n = parseInt(val, 10);
  switch (unit) {
    case "ms": return n;
    case "s": return n * 1000;
    case "m": return n * 60_000;
    case "h": return n * 3_600_000;
    case "d": return n * 86_400_000;
    default: return n * 1000;
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

function timeSince(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  return formatMs(Math.abs(ms));
}

program.parse();
