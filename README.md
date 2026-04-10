# CodeAtlas

> Visualize any codebase in 5 minutes. Local-first, privacy-focused.

<!-- Screenshots will be added here -->
**Screenshots coming soon**

---

## Features

- Three perspectives: System Framework (SF) / Logic Operation (LO) / Data Journey (DJ)
- AI-powered analysis (Claude, Gemini, OpenAI, Ollama — your choice, or disable entirely)
- Wiki knowledge export + Obsidian-compatible knowledge graph
- i18n: English + Traditional Chinese (繁體中文)
- Local-first: your code never leaves your machine
- Supports JavaScript, TypeScript, Python, and Java

---

## Quick Start

```bash
npm install -g codeatlas
codeatlas
```

That's it. A browser window opens with the welcome page — pick a project folder and explore.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `codeatlas` | Zero-arg launch — opens browser, pick a project |
| `codeatlas web [path]` | Analyze a specific path and open the web UI |
| `codeatlas wiki [path]` | Export a knowledge wiki (Markdown for Obsidian) |
| `codeatlas analyze [path]` | CLI-only analysis (no browser) |

### Common Flags

| Flag | Description |
|------|-------------|
| `--lang en\|zh-TW` | Set UI and output language (default: `en`) |
| `--ai anthropic\|gemini\|openai\|ollama\|disabled` | Choose AI provider |
| `--port N` | Server port (default: `3000`) |

---

## Three Perspectives

### System Framework (SF)

Directory-level architecture view. See how modules are organized and which folders contain which roles — routes, services, models, middleware. Designed for getting oriented in an unfamiliar project quickly.

### Logic Operation (LO)

Method-level call flow. See how functions call each other, grouped by category (Routes, Middleware, Services, Data Access, Utilities). AI analyzes each method's role and purpose so you understand not just what calls what, but why.

### Data Journey (DJ)

Endpoint-level data flow. Trace a request from its API entry point through middleware, business logic, and data access — step by step, in sequence. Ideal for debugging or onboarding onto an API-heavy codebase.

---

## AI Analysis

CodeAtlas supports multiple AI providers for intelligent code analysis:

- **Claude** (Anthropic) — Recommended
- **Gemini** (Google)
- **OpenAI** (GPT)
- **Ollama** — Runs locally, no API key needed, fully private
- **Disabled** — Works without AI; you just won't get smart summaries

Configure your provider in the web UI Settings panel or via the `--ai` CLI flag. Cloud AI providers will transmit code snippets to their respective APIs — this is clearly indicated in the UI. If privacy is critical, use Ollama or disable AI entirely.

---

## Wiki Knowledge Export

Generate Obsidian-compatible Markdown files from your codebase:

```bash
codeatlas wiki ./my-project --lang en
```

Produces interlinked `.md` files with frontmatter, cross-references, and an interactive knowledge graph viewable in the web UI. Import the output folder directly into Obsidian to explore your codebase as a knowledge base.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (full stack) |
| Frontend | React + React Flow + D3.js |
| Local server | Fastify |
| Code parsing | tree-sitter |
| Monorepo | pnpm workspace |

---

## Requirements

- Node.js >= 18
- pnpm >= 9 (for development only)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

---

## License

[MIT](LICENSE) — Copyright 2026 Stanshy
