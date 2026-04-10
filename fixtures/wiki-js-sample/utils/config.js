'use strict';

const DEFAULT_CONFIG = {
  port: 3000,
  host: 'localhost',
  logLevel: 'info',
  maxRetries: 3,
  timeoutMs: 5000,
};

let loadedConfig = null;

/**
 * Loads and merges configuration from the environment and defaults.
 * @param {Record<string, unknown>} [overrides]
 * @returns {typeof DEFAULT_CONFIG}
 */
function loadConfig(overrides = {}) {
  const envConfig = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    host: process.env.HOST,
    logLevel: process.env.LOG_LEVEL,
    maxRetries: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES, 10) : undefined,
    timeoutMs: process.env.TIMEOUT_MS ? parseInt(process.env.TIMEOUT_MS, 10) : undefined,
  };

  // Remove undefined keys before merging
  const filteredEnv = Object.fromEntries(
    Object.entries(envConfig).filter(([, v]) => v !== undefined),
  );

  loadedConfig = { ...DEFAULT_CONFIG, ...filteredEnv, ...overrides };
  return loadedConfig;
}

/**
 * Returns the value of a single environment variable.
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string}
 */
function getEnv(key, fallback = '') {
  return process.env[key] ?? fallback;
}

/**
 * Returns the current loaded config, or loads defaults if none has been loaded.
 * @returns {typeof DEFAULT_CONFIG}
 */
function getConfig() {
  if (!loadedConfig) return loadConfig();
  return loadedConfig;
}

/**
 * Resets the loaded config (useful in tests).
 */
function resetConfig() {
  loadedConfig = null;
}

module.exports = { loadConfig, getEnv, getConfig, resetConfig };
