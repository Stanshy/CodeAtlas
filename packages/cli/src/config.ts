/**
 * @codeatlas/cli — Configuration resolver
 *
 * Reads .codeatlas.json + environment variables and merges with CLI flags.
 * Priority: CLI flag > .codeatlas.json > environment variable > default
 * Exception: API keys — env var > CLI flag (env vars are safer)
 *
 * Sprint 6 — T3: config.ts
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CodeAtlasFileConfig {
  aiProvider?: string;
  ollamaModel?: string;
  port?: number;
  ignore?: string[];
}

export interface EnvConfig {
  aiKey?: string;
}

export interface CliOptions {
  port?: number;
  aiKey?: string;
  aiProvider?: string;
  ollamaModel?: string;
  ignore?: string[];
}

export interface ResolvedConfig {
  aiProvider: string;
  aiKey: string | undefined;
  ollamaModel: string;
  port: number;
  ignore: string[];
}

// ---------------------------------------------------------------------------
// Valid values
// ---------------------------------------------------------------------------

const VALID_PROVIDERS = ['disabled', 'ollama', 'openai', 'anthropic'];
const SENSITIVE_KEY_PATTERNS = ['key', 'secret', 'token'];

// ---------------------------------------------------------------------------
// readConfigFile
// ---------------------------------------------------------------------------

export function readConfigFile(projectPath: string): CodeAtlasFileConfig {
  const configPath = path.join(projectPath, '.codeatlas.json');

  let raw: string;
  try {
    raw = fs.readFileSync(configPath, 'utf-8');
  } catch {
    // File doesn't exist — silently use defaults
    return {};
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    console.error(
      `Invalid .codeatlas.json: ${err instanceof Error ? err.message : 'Parse error'}. Using defaults.`
    );
    return {};
  }

  // Warn if config contains key-like fields
  for (const field of Object.keys(parsed)) {
    if (SENSITIVE_KEY_PATTERNS.some((p) => field.toLowerCase().includes(p))) {
      console.warn(
        'Warning: .codeatlas.json should not contain API keys. Use environment variables instead.'
      );
      break;
    }
  }

  // Validate aiProvider
  let aiProvider: string | undefined;
  if (typeof parsed.aiProvider === 'string') {
    if (VALID_PROVIDERS.includes(parsed.aiProvider)) {
      aiProvider = parsed.aiProvider;
    } else {
      console.warn(
        `Unknown aiProvider "${parsed.aiProvider}" in .codeatlas.json. Falling back to "disabled".`
      );
      aiProvider = 'disabled';
    }
  }

  // Validate port
  let port: number | undefined;
  if (typeof parsed.port === 'number') {
    if (Number.isInteger(parsed.port) && parsed.port >= 1 && parsed.port <= 65535) {
      port = parsed.port;
    } else {
      console.warn('Invalid port in .codeatlas.json. Using default 3000.');
    }
  }

  // Validate ollamaModel
  const ollamaModel = typeof parsed.ollamaModel === 'string' ? parsed.ollamaModel : undefined;

  // Validate ignore
  let ignore: string[] | undefined;
  if (Array.isArray(parsed.ignore)) {
    ignore = parsed.ignore.filter((item): item is string => typeof item === 'string');
  }

  const result: CodeAtlasFileConfig = {};
  if (aiProvider !== undefined) result.aiProvider = aiProvider;
  if (ollamaModel !== undefined) result.ollamaModel = ollamaModel;
  if (port !== undefined) result.port = port;
  if (ignore !== undefined) result.ignore = ignore;
  return result;
}

// ---------------------------------------------------------------------------
// readEnvVars
// ---------------------------------------------------------------------------

export function readEnvVars(providerName?: string): EnvConfig {
  // Provider-specific env vars take priority
  let aiKey: string | undefined;

  if (providerName === 'openai' && process.env.OPENAI_API_KEY) {
    aiKey = process.env.OPENAI_API_KEY;
  } else if (providerName === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    aiKey = process.env.ANTHROPIC_API_KEY;
  }

  // Fall back to generic key
  if (!aiKey) {
    aiKey =
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.CODEATLAS_AI_KEY ||
      undefined;
  }

  const envResult: EnvConfig = {};
  if (aiKey) envResult.aiKey = aiKey;
  return envResult;
}

// ---------------------------------------------------------------------------
// resolveConfig
// ---------------------------------------------------------------------------

export function resolveConfig(cli: CliOptions, projectPath: string): ResolvedConfig {
  const file = readConfigFile(projectPath);

  // Provider priority: CLI > json > default
  const aiProvider = cli.aiProvider ?? file.aiProvider ?? 'disabled';

  // Key priority: env > CLI (env is safer — not in shell history)
  const env = readEnvVars(aiProvider);
  const aiKey = env.aiKey ?? cli.aiKey ?? undefined;

  return {
    aiProvider,
    aiKey,
    ollamaModel: cli.ollamaModel ?? file.ollamaModel ?? 'codellama',
    port: cli.port ?? file.port ?? 3000,
    ignore: cli.ignore ?? file.ignore ?? [],
  };
}
