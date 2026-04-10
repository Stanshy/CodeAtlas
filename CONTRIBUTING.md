# Contributing to CodeAtlas

Thank you for your interest in contributing to CodeAtlas. This guide will help you get set up and understand how the project works so you can start contributing effectively.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [License](#license)

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9

### Setup

Clone the repository, install dependencies, and build all packages:

```bash
git clone https://github.com/Stanshy/CodeAtlas.git
cd CodeAtlas
pnpm install
pnpm build
```

Once the build completes, you can run the CLI against any local project:

```bash
node packages/cli/dist/index.js
```

---

## Project Structure

CodeAtlas is organized as a pnpm monorepo. Each package has a strict responsibility boundary — do not introduce cross-package dependencies that violate the architecture described below.

```
packages/
  core/    — Parsing engine, graph construction, AI contracts (no UI deps)
  cli/     — CLI entry point, Fastify server, serves web UI
  web/     — React frontend, visualization, i18n
fixtures/  — Sample projects for testing (TS, JS, Python, Java)
```

### Architecture Boundaries

```
core  (pure analysis engine)  →  no UI, no server dependencies
cli   (entry point + orchestration)  →  calls core, starts Fastify, serves web + graph JSON
web   (pure frontend)  →  reads JSON via /api/graph, no direct core dependency
```

The `core` package must remain UI-agnostic and server-agnostic. If you are adding a feature that touches analysis or parsing, changes belong in `core`. If you are adding a CLI command or API endpoint, changes belong in `cli`. If you are adding a visualization or UI component, changes belong in `web`.

---

## Development Workflow

### Build

Build all packages in dependency order (core first, then cli, then web):

```bash
pnpm build
```

### Run Tests

```bash
pnpm test
```

This runs all Vitest test suites across the monorepo.

### Start the Web Dev Server

For frontend development with hot reload:

```bash
pnpm --filter @codeatlas/web dev
```

### Test the CLI Locally

Build the CLI and run it directly:

```bash
pnpm --filter @codeatlas/cli build && node packages/cli/dist/index.js
```

### Scoped Commands

You can scope any pnpm command to a single package using the `--filter` flag:

```bash
pnpm --filter @codeatlas/core build
pnpm --filter @codeatlas/web test
```

---

## Code Style

### Linting and Formatting

The project uses ESLint and Prettier. Configuration is committed to the repository. Before submitting a PR, make sure your code passes linting:

```bash
pnpm lint
pnpm format
```

Prettier settings:

- `printWidth`: 100
- `singleQuote`: true

### TypeScript

- Strict mode is enabled across all packages. Do not disable strict checks.
- Avoid `any` — use proper types or generics.
- All exported functions and types must have explicit type annotations.

### Naming Conventions

| Context | Style | Example |
|---------|-------|---------|
| Variables and functions | camelCase | `analyzeProject`, `graphData` |
| Types and interfaces | PascalCase | `GraphNode`, `AnalysisResult` |
| React components | PascalCase | `GraphContainer`, `TabBar` |
| Filenames | kebab-case | `graph-builder.ts`, `import-resolver.ts` |
| Package names | `@codeatlas/*` scoped | `@codeatlas/core`, `@codeatlas/cli` |
| API JSON fields | camelCase | `fileSize`, `importCount` |

---

## Pull Request Process

### Branch Naming

Fork the repository and create a branch from `main`:

- New features: `feature/short-description`
- Bug fixes: `fix/short-description`

### Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must start with one of the following prefixes:

| Prefix | When to use |
|--------|-------------|
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `chore:` | Tooling, build, or dependency changes |
| `docs:` | Documentation changes only |
| `refactor:` | Code restructuring with no behavior change |
| `test:` | Adding or updating tests |

Examples:

```
feat: add Python parsing support for class inheritance
fix: resolve graph edge duplication on re-render
docs: add API endpoint reference to README
```

### Submitting a PR

1. Fork the repository and create your branch from `main`.
2. Make your changes, following the code style and architecture guidelines above.
3. Add or update tests to cover your changes.
4. Run `pnpm test` and confirm all tests pass.
5. Run `pnpm lint` and resolve any issues.
6. Open a pull request against the `main` branch.
7. Fill out the PR description clearly — explain what changed and why.

### PR Scope

Keep PRs focused. One feature or one bug fix per PR. Large PRs that touch multiple unrelated areas are difficult to review and will likely be asked to be split. If you are unsure about scope, open an issue first to discuss your approach.

---

## Testing

### Test Framework

All tests use [Vitest](https://vitest.dev/).

### Running Tests

```bash
pnpm test
```

To run tests for a single package:

```bash
pnpm --filter @codeatlas/core test
```

### Test Fixtures

The `fixtures/` directory contains sample projects in TypeScript, JavaScript, Python, and Java. These are used by the parsing engine tests to validate graph construction against real code. If you are adding multi-language parsing support or modifying the analysis pipeline, add or update fixtures as needed.

### Writing Tests

- Place unit tests alongside the source file or in a `__tests__/` subdirectory within the package.
- Name test files with the `.test.ts` extension.
- Cover both the happy path and meaningful edge cases.
- All new features must include tests. PRs without test coverage for new code will be asked to add tests before merging.

---

## License

CodeAtlas is released under the [MIT License](./LICENSE). By contributing, you agree that your contributions will be licensed under the same license.
