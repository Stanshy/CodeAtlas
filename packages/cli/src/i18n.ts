/**
 * @codeatlas/cli — Lightweight i18n loader
 *
 * No external dependencies — loads locale JSON files from the filesystem
 * at runtime using readFileSync + JSON.parse.
 *
 * Priority chain for locale resolution:
 *   --lang flag > .codeatlas.json locale field > CODEATLAS_LANG env > 'en'
 *
 * Sprint 21: CLI message i18n (T10)
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Locale } from '@codeatlas/core';

// ---------------------------------------------------------------------------
// Locale file loading
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadLocaleFile(locale: string): Record<string, string> {
  const filePath = path.join(__dirname, 'locales', `${locale}.json`);
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

// Lazy-loaded locale message maps — loaded once on first use.
let _messages: Record<Locale, Record<string, string>> | undefined;

function getMessages(): Record<Locale, Record<string, string>> {
  if (_messages === undefined) {
    _messages = {
      'en': loadLocaleFile('en'),
      'zh-TW': loadLocaleFile('zh-TW'),
    };
  }
  return _messages;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let currentLocale: Locale = 'en';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set the active locale for all subsequent `t()` calls.
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Look up a translation key in the current locale.
 * Falls back to the English string, then the raw key if not found.
 */
export function t(key: string): string {
  const messages = getMessages();
  return messages[currentLocale]?.[key] ?? messages['en'][key] ?? key;
}

/**
 * Resolve a locale from the provided options object.
 *
 * Priority: --lang flag > CODEATLAS_LANG env > 'en'
 *
 * Note: .codeatlas.json locale is handled by the individual commands that
 * have access to the project path (see resolveLocaleForWiki in wiki.ts).
 */
export function resolveLocale(options: { lang?: string }): Locale {
  if (options.lang === 'zh-TW' || options.lang === 'en') return options.lang;
  const envLang = process.env.CODEATLAS_LANG;
  if (envLang === 'zh-TW' || envLang === 'en') return envLang;
  return 'en';
}
