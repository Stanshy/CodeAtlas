/**
 * CodeAtlas — i18n initialization
 *
 * Language detection priority:
 *   1. localStorage('codeatlas-locale')
 *   2. navigator.language (mapped: zh-TW/zh → 'zh-TW', others → 'en')
 *   3. fallback: 'en'
 *
 * Sprint 21 — T3
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import zhTW from './zh-TW.json';

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

function detectLanguage(): string {
  // 1. localStorage override
  const stored = localStorage.getItem('codeatlas-locale');
  if (stored === 'en' || stored === 'zh-TW') {
    return stored;
  }

  // 2. navigator.language mapping
  const nav = navigator.language ?? '';
  if (nav === 'zh-TW' || nav === 'zh') {
    return 'zh-TW';
  }

  // 3. Fallback
  return 'en';
}

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en:    { translation: en },
      'zh-TW': { translation: zhTW },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
