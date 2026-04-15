<div align="center">

```
   ██████╗██████╗  ██████╗ ███╗   ██╗ ██████╗ ██╗      ██████╗  ██████╗ ██╗   ██╗
  ██╔════╝██╔══██╗██╔═══██╗████╗  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝ ╚██╗ ██╔╝
  ██║     ██████╔╝██║   ██║██╔██╗ ██║██║   ██║██║     ██║   ██║██║  ███╗ ╚████╔╝
  ██║     ██╔══██╗██║   ██║██║╚██╗██║██║   ██║██║     ██║   ██║██║   ██║  ╚██╔╝
  ╚██████╗██║  ██║╚██████╔╝██║ ╚████║╚██████╔╝███████╗╚██████╔╝╚██████╔╝   ██║
   ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝    ╚═╝
```

**Ephemeral task watcher service — zero-cost polling daemon with webhook callbacks**

[![npm version](https://img.shields.io/npm/v/cronology?style=flat-square&color=cb3837)](https://www.npmjs.com/package/cronology)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)](https://nodejs.org)
[![CI](https://img.shields.io/github/actions/workflow/status/exisz/cronology/ci.yml?style=flat-square)](https://github.com/exisz/cronology/actions)

</div>

---

## What is Cronology?

Cronology is a lightweight, self-hosted polling daemon that watches ephemeral tasks and notifies you when they complete. Unlike monitoring tools that run 24/7, cronology watchers are **born to die** — they poll until a condition is met, fire a webhook, and disappear.

**Use cases:**
- 🚀 Watch a deploy until it's healthy, then notify Slack
- 📦 Wait for a build artifact to appear on S3
- 🔄 Poll a CI pipeline until it finishes
- 📁 Watch for a file to appear (or disappear)
- ⏰ Any "poll until done" workflow with automatic cleanup

## Features

| Feature | Description |
|---------|-------------|
| 🪶 **Lightweight** | SQLite storage, ~14KB scheduler. No Redis, no Postgres |
| ⏳ **Ephemeral** | Watchers auto-clean after completion or timeout |
| 🔌 **Templates** | Built-in HTTP & file templates. Write custom ones in TypeScript |
| 📡 **Webhooks** | POST results on completion with Bearer auth support |
| 🖥️ **Dashboard** | React web UI for monitoring and management |
| 🐳 **Docker** | Single-container deployment with volume persistence |
| ⌨️ **CLI** | Full CLI for scripting and automation |
| 🔧 **systemd** | Built-in unit file generator for Linux servers |

## Quick Start

### npm

```bash
npm install -g cronology
cronology serve
# Open http://localhost:18790
```

### Docker

```bash
docker run -d \
  -p 18790:18790 \
  -v cronology-data:/app/data \
  --name cronology \
  exisz/cronology
```

### Docker Compose

```yaml
services:
  cronology:
    build: .
    container_name: cronology
    restart: unless-stopped
    ports:
      - "18790:18790"
    volumes:
      - ./data:/app/data
    environment:
      - CRONOLOGY_DATA_DIR=/app/data
```

## CLI Reference

```bash
# Start the daemon
cronology serve [--port 18790] [--host 0.0.0.0]

# Register a watcher
cronology add <template> <name> [options]
  --payload '{...}'          # JSON payload for the template
  --interval 30s             # Poll interval (30s, 3m, 1h)
  --timeout 2h               # Max watcher lifetime
  --callback-url <url>       # Webhook URL on completion
  --callback-token <token>   # Bearer token for webhook

# Manage watchers
cronology list               # List active watchers
cronology status <name>      # Watcher details
cronology remove <name>      # Remove a watcher

# History & info
cronology history            # Show completed watchers
cronology templates          # List available templates
cronology health             # Daemon health check

# System
cronology install-service    # Generate systemd unit file
```

### Examples

```bash
# Watch a deploy until healthy
cronology add http-status deploy-check \
  --payload '{"url":"https://app.example.com/health"}' \
  --interval 30s --timeout 15m \
  --callback-url https://hooks.slack.com/services/...

# Watch for a build artifact
cronology add file-watch build-output \
  --payload '{"path":"/tmp/build/output.tar.gz"}' \
  --interval 10s --timeout 30m

# Watch until a file is removed
cronology add file-watch cleanup-check \
  --payload '{"path":"/tmp/lockfile","condition":"not-exists"}' \
  --interval 5s --timeout 10m
```

## API Reference

All endpoints are under `http://localhost:18790/api/`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with watcher count |
| `GET` | `/api/templates` | List available templates |
| `GET` | `/api/templates/:name` | Template details |
| `POST` | `/api/watchers` | Register a new watcher |
| `GET` | `/api/watchers` | List active watchers |
| `GET` | `/api/watchers/:name` | Watcher details |
| `DELETE` | `/api/watchers/:name` | Remove a watcher |
| `GET` | `/api/history` | Completed/timed-out watchers |
| `DELETE` | `/api/history` | Clear history |

### Register a Watcher (POST /api/watchers)

```json
{
  "template": "http-status",
  "name": "my-deploy-check",
  "payload": {
    "url": "https://app.example.com/health",
    "expectedStatus": 200
  },
  "intervalMs": 30000,
  "timeoutMs": 900000,
  "callbackUrl": "https://hooks.example.com/webhook",
  "callbackToken": "secret-token"
}
```

### Webhook Callback Payload

When a watcher completes (or times out), cronology POSTs:

```json
{
  "event": "watcher.completed",
  "watcher": "my-deploy-check",
  "template": "http-status",
  "status": "done",
  "result": { "status": 200, "statusMatch": true, "bodyMatch": true },
  "pollCount": 5,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "completedAt": "2025-01-15T10:02:30.000Z",
  "durationMs": 150000
}
```

## Built-in Templates

### `http-status`

Poll an HTTP endpoint until it returns the expected status/body.

| Payload Field | Type | Default | Description |
|---------------|------|---------|-------------|
| `url` | string | *required* | URL to poll |
| `method` | string | `GET` | HTTP method |
| `expectedStatus` | number | `200` | Expected status code |
| `expectedBody` | string | — | String that must appear in body |
| `headers` | object | — | Additional headers |
| `timeout` | number | `10000` | Request timeout (ms) |

### `file-watch`

Watch for file existence, absence, or modification.

| Payload Field | Type | Default | Description |
|---------------|------|---------|-------------|
| `path` | string | *required* | File path to watch |
| `condition` | string | `exists` | `exists`, `not-exists`, or `modified-after` |
| `after` | string | — | ISO timestamp for `modified-after` |

## Writing Custom Templates

Create a TypeScript file implementing the `WatcherTemplate` interface:

```typescript
import { WatcherTemplate, PollContext, PollResult } from "../templates.ts";

export const myTemplate: WatcherTemplate = {
  name: "my-check",
  description: "Description of what this checks",
  payloadSchema: { /* JSON Schema */ },
  defaults: { intervalMs: 30_000, timeoutMs: 3_600_000 },

  async poll(payload: unknown, ctx: PollContext): Promise<PollResult> {
    // Your polling logic here
    return {
      done: false,       // true when condition is met
      data: { ... },     // arbitrary data (included in webhook)
      message: "...",    // log message
    };
  },

  format(payload: unknown, result: unknown): string {
    return "Human-readable summary";
  },
};
```

Register it in `src/core/templates/index.ts`:

```typescript
import { myTemplate } from "./my-check.ts";
registerTemplate(myTemplate);
```

## Comparison

| Feature | Cronology | healthchecks.io | Gatus | changedetection.io | BullMQ |
|---------|-----------|-----------------|-------|-------------------|--------|
| Purpose | Ephemeral task watching | Cron monitoring | Uptime monitoring | Web change detection | Job queue |
| Ephemeral watchers | ✅ Core feature | ❌ | ❌ | ❌ | ~ish |
| Self-hosted | ✅ Single process | ✅ Complex | ✅ | ✅ | Needs Redis |
| External deps | None (SQLite) | PostgreSQL | None | — | Redis |
| Webhook on complete | ✅ | ✅ | ✅ | ✅ | Via code |
| Web GUI | ✅ Built-in | ✅ | ✅ | ✅ | Bull Board |
| CLI | ✅ | ❌ | ❌ | ❌ | ❌ |
| Template system | ✅ | ❌ | YAML | ❌ | ❌ |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `18790` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address |
| `CRONOLOGY_DATA_DIR` | `./data` | SQLite data directory |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) © [exisz](https://github.com/exisz)
