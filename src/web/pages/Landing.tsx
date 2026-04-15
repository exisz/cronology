export default function Landing() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              ⏱️
            </div>
            <span className="text-lg font-bold">Cronology</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </a>
            <a
              href="https://github.com/exisz/cronology"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/cronology"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              npm install
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Open Source • Self-Hosted • Zero Dependencies
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Ephemeral Task Watcher
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Register a polling task. Cronology watches it. When it's done (or times out),
            it fires a webhook and cleans up. Zero-cost when idle. No infrastructure required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-card border border-border font-mono text-sm">
              <span className="text-muted-foreground">$</span>
              <span>npm install -g cronology</span>
            </div>
            <a
              href="/dashboard"
              className="px-5 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Open Dashboard →
            </a>
          </div>

          {/* Badges */}
          <div className="flex gap-2 justify-center flex-wrap">
            <img alt="npm" src="https://img.shields.io/npm/v/cronology?style=flat-square&color=cb3837" />
            <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
            <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square" />
          </div>
        </div>
      </section>

      {/* What is Cronology */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">What is Cronology?</h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            Cronology is a <strong className="text-foreground">lightweight, self-hosted polling daemon</strong> that
            watches ephemeral tasks and notifies you when they complete. Unlike traditional monitoring tools that
            run 24/7, cronology watchers are <strong className="text-foreground">born to die</strong> — they poll until
            a condition is met, fire a webhook, and disappear.
          </p>
          <div className="rounded-lg border border-border bg-card p-6 font-mono text-sm leading-relaxed overflow-x-auto">
            <div className="text-muted-foreground"># Watch a deploy until it's healthy</div>
            <div className="text-violet-400">
              cronology add http-status my-deploy \
            </div>
            <div className="text-violet-400 pl-4">
              --payload '{`{"url":"https://app.example.com/health"}`}' \
            </div>
            <div className="text-violet-400 pl-4">
              --interval 30s --timeout 15m \
            </div>
            <div className="text-violet-400 pl-4">
              --callback-url https://hooks.slack.com/...
            </div>
            <div className="mt-3 text-muted-foreground"># Cronology polls every 30s. When /health returns 200,</div>
            <div className="text-muted-foreground"># it fires the webhook and the watcher disappears. ✨</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🪶",
                title: "Lightweight",
                desc: "SQLite storage, ~14KB scheduler. No Redis, no Postgres, no external deps. Just Node.js.",
              },
              {
                icon: "⏳",
                title: "Ephemeral by Design",
                desc: "Watchers are born to die. Poll → match → fire webhook → clean up. Zero cost when idle.",
              },
              {
                icon: "🔌",
                title: "Template System",
                desc: "Built-in templates for HTTP checks, file watching. Write your own in TypeScript.",
              },
              {
                icon: "📡",
                title: "Webhook Callbacks",
                desc: "POST results to any URL on completion. Bearer token auth. OpenClaw integration built-in.",
              },
              {
                icon: "🖥️",
                title: "Dashboard",
                desc: "React-based web UI to monitor watchers, view history, and register new tasks.",
              },
              {
                icon: "🐳",
                title: "Docker Ready",
                desc: "Single-container deployment with persistent SQLite volume. docker compose up -d and done.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-card p-6">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Architecture</h2>
          <div className="rounded-lg border border-border bg-card p-6 font-mono text-sm leading-loose overflow-x-auto">
            <pre className="text-muted-foreground">{`
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   CLI       │────▶│   Express API    │────▶│   SQLite    │
│  cronology  │     │   :18790         │     │   ./data/   │
└─────────────┘     └──────┬───────────┘     └─────────────┘
                           │
                    ┌──────┴───────────┐
                    │   Watcher Engine │
                    │   (croner)       │
                    └──────┬───────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │http-status│ │file-watch│ │ custom   │
        │ template │ │ template │ │ template │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │            │
             ▼             ▼            ▼
        Poll target   Check file   Your logic
             │             │            │
             └─────────────┴────────────┘
                           │
                    ┌──────┴───────────┐
                    │  done? ──▶ POST  │
                    │  Webhook callback│
                    └──────────────────┘
            `.trim()}</pre>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 px-6 border-t border-border bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Quick Start</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">1</span>
                npm
              </h3>
              <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm space-y-2">
                <div><span className="text-muted-foreground">$</span> npm install -g cronology</div>
                <div><span className="text-muted-foreground">$</span> cronology serve</div>
                <div className="text-muted-foreground"># Open http://localhost:18790</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">2</span>
                Docker
              </h3>
              <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm space-y-2">
                <div><span className="text-muted-foreground">$</span> docker run -d -p 18790:18790 -v cronology-data:/app/data exisz/cronology</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">3</span>
                Register a watcher
              </h3>
              <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">$</span> cronology add http-status deploy-check \
                </div>
                <div className="pl-4">
                  --payload '{`{"url":"https://myapp.com/health"}`}' \
                </div>
                <div className="pl-4">
                  --interval 30s --timeout 15m
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">How it compares</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-4 text-muted-foreground font-medium">Feature</th>
                  <th className="py-3 px-4 font-semibold text-violet-400">Cronology</th>
                  <th className="py-3 px-4 text-muted-foreground font-medium">healthchecks.io</th>
                  <th className="py-3 px-4 text-muted-foreground font-medium">Gatus</th>
                  <th className="py-3 px-4 text-muted-foreground font-medium">BullMQ</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-3 px-4">Purpose</td>
                  <td className="py-3 px-4 text-foreground">Ephemeral task watching</td>
                  <td className="py-3 px-4">Cron job monitoring</td>
                  <td className="py-3 px-4">Uptime monitoring</td>
                  <td className="py-3 px-4">Job queue</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-4">Self-hosted</td>
                  <td className="py-3 px-4 text-emerald-400">✅ Single binary</td>
                  <td className="py-3 px-4">✅ Complex</td>
                  <td className="py-3 px-4">✅ YAML config</td>
                  <td className="py-3 px-4">Needs Redis</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-4">Ephemeral watchers</td>
                  <td className="py-3 px-4 text-emerald-400">✅ Core feature</td>
                  <td className="py-3 px-4">❌</td>
                  <td className="py-3 px-4">❌</td>
                  <td className="py-3 px-4">~ish (delayed jobs)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-4">External deps</td>
                  <td className="py-3 px-4 text-emerald-400">None (SQLite)</td>
                  <td className="py-3 px-4">PostgreSQL</td>
                  <td className="py-3 px-4">None</td>
                  <td className="py-3 px-4">Redis</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-4">Webhook on complete</td>
                  <td className="py-3 px-4 text-emerald-400">✅</td>
                  <td className="py-3 px-4">✅</td>
                  <td className="py-3 px-4">✅</td>
                  <td className="py-3 px-4">Via code</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">GUI</td>
                  <td className="py-3 px-4 text-emerald-400">✅ Built-in</td>
                  <td className="py-3 px-4">✅</td>
                  <td className="py-3 px-4">✅</td>
                  <td className="py-3 px-4">Bull Board</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto text-center text-sm text-muted-foreground">
          <p>MIT License • Built by <a href="https://github.com/exisz" className="text-primary hover:underline">exisz</a></p>
        </div>
      </footer>
    </div>
  );
}
