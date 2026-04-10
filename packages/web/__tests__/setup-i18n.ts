/**
 * Vitest setup: initialize i18next for component tests.
 * Uses the real en.json so t('key') returns actual English strings
 * instead of raw keys.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../src/locales/en.json';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
  // Disable suspense for tests
  react: { useSuspense: false },
});
