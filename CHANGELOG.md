# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

---

## [1.0.0] - 2026-04-10

### Added

**Core Parsing Engine**
- Multi-language static analysis for JavaScript, TypeScript, Python, and Java using tree-sitter Node.js bindings
- Import resolution and dependency graph construction for all supported languages
- Class, method, and function extraction with signature-level granularity
- Endpoint detection for REST API routes across common frameworks
- Incremental parsing support to avoid re-analyzing unchanged files

**Three Perspectives Visualization**
- System Framework (SF) view — directory-level architecture overview with automatic role classification (controller, service, model, utility, config, and more)
- Logic Operation (LO) view — method-level call flow graph with category grouping, showing how functions invoke each other across file boundaries
- Data Journey (DJ) view — endpoint-level request tracing with step-by-step data flow from HTTP entry point through service and persistence layers

**AI-Powered Analysis**
- Pluggable AI provider architecture supporting Claude (Anthropic), Gemini (Google), OpenAI, and Ollama (local)
- AI-generated code summaries at the file, class, and method level
- Intelligent role classification to distinguish controllers, services, repositories, and utilities without manual annotation
- Endpoint description generation for REST APIs including parameter and response documentation
- All AI features are optional — the tool is fully functional with AI disabled

**Wiki Knowledge Export**
- Generate Obsidian-compatible Markdown files from any analyzed codebase
- Cross-referenced internal links using `[[WikiLink]]` notation for seamless navigation
- Interactive knowledge graph rendered from exported Markdown in Obsidian Graph View
- Structured export covering architecture overview, module descriptions, and endpoint references
- `codeatlas wiki` command for standalone export without opening the full web UI

**Web UI**
- React-based visualization powered by React Flow for node-graph rendering and D3.js for force-directed layouts
- Three-perspective tab navigation with persistent view state across perspective switches
- Context-sensitive detail panels for nodes — shows summary, file path, dependencies, and AI analysis when available
- Toolbar with search, filter, and layout controls for large graphs
- Camera preset shortcuts for navigating complex graphs quickly
- DJPanel for endpoint flow inspection with expandable step trace
- LODetailPanel and SFDetailPanel for method-level and directory-level node details respectively

**CLI Interface**
- `codeatlas` — launch the web UI in the default browser with welcome screen
- `codeatlas web` — start the local Fastify server and open the visualization UI
- `codeatlas wiki` — run analysis and export Obsidian-compatible Markdown to the output directory
- `codeatlas analyze` — run static analysis only and output graph JSON without starting the web server

**Welcome and Onboarding Experience**
- Zero-config launch: running `codeatlas` opens the browser directly to a project selection screen
- Recent projects list with quick-open support
- AI provider setup guidance with step-by-step configuration instructions built into the UI
- First-run detection with contextual hints for new users

**Progress Tracking**
- Real-time analysis progress reporting via Server-Sent Events (SSE) streaming
- Per-file progress updates during large project analysis
- Error reporting inline without aborting the full analysis run

**i18n: Internationalization**
- Full English and Traditional Chinese (zh-TW) language support across the entire web UI
- Language toggle accessible from the toolbar
- All UI strings, panel labels, tooltips, error messages, and onboarding copy translated
- i18n architecture designed for additional language contributions

**Privacy-First Architecture**
- All analysis runs locally on the user's machine
- Code and graph data never leave the local environment
- No telemetry, no analytics, no network requests during analysis
- AI features use the user's own API keys with direct provider connections — no proxy

**Developer Experience**
- pnpm monorepo with three packages: `@codeatlas/core`, `@codeatlas/cli`, `@codeatlas/web`
- `fixtures/` directory with sample projects in TypeScript, JavaScript, Python, and Java for reproducible testing
- Vitest test suite covering the core parsing engine and graph construction logic
- Fastify server with clean separation between static file serving and API routing
- Graph JSON output format versioned and documented in `api-design.md`

---

[1.0.0]: https://github.com/Stanshy/CodeAtlas/releases/tag/v1.0.0
