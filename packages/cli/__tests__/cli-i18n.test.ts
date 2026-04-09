/**
 * CLI i18n loader unit tests
 *
 * Tests for packages/cli/src/i18n.ts:
 *   - setLocale() + t() returns the correct language string
 *   - t() falls back to English when key is missing in zh-TW
 *   - t() falls back to the raw key when the key is missing in both locales
 *   - resolveLocale() priority chain:
 *       options.lang > CODEATLAS_LANG env > 'en'
 *   - resolveLocale() ignores unknown locale values
 *
 * Sprint 21: i18n Test Coverage (T11)
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { setLocale, t, resolveLocale } from '../src/i18n.js';

// ---------------------------------------------------------------------------
// Reset locale state between tests to prevent cross-test contamination.
// The module stores currentLocale at module level.
// ---------------------------------------------------------------------------

afterEach(() => {
  setLocale('en');
});

// ---------------------------------------------------------------------------
// setLocale + t
// ---------------------------------------------------------------------------

describe('t() — English locale', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('returns the English translation for a known key', () => {
    const result = t('cli.analyze.scanning');
    expect(result).toBe('Scanning:');
  });

  it('returns the English translation for cli.wiki.complete', () => {
    const result = t('cli.wiki.complete');
    expect(result).toBe('Wiki export complete.');
  });

  it('returns the English translation for cli.web.pressCtrlC', () => {
    const result = t('cli.web.pressCtrlC');
    expect(result).toBe('Press Ctrl+C to stop.');
  });

  it('returns the raw key for an unknown key (fallback)', () => {
    const result = t('cli.nonexistent.key');
    expect(result).toBe('cli.nonexistent.key');
  });
});

describe('t() — Traditional Chinese locale', () => {
  beforeEach(() => {
    setLocale('zh-TW');
  });

  it('returns the zh-TW translation for cli.analyze.scanning', () => {
    const result = t('cli.analyze.scanning');
    expect(result).toBe('掃描中：');
  });

  it('returns the zh-TW translation for cli.wiki.complete', () => {
    const result = t('cli.wiki.complete');
    expect(result).toBe('Wiki 輸出完成。');
  });

  it('returns the zh-TW translation for cli.web.pressCtrlC', () => {
    const result = t('cli.web.pressCtrlC');
    expect(result).toBe('按 Ctrl+C 停止。');
  });

  it('zh-TW translation for cli.analyze.scanning contains Chinese characters', () => {
    const result = t('cli.analyze.scanning');
    expect(/[\u4e00-\u9fff]/.test(result)).toBe(true);
  });

  it('zh-TW and en translations differ for cli.analyze.filesFound', () => {
    const zhResult = t('cli.analyze.filesFound');
    setLocale('en');
    const enResult = t('cli.analyze.filesFound');
    expect(zhResult).not.toBe(enResult);
  });

  it('falls back to the raw key for an unknown key', () => {
    const result = t('cli.nonexistent.key');
    expect(result).toBe('cli.nonexistent.key');
  });
});

describe('t() — locale switching at runtime', () => {
  it('switches output language when setLocale is called mid-test', () => {
    setLocale('en');
    const enResult = t('cli.analyze.scanning');

    setLocale('zh-TW');
    const zhResult = t('cli.analyze.scanning');

    expect(enResult).toBe('Scanning:');
    expect(zhResult).toBe('掃描中：');
    expect(enResult).not.toBe(zhResult);
  });
});

// ---------------------------------------------------------------------------
// resolveLocale
// ---------------------------------------------------------------------------

describe('resolveLocale() — priority chain', () => {
  const originalEnv = process.env.CODEATLAS_LANG;

  afterEach(() => {
    // Restore env var
    if (originalEnv === undefined) {
      delete process.env.CODEATLAS_LANG;
    } else {
      process.env.CODEATLAS_LANG = originalEnv;
    }
  });

  it('returns "en" when options is empty and no env var is set', () => {
    delete process.env.CODEATLAS_LANG;
    expect(resolveLocale({})).toBe('en');
  });

  it('returns "en" when lang option is "en"', () => {
    delete process.env.CODEATLAS_LANG;
    expect(resolveLocale({ lang: 'en' })).toBe('en');
  });

  it('returns "zh-TW" when lang option is "zh-TW"', () => {
    delete process.env.CODEATLAS_LANG;
    expect(resolveLocale({ lang: 'zh-TW' })).toBe('zh-TW');
  });

  it('lang option takes priority over CODEATLAS_LANG env var', () => {
    process.env.CODEATLAS_LANG = 'zh-TW';
    expect(resolveLocale({ lang: 'en' })).toBe('en');
  });

  it('falls back to CODEATLAS_LANG env var when no lang option', () => {
    process.env.CODEATLAS_LANG = 'zh-TW';
    expect(resolveLocale({})).toBe('zh-TW');
  });

  it('falls back to CODEATLAS_LANG="en" when set', () => {
    process.env.CODEATLAS_LANG = 'en';
    expect(resolveLocale({})).toBe('en');
  });

  it('ignores unknown lang option value and falls back to env var', () => {
    process.env.CODEATLAS_LANG = 'zh-TW';
    // 'fr' is not a valid Locale
    expect(resolveLocale({ lang: 'fr' })).toBe('zh-TW');
  });

  it('ignores unknown lang option value and falls back to "en" when no env var', () => {
    delete process.env.CODEATLAS_LANG;
    expect(resolveLocale({ lang: 'ja' })).toBe('en');
  });

  it('ignores unknown CODEATLAS_LANG env value and returns "en"', () => {
    process.env.CODEATLAS_LANG = 'de';
    expect(resolveLocale({})).toBe('en');
  });

  it('undefined lang option falls through to env var', () => {
    process.env.CODEATLAS_LANG = 'zh-TW';
    expect(resolveLocale({ lang: undefined })).toBe('zh-TW');
  });
});
