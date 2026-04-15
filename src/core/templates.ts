/**
 * Cronology Core — Watcher Template System
 * Templates define how to poll and when a task is "done".
 */

export interface PollContext {
  pollCount: number;
  startedAt: Date;
  timeoutMs: number;
  intervalMs: number;
}

export interface PollResult {
  done: boolean;
  data?: unknown;
  message?: string;
}

export interface WatcherTemplate {
  name: string;
  description: string;
  payloadSchema: Record<string, unknown>;
  poll: (payload: unknown, ctx: PollContext) => Promise<PollResult>;
  format: (payload: unknown, result: unknown) => string;
  defaults: {
    intervalMs: number;
    timeoutMs: number;
  };
}

const registry = new Map<string, WatcherTemplate>();

export function registerTemplate(template: WatcherTemplate): void {
  registry.set(template.name, template);
}

export function getTemplate(name: string): WatcherTemplate | undefined {
  return registry.get(name);
}

export function listTemplates(): WatcherTemplate[] {
  return Array.from(registry.values());
}

export function getTemplateNames(): string[] {
  return Array.from(registry.keys());
}
