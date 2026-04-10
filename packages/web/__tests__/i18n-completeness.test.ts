/**
 * i18n Translation Completeness Tests
 *
 * Ensures that en.json and zh-TW.json stay in sync:
 *   - Identical key sets (recursively flattened)
 *   - No empty string values in either locale file
 *
 * Sprint 21: i18n Test Coverage (T11)
 */

import { describe, it, expect } from 'vitest';
import enJson from '../src/locales/en.json';
import zhTWJson from '../src/locales/zh-TW.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively flatten a nested JSON object to dot-separated keys.
 * e.g. { toolbar: { searchPlaceholder: "..." } } → ["toolbar.searchPlaceholder"]
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getAllKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

/**
 * Navigate a nested object using a dot-separated key path.
 */
function getNestedValue(obj: Record<string, unknown>, dotKey: string): unknown {
  return dotKey.split('.').reduce((acc: unknown, k) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj as unknown);
}

// ---------------------------------------------------------------------------
// Key Consistency
// ---------------------------------------------------------------------------

describe('i18n translation completeness', () => {
  it('en.json and zh-TW.json have identical keys', () => {
    const enKeys = getAllKeys(enJson as Record<string, unknown>).sort();
    const zhTWKeys = getAllKeys(zhTWJson as Record<string, unknown>).sort();
    expect(enKeys).toEqual(zhTWKeys);
  });

  it('en.json has no empty string values', () => {
    const enKeys = getAllKeys(enJson as Record<string, unknown>);
    for (const key of enKeys) {
      const value = getNestedValue(enJson as Record<string, unknown>, key);
      expect(value, `en.json key "${key}" is empty`).not.toBe('');
    }
  });

  it('zh-TW.json has no empty string values', () => {
    const zhKeys = getAllKeys(zhTWJson as Record<string, unknown>);
    for (const key of zhKeys) {
      const value = getNestedValue(zhTWJson as Record<string, unknown>, key);
      expect(value, `zh-TW.json key "${key}" is empty`).not.toBe('');
    }
  });

  // ---------------------------------------------------------------------------
  // Structural sanity
  // ---------------------------------------------------------------------------

  it('en.json has at least 50 translation keys', () => {
    const enKeys = getAllKeys(enJson as Record<string, unknown>);
    expect(enKeys.length).toBeGreaterThanOrEqual(50);
  });

  it('both locale files have the same number of keys', () => {
    const enCount = getAllKeys(enJson as Record<string, unknown>).length;
    const zhCount = getAllKeys(zhTWJson as Record<string, unknown>).length;
    expect(enCount).toBe(zhCount);
  });

  // ---------------------------------------------------------------------------
  // Top-level namespace presence
  // ---------------------------------------------------------------------------

  it('en.json contains toolbar namespace', () => {
    expect(enJson).toHaveProperty('toolbar');
  });

  it('en.json contains tabBar namespace', () => {
    expect(enJson).toHaveProperty('tabBar');
  });

  it('en.json contains settings namespace', () => {
    expect(enJson).toHaveProperty('settings');
  });

  it('zh-TW.json contains toolbar namespace', () => {
    expect(zhTWJson).toHaveProperty('toolbar');
  });

  it('zh-TW.json contains tabBar namespace', () => {
    expect(zhTWJson).toHaveProperty('tabBar');
  });

  it('zh-TW.json contains settings namespace', () => {
    expect(zhTWJson).toHaveProperty('settings');
  });

  // ---------------------------------------------------------------------------
  // Key content type validation — all leaf values must be strings
  // ---------------------------------------------------------------------------

  it('all values in en.json are strings', () => {
    const enKeys = getAllKeys(enJson as Record<string, unknown>);
    for (const key of enKeys) {
      const value = getNestedValue(enJson as Record<string, unknown>, key);
      expect(typeof value, `en.json key "${key}" is not a string`).toBe('string');
    }
  });

  it('all values in zh-TW.json are strings', () => {
    const zhKeys = getAllKeys(zhTWJson as Record<string, unknown>);
    for (const key of zhKeys) {
      const value = getNestedValue(zhTWJson as Record<string, unknown>, key);
      expect(typeof value, `zh-TW.json key "${key}" is not a string`).toBe('string');
    }
  });

  // ---------------------------------------------------------------------------
  // Spot-check: critical UI keys exist and are non-trivially different
  // ---------------------------------------------------------------------------

  it('zh-TW.json toolbar.searchPlaceholder differs from en.json (is translated)', () => {
    expect(zhTWJson.toolbar.searchPlaceholder).not.toBe(enJson.toolbar.searchPlaceholder);
  });

  it('zh-TW.json settings.language differs from en.json (is translated)', () => {
    expect(zhTWJson.settings.language).not.toBe(enJson.settings.language);
  });
});
