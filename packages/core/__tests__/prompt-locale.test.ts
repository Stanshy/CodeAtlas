/**
 * AI Prompt Locale Tests
 *
 * Verifies that each prompt builder function produces locale-appropriate output:
 *   - zh-TW prompts contain Chinese characters
 *   - en prompts contain English instructions and no Chinese-only lead sentences
 *   - locale='en' default is overridden correctly
 *   - key structural elements (JSON shape hint, chainId, directoryPath) are present
 *     regardless of locale
 *
 * Sprint 21: i18n Test Coverage (T11)
 */

import { describe, it, expect } from 'vitest';
import {
  buildMethodSummaryPrompt,
  buildRoleClassificationPrompt,
  buildChainExplanationPrompt,
  buildDirectorySummaryPrompt,
  buildEndpointDescriptionPrompt,
  buildStepDetailPrompt,
} from '../src/ai/prompt-templates.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the string contains at least one CJK (Chinese) character. */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

const SAMPLE_METHODS = `
Method: getUserById
Signature: async getUserById(id: string): Promise<User>
Body: return await db.users.findOne({ id });
`.trim();

const SAMPLE_CHAIN = `
Chain: POST /api/orders
Steps:
  0. validateRequest — validates payload
  1. createOrder — inserts order to DB
`.trim();

const SAMPLE_DIR = `
Directory: src/services
Files: user.service.ts, order.service.ts
Exports: UserService, OrderService
`.trim();

const SAMPLE_ENDPOINT = `
Method: POST
Path: /api/payments
Handler: createPayment
`.trim();

// ---------------------------------------------------------------------------
// buildMethodSummaryPrompt
// ---------------------------------------------------------------------------

describe('buildMethodSummaryPrompt', () => {
  it('zh-TW prompt contains Chinese characters', () => {
    const result = buildMethodSummaryPrompt(SAMPLE_METHODS, 'zh-TW');
    expect(containsChinese(result)).toBe(true);
  });

  it('en prompt does not start with Chinese lead sentence', () => {
    const result = buildMethodSummaryPrompt(SAMPLE_METHODS, 'en');
    expect(result.trimStart()).not.toMatch(/^[\u4e00-\u9fff]/);
  });

  it('en prompt contains "code analysis expert"', () => {
    const result = buildMethodSummaryPrompt(SAMPLE_METHODS, 'en');
    expect(result.toLowerCase()).toContain('code analysis expert');
  });

  it('en prompt contains "JSON" output format instruction', () => {
    const result = buildMethodSummaryPrompt(SAMPLE_METHODS, 'en');
    expect(result).toContain('JSON');
  });

  it('en prompt embeds the provided methods context', () => {
    const result = buildMethodSummaryPrompt(SAMPLE_METHODS, 'en');
    expect(result).toContain('getUserById');
  });

  it('zh-TW is the default locale when no locale is passed', () => {
    const withDefault = buildMethodSummaryPrompt(SAMPLE_METHODS);
    const withExplicit = buildMethodSummaryPrompt(SAMPLE_METHODS, 'zh-TW');
    expect(withDefault).toBe(withExplicit);
  });

  it('en and zh-TW outputs differ', () => {
    const en = buildMethodSummaryPrompt(SAMPLE_METHODS, 'en');
    const zhTW = buildMethodSummaryPrompt(SAMPLE_METHODS, 'zh-TW');
    expect(en).not.toBe(zhTW);
  });

  it('en reply rules contain "English"', () => {
    const result = buildMethodSummaryPrompt(SAMPLE_METHODS, 'en');
    expect(result).toContain('English');
  });

  it('zh-TW reply rules contain "繁體中文"', () => {
    const result = buildMethodSummaryPrompt(SAMPLE_METHODS, 'zh-TW');
    expect(result).toContain('繁體中文');
  });
});

// ---------------------------------------------------------------------------
// buildRoleClassificationPrompt
// ---------------------------------------------------------------------------

describe('buildRoleClassificationPrompt', () => {
  it('zh-TW prompt contains Chinese characters', () => {
    const result = buildRoleClassificationPrompt(SAMPLE_METHODS, 'zh-TW');
    expect(containsChinese(result)).toBe(true);
  });

  it('en prompt contains "code analysis expert"', () => {
    const result = buildRoleClassificationPrompt(SAMPLE_METHODS, 'en');
    expect(result.toLowerCase()).toContain('code analysis expert');
  });

  it('en prompt contains role list', () => {
    const result = buildRoleClassificationPrompt(SAMPLE_METHODS, 'en');
    expect(result).toContain('entrypoint');
    expect(result).toContain('business_core');
    expect(result).toContain('utility');
  });

  it('zh-TW is the default locale when no locale is passed', () => {
    const withDefault = buildRoleClassificationPrompt(SAMPLE_METHODS);
    const withExplicit = buildRoleClassificationPrompt(SAMPLE_METHODS, 'zh-TW');
    expect(withDefault).toBe(withExplicit);
  });

  it('en prompt embeds the provided methods context', () => {
    const result = buildRoleClassificationPrompt(SAMPLE_METHODS, 'en');
    expect(result).toContain('getUserById');
  });

  it('en and zh-TW outputs differ', () => {
    const en = buildRoleClassificationPrompt(SAMPLE_METHODS, 'en');
    const zhTW = buildRoleClassificationPrompt(SAMPLE_METHODS, 'zh-TW');
    expect(en).not.toBe(zhTW);
  });
});

// ---------------------------------------------------------------------------
// buildChainExplanationPrompt
// ---------------------------------------------------------------------------

describe('buildChainExplanationPrompt', () => {
  const CHAIN_ID = 'POST /api/orders';

  it('zh-TW prompt contains Chinese characters', () => {
    const result = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID, 'zh-TW');
    expect(containsChinese(result)).toBe(true);
  });

  it('en prompt contains "code analysis expert"', () => {
    const result = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID, 'en');
    expect(result.toLowerCase()).toContain('code analysis expert');
  });

  it('chainId is embedded in both locales', () => {
    const enResult = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID, 'en');
    const zhResult = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID, 'zh-TW');
    expect(enResult).toContain(CHAIN_ID);
    expect(zhResult).toContain(CHAIN_ID);
  });

  it('zh-TW is the default locale', () => {
    const withDefault = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID);
    const withExplicit = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID, 'zh-TW');
    expect(withDefault).toBe(withExplicit);
  });

  it('en prompt embeds chain context', () => {
    const result = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID, 'en');
    expect(result).toContain('validateRequest');
  });

  it('en and zh-TW outputs differ', () => {
    const en = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID, 'en');
    const zhTW = buildChainExplanationPrompt(SAMPLE_CHAIN, CHAIN_ID, 'zh-TW');
    expect(en).not.toBe(zhTW);
  });
});

// ---------------------------------------------------------------------------
// buildDirectorySummaryPrompt
// ---------------------------------------------------------------------------

describe('buildDirectorySummaryPrompt', () => {
  const DIR_PATH = 'src/services';

  it('zh-TW prompt contains Chinese characters', () => {
    const result = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH, 'zh-TW');
    expect(containsChinese(result)).toBe(true);
  });

  it('en prompt contains "code analysis expert"', () => {
    const result = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH, 'en');
    expect(result.toLowerCase()).toContain('code analysis expert');
  });

  it('directoryPath is embedded in both locales', () => {
    const enResult = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH, 'en');
    const zhResult = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH, 'zh-TW');
    expect(enResult).toContain(DIR_PATH);
    expect(zhResult).toContain(DIR_PATH);
  });

  it('zh-TW is the default locale', () => {
    const withDefault = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH);
    const withExplicit = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH, 'zh-TW');
    expect(withDefault).toBe(withExplicit);
  });

  it('en prompt embeds directory context', () => {
    const result = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH, 'en');
    expect(result).toContain('UserService');
  });

  it('en and zh-TW outputs differ', () => {
    const en = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH, 'en');
    const zhTW = buildDirectorySummaryPrompt(SAMPLE_DIR, DIR_PATH, 'zh-TW');
    expect(en).not.toBe(zhTW);
  });
});

// ---------------------------------------------------------------------------
// buildEndpointDescriptionPrompt
// ---------------------------------------------------------------------------

describe('buildEndpointDescriptionPrompt', () => {
  const ENDPOINT_ID = 'POST:/api/payments';
  const METHOD = 'POST';
  const PATH = '/api/payments';

  it('zh-TW prompt contains Chinese characters', () => {
    const result = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'zh-TW');
    expect(containsChinese(result)).toBe(true);
  });

  it('en prompt contains "code analysis expert"', () => {
    const result = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'en');
    expect(result.toLowerCase()).toContain('code analysis expert');
  });

  it('endpointId is embedded in both locales', () => {
    const enResult = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'en');
    const zhResult = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'zh-TW');
    expect(enResult).toContain(ENDPOINT_ID);
    expect(zhResult).toContain(ENDPOINT_ID);
  });

  it('HTTP method and path are embedded in both locales', () => {
    const enResult = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'en');
    const zhResult = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'zh-TW');
    expect(enResult).toContain(METHOD);
    expect(enResult).toContain(PATH);
    expect(zhResult).toContain(METHOD);
    expect(zhResult).toContain(PATH);
  });

  it('zh-TW is the default locale', () => {
    const withDefault = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH);
    const withExplicit = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'zh-TW');
    expect(withDefault).toBe(withExplicit);
  });

  it('en and zh-TW outputs differ', () => {
    const en = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'en');
    const zhTW = buildEndpointDescriptionPrompt(SAMPLE_ENDPOINT, ENDPOINT_ID, METHOD, PATH, 'zh-TW');
    expect(en).not.toBe(zhTW);
  });
});

// ---------------------------------------------------------------------------
// buildStepDetailPrompt
// ---------------------------------------------------------------------------

describe('buildStepDetailPrompt', () => {
  const STEPS = [
    { stepIndex: 0, methodId: 'validateRequest' },
    { stepIndex: 1, methodId: 'createOrder' },
  ];

  it('zh-TW prompt contains Chinese characters', () => {
    const result = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS, 'zh-TW');
    expect(containsChinese(result)).toBe(true);
  });

  it('en prompt contains "code analysis expert"', () => {
    const result = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS, 'en');
    expect(result.toLowerCase()).toContain('code analysis expert');
  });

  it('step methodIds are embedded in both locales', () => {
    const enResult = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS, 'en');
    const zhResult = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS, 'zh-TW');
    expect(enResult).toContain('validateRequest');
    expect(enResult).toContain('createOrder');
    expect(zhResult).toContain('validateRequest');
    expect(zhResult).toContain('createOrder');
  });

  it('zh-TW is the default locale', () => {
    const withDefault = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS);
    const withExplicit = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS, 'zh-TW');
    expect(withDefault).toBe(withExplicit);
  });

  it('en prompt contains JSON array format hint', () => {
    const result = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS, 'en');
    expect(result).toContain('JSON array');
  });

  it('en and zh-TW outputs differ', () => {
    const en = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS, 'en');
    const zhTW = buildStepDetailPrompt(SAMPLE_CHAIN, STEPS, 'zh-TW');
    expect(en).not.toBe(zhTW);
  });

  it('handles empty steps array', () => {
    const result = buildStepDetailPrompt(SAMPLE_CHAIN, [], 'en');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
