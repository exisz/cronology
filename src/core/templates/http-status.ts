/**
 * Built-in Template: http-status
 * Polls an HTTP endpoint until the response matches expected status/body.
 */

import { type WatcherTemplate, type PollContext, type PollResult } from "../templates.ts";

interface HttpStatusPayload {
  url: string;
  method?: string;
  expectedStatus?: number;
  expectedBody?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export const httpStatusTemplate: WatcherTemplate = {
  name: "http-status",
  description: "Poll an HTTP endpoint until it returns the expected status code or body content",
  payloadSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to poll" },
      method: { type: "string", description: "HTTP method (default: GET)" },
      expectedStatus: { type: "number", description: "Expected HTTP status code (default: 200)" },
      expectedBody: { type: "string", description: "String that must appear in response body" },
      headers: { type: "object", description: "Additional HTTP headers" },
      timeout: { type: "number", description: "Request timeout in ms (default: 10000)" },
    },
    required: ["url"],
  },
  defaults: {
    intervalMs: 30_000, // 30s
    timeoutMs: 3_600_000, // 1h
  },

  async poll(payload: unknown, _ctx: PollContext): Promise<PollResult> {
    const p = payload as HttpStatusPayload;
    const method = p.method || "GET";
    const expectedStatus = p.expectedStatus ?? 200;
    const requestTimeout = p.timeout || 10_000;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeout);

      const res = await fetch(p.url, {
        method,
        headers: p.headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const body = await res.text();
      const statusMatch = res.status === expectedStatus;
      const bodyMatch = p.expectedBody ? body.includes(p.expectedBody) : true;
      const done = statusMatch && bodyMatch;

      return {
        done,
        data: {
          status: res.status,
          statusMatch,
          bodyMatch,
          bodyLength: body.length,
          bodyPreview: body.slice(0, 200),
        },
        message: done
          ? `✅ ${p.url} returned ${res.status}${p.expectedBody ? " with expected body" : ""}`
          : `⏳ ${p.url} returned ${res.status} (expected ${expectedStatus})${p.expectedBody && !bodyMatch ? ", body mismatch" : ""}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        done: false,
        data: { error: msg },
        message: `❌ ${p.url} — ${msg}`,
      };
    }
  },

  format(payload: unknown, result: unknown): string {
    const p = payload as HttpStatusPayload;
    const r = result as { status?: number; error?: string };
    if (r.error) return `HTTP check failed for ${p.url}: ${r.error}`;
    return `HTTP ${r.status} from ${p.url}`;
  },
};
