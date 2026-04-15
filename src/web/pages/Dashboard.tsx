import { useState, useEffect, useCallback } from "react";

// --- Types ---

interface HealthData {
  status: string;
  version: string;
  uptime: number;
  activeWatchers: number;
  hostname: string;
  memory: { used: number; total: number; percent: number };
}

interface WatcherData {
  name: string;
  template: string;
  payload: string;
  interval_ms: number;
  timeout_ms: number;
  callback_url: string | null;
  status: string;
  created_at: string;
  last_poll_at: string | null;
  next_poll_at: string | null;
  poll_count: number;
  last_result: string | null;
}

interface HistoryData {
  id: number;
  name: string;
  template: string;
  status: string;
  poll_count: number;
  created_at: string;
  completed_at: string;
  duration_ms: number | null;
  result: string | null;
}

interface TemplateData {
  name: string;
  description: string;
  payloadSchema: Record<string, unknown>;
  defaults: { intervalMs: number; timeoutMs: number };
}

// --- Helpers ---

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function timeSince(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  return formatMs(Math.abs(ms));
}

// --- Components ---

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ok: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    polling: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    timeout: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const dotColors: Record<string, string> = {
    ok: "bg-emerald-400",
    polling: "bg-blue-400 animate-pulse",
    done: "bg-emerald-400",
    timeout: "bg-amber-400",
    error: "bg-red-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || colors.error}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status] || dotColors.error}`} />
      {status.toUpperCase()}
    </span>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 ${className}`}>
      <h2 className="text-sm font-medium text-muted-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function AddWatcherForm({ templates, onAdd }: { templates: TemplateData[]; onAdd: () => void }) {
  const [template, setTemplate] = useState(templates[0]?.name || "");
  const [name, setName] = useState("");
  const [payload, setPayload] = useState("{}");
  const [interval, setInterval] = useState("30s");
  const [timeout, setTimeout] = useState("1h");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parseDuration = (s: string): number => {
    const match = s.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) return parseInt(s, 10) * 1000 || 30000;
    const [, val, unit] = match;
    const n = parseInt(val, 10);
    const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return n * (multipliers[unit] || 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body = {
        template,
        name,
        payload: JSON.parse(payload),
        intervalMs: parseDuration(interval),
        timeoutMs: parseDuration(timeout),
        callbackUrl: callbackUrl || undefined,
      };
      const res = await fetch("/api/watchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError((data as { error: string }).error);
        return;
      }
      setName("");
      setPayload("{}");
      onAdd();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add watcher");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Template</label>
          <select
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              const t = templates.find((t) => t.name === e.target.value);
              if (t) {
                setInterval(formatMs(t.defaults.intervalMs));
                setTimeout(formatMs(t.defaults.timeoutMs));
              }
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {templates.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-watcher"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Payload (JSON)</label>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Interval</label>
          <input
            type="text"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Timeout</label>
          <input
            type="text"
            value={timeout}
            onChange={(e) => setTimeout(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Callback URL</label>
          <input
            type="text"
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting || !name}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add Watcher"}
      </button>
    </form>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [watchers, setWatchers] = useState<WatcherData[]>([]);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"watchers" | "history" | "templates" | "add">("watchers");

  const fetchAll = useCallback(async () => {
    try {
      const [hRes, wRes, hiRes, tRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/watchers"),
        fetch("/api/history?limit=50"),
        fetch("/api/templates"),
      ]);
      setHealth(await hRes.json());
      setWatchers(await wRes.json());
      setHistory(await hiRes.json());
      setTemplates(await tRes.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection error");
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = window.setInterval(fetchAll, 5000);
    return () => window.clearInterval(interval);
  }, [fetchAll]);

  const removeWatcher = async (name: string) => {
    await fetch(`/api/watchers/${name}`, { method: "DELETE" });
    fetchAll();
  };

  const tabs = [
    { key: "watchers" as const, label: "Active Watchers", count: watchers.length },
    { key: "history" as const, label: "History", count: history.length },
    { key: "templates" as const, label: "Templates", count: templates.length },
    { key: "add" as const, label: "+ Add Watcher" },
  ];

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              ⏱️
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                <a href="/" className="hover:text-primary">Cronology</a>
              </h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {health && <StatusBadge status={health.status} />}
            {health && (
              <span className="text-xs text-muted-foreground font-mono">
                v{health.version} • {health.activeWatchers} watcher{health.activeWatchers !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
            ⚠️ Connection error: {error}
          </div>
        )}

        {/* Stats Row */}
        {health && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card title="Status">
              <StatusBadge status={health.status} />
            </Card>
            <Card title="Active Watchers">
              <div className="text-2xl font-mono font-semibold">{health.activeWatchers}</div>
            </Card>
            <Card title="Uptime">
              <div className="text-lg font-mono">{formatUptime(health.uptime)}</div>
            </Card>
            <Card title="Memory">
              <div className="text-lg font-mono">{health.memory.percent}%</div>
              <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${health.memory.percent}%` }} />
              </div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary text-xs">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "watchers" && (
          <div className="space-y-3">
            {watchers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No active watchers</p>
                <button onClick={() => setTab("add")} className="text-primary hover:underline text-sm">
                  + Add your first watcher
                </button>
              </div>
            ) : (
              watchers.map((w) => (
                <div key={w.name} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{w.name}</span>
                      <StatusBadge status={w.status} />
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary">{w.template}</span>
                    </div>
                    <button
                      onClick={() => removeWatcher(w.name)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Polls:</span>{" "}
                      <span className="font-mono">{w.poll_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interval:</span>{" "}
                      <span className="font-mono">{formatMs(w.interval_ms)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeout:</span>{" "}
                      <span className="font-mono">{formatMs(w.timeout_ms)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Running:</span>{" "}
                      <span className="font-mono">{timeSince(w.created_at)}</span>
                    </div>
                  </div>
                  {w.last_result && (
                    <div className="mt-2 text-xs font-mono text-muted-foreground bg-secondary/50 rounded p-2 overflow-x-auto">
                      {w.last_result.slice(0, 200)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No history yet</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{h.name}</span>
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary">{h.template}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{timeSince(h.completed_at)} ago</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Polls:</span>{" "}
                      <span className="font-mono">{h.poll_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>{" "}
                      <span className="font-mono">{h.duration_ms ? formatMs(h.duration_ms) : "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>{" "}
                      <span className="font-mono text-xs">{h.completed_at}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "templates" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <Card key={t.name} title={t.name}>
                <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">Default interval:</span>{" "}
                    <span className="font-mono">{formatMs(t.defaults.intervalMs)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Default timeout:</span>{" "}
                    <span className="font-mono">{formatMs(t.defaults.timeoutMs)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "add" && (
          <Card title="Register New Watcher">
            <AddWatcherForm templates={templates} onAdd={() => { fetchAll(); setTab("watchers"); }} />
          </Card>
        )}
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-muted-foreground text-center">
          Cronology — Ephemeral Task Watcher •{" "}
          <a href="https://github.com/exisz/cronology" className="text-primary hover:underline">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
