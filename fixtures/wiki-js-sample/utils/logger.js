'use strict';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = LOG_LEVELS.info;

/**
 * Sets the minimum log level.
 * @param {'debug'|'info'|'warn'|'error'} level
 */
function setLevel(level) {
  if (!(level in LOG_LEVELS)) throw new Error(`Unknown log level: ${level}`);
  currentLevel = LOG_LEVELS[level];
}

/**
 * Formats a log entry as a string.
 * @param {string} level
 * @param {string} message
 * @param {unknown} [meta]
 * @returns {string}
 */
function formatEntry(level, message, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  return meta !== undefined ? `${base} ${JSON.stringify(meta)}` : base;
}

/**
 * Logs an informational message.
 * @param {string} message
 * @param {unknown} [meta]
 */
function log(message, meta) {
  if (currentLevel <= LOG_LEVELS.info) {
    console.log(formatEntry('info', message, meta));
  }
}

/**
 * Logs an error message.
 * @param {string} message
 * @param {unknown} [meta]
 */
function error(message, meta) {
  if (currentLevel <= LOG_LEVELS.error) {
    console.error(formatEntry('error', message, meta));
  }
}

/**
 * Logs a warning message.
 * @param {string} message
 * @param {unknown} [meta]
 */
function warn(message, meta) {
  if (currentLevel <= LOG_LEVELS.warn) {
    console.warn(formatEntry('warn', message, meta));
  }
}

/**
 * Logs a debug message.
 * @param {string} message
 * @param {unknown} [meta]
 */
function debug(message, meta) {
  if (currentLevel <= LOG_LEVELS.debug) {
    console.debug(formatEntry('debug', message, meta));
  }
}

module.exports = { log, error, warn, debug, setLevel };
